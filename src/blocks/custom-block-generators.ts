import { javascriptGenerator, Order } from "blockly/javascript";
import "@/blocks/custom-blocks";

// What each block runs. The generated code talks to `__sprite`, the one name
// the runner injects for the sprite API, so a new block never widens the
// runner's function signature.

type Generator = (typeof javascriptGenerator)["forBlock"][string];

const DEFAULT_NUMBER = "0";
const DEFAULT_TEXT = '""';

function command(name: string, args: readonly string[]): string {
  return `await __sprite.${name}(${args.join(", ")});\n`;
}

/** One `await __sprite.<name>(<inputs>)` statement, inputs read in order. */
function call(name: string, inputs: readonly { name: string; fallback: string }[]): Generator {
  return (block, generator) =>
    command(
      name,
      inputs.map((input) => generator.valueToCode(block, input.name, Order.NONE) || input.fallback),
    );
}

const number = (name: string) => ({ name, fallback: DEFAULT_NUMBER });
const text = (name: string) => ({ name, fallback: DEFAULT_TEXT });

javascriptGenerator.forBlock["bloxide_move"] = call("move", [number("STEPS")]);

javascriptGenerator.forBlock["bloxide_turn_right"] = call("turn", [number("DEGREES")]);

// The API turns clockwise on a positive angle, so left is the same call negated.
javascriptGenerator.forBlock["bloxide_turn_left"] = (block, generator) => {
  const degrees = generator.valueToCode(block, "DEGREES", Order.NONE) || DEFAULT_NUMBER;
  return command("turn", [`-(${degrees})`]);
};

javascriptGenerator.forBlock["bloxide_go_to"] = call("goTo", [number("X"), number("Y")]);

javascriptGenerator.forBlock["bloxide_say_for"] = call("sayFor", [text("TEXT"), number("SECONDS")]);

javascriptGenerator.forBlock["bloxide_say"] = call("say", [text("TEXT")]);

javascriptGenerator.forBlock["bloxide_change_size"] = call("changeSize", [number("CHANGE")]);

javascriptGenerator.forBlock["bloxide_hide"] = () => command("setVisible", ["false"]);

javascriptGenerator.forBlock["bloxide_show"] = () => command("setVisible", ["true"]);

javascriptGenerator.forBlock["bloxide_wait"] = call("wait", [number("SECONDS")]);

javascriptGenerator.forBlock["bloxide_forever"] = (block, generator) => {
  // Without the loop trap this is `while (true)` with no yield: the tab locks
  // up and Stop can never be heard. Nothing else in the block set can hang the
  // browser, so this line is load-bearing.
  const branch = generator.addLoopTrap(generator.statementToCode(block, "DO"), block);
  return `while (true) {\n${branch}}\n`;
};
