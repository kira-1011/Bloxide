import type { VoxideActionConfig, VoxideParamRule } from "@voxide/react";

/** Every capability so far takes strings; widen the day one does not. */
type StringParam = VoxideParamRule & { type: "string" };

export type ParamSchema = Record<string, StringParam>;

type RequiredKeys<P extends ParamSchema> = {
  [K in keyof P]: P[K]["required"] extends true ? K : never;
}[keyof P];

/**
 * The argument type a schema implies: required params present, the rest
 * optional. Declaring the schema is therefore enough to type the handler.
 */
export type ArgsOf<P extends ParamSchema> = { [K in RequiredKeys<P>]: string } & {
  [K in Exclude<keyof P, RequiredKeys<P>>]?: string;
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
  const parsed: Record<string, string> = {};

  for (const [name, rule] of Object.entries(params ?? {})) {
    const value = raw[name];

    if (value === undefined || value === null || value === "") {
      if (rule.required) return { ok: false, reason: `I need to know the ${name}.` };
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
