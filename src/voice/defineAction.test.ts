import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { type ArgsOf, defineAction } from "@/voice/defineAction";

const SCHEMA = {
  to: { type: "string", required: true },
  type: { type: "string" },
} as const;

/** The handler's arguments come from the schema, not from a cast. */
describe("ArgsOf", () => {
  it("makes required params present and the rest optional", () => {
    expectTypeOf<ArgsOf<typeof SCHEMA>>().toMatchObjectType<{ to: string; type?: string }>();
    expectTypeOf<ArgsOf<typeof SCHEMA>>().toHaveProperty("to").toEqualTypeOf<string>();
  });
});

describe("defineAction", () => {
  function action(handler: (args: ArgsOf<typeof SCHEMA>) => string) {
    return defineAction({ description: "test", params: SCHEMA, handler });
  }

  it("passes parsed arguments through", async () => {
    const handler = vi.fn(() => "done");

    const spoken = await action(handler).handler?.({ to: "repeat", type: "print" });

    expect(handler).toHaveBeenCalledWith({ to: "repeat", type: "print" });
    expect(spoken).toBe("done");
  });

  it("asks for a missing required param instead of running", async () => {
    const handler = vi.fn(() => "done");

    const spoken = await action(handler).handler?.({});

    expect(spoken).toBe("I need to know the to.");
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects a param that is not a string", async () => {
    const handler = vi.fn(() => "done");

    const spoken = await action(handler).handler?.({ to: 7 });

    expect(spoken).toBe("The to has to be a word, not number.");
    expect(handler).not.toHaveBeenCalled();
  });

  it("drops keys the schema does not declare", async () => {
    const handler = vi.fn(() => "done");

    await action(handler).handler?.({ to: "repeat", colour: "red" });

    expect(handler).toHaveBeenCalledWith({ to: "repeat" });
  });

  it("treats an empty optional param as absent", async () => {
    const handler = vi.fn(() => "done");

    await action(handler).handler?.({ to: "repeat", type: "" });

    expect(handler).toHaveBeenCalledWith({ to: "repeat" });
  });
});
