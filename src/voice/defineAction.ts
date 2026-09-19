import type { VoxideActionConfig, VoxideParamRule } from "@voxide/react";

type TypedParam = VoxideParamRule & { type: "string" | "number" };

export type ParamSchema = Record<string, TypedParam>;

type RequiredKeys<P extends ParamSchema> = {
  [K in keyof P]: P[K]["required"] extends true ? K : never;
}[keyof P];

type ValueOf<R extends TypedParam> = R["type"] extends "number" ? number : string;

/**
 * The argument type a schema implies: required params present, the rest
 * optional, each typed by its declared param type. Declaring the schema is
 * therefore enough to type the handler.
 */
export type ArgsOf<P extends ParamSchema> = { [K in RequiredKeys<P>]: ValueOf<P[K]> } & {
  [K in Exclude<keyof P, RequiredKeys<P>>]?: ValueOf<P[K]>;
};

interface ActionDefinition<P extends ParamSchema> {
  readonly description: string;
  readonly params?: P;
  /** Returns what the agent should say back. */
  readonly handler: (args: ArgsOf<P>) => string | Promise<string>;
}

function parseArgs<P extends ParamSchema>(
  params: P | undefined,
  raw: Record<string, unknown>,
): { ok: true; args: ArgsOf<P> } | { ok: false; reason: string } {
  const parsed: Record<string, string | number> = {};

  for (const [name, rule] of Object.entries(params ?? {})) {
    const value = raw[name];

    if (value === undefined || value === null || value === "") {
      if (rule.required) return { ok: false, reason: `I need to know the ${name}.` };
      continue;
    }

    if (rule.type === "number") {
      // A model sends "3" as readily as 3. Nothing else converts: String([3])
      // is "3", and an array would silently become a block reference.
      if (typeof value !== "number" && typeof value !== "string") {
        return { ok: false, reason: `The ${name} has to be a number.` };
      }
      const asNumber = typeof value === "number" ? value : Number(value.trim());
      if (!Number.isFinite(asNumber)) {
        return { ok: false, reason: `The ${name} has to be a number.` };
      }
      parsed[name] = asNumber;
      continue;
    }

    if (typeof value !== "string") {
      return { ok: false, reason: `The ${name} has to be a word, not ${typeof value}.` };
    }
    parsed[name] = value;
  }

  // The one cast, and the reason this function exists: the checks above are
  // what make it true, and no compiler can see that through a built record.
  return { ok: true, args: parsed as ArgsOf<P> };
}

/**
 * Wraps a handler so its arguments are parsed before it runs.
 *
 * A model can send anything, so the arguments are unknown until checked — the
 * point of the schema is that checking them once here types every handler.
 * `const P` keeps `required: true` a literal, which is what makes ArgsOf work.
 */
export function defineAction<const P extends ParamSchema>({
  description,
  params,
  handler,
}: ActionDefinition<P>): VoxideActionConfig {
  return {
    description,
    ...(params ? { params } : {}),
    handler: async (raw: Record<string, unknown>) => {
      const result = parseArgs(params, raw);
      return result.ok ? handler(result.args) : result.reason;
    },
  };
}
