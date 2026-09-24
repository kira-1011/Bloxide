import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { VoxideClient } from "@voxide/react";

const noop = () => {};

/** Lets every pending microtask run, however deep the chain under test is. */
const drain = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeStatus(state: string) {
  return {
    state,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

function givePermissionsApi(state: string) {
  Object.defineProperty(navigator, "permissions", {
    value: { query: () => Promise.resolve(fakeStatus(state)) },
    configurable: true,
  });
}

function giveMicrophone() {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) },
    configurable: true,
  });
}

interface Loaded {
  readonly client: VoxideClient;
  readonly arm: () => void;
  readonly disarm: () => void;
  /** Lets init finish, and drains the permission read that follows it. */
  readonly finishInit: () => Promise<void>;
  readonly armed: () => number;
  readonly disarmed: () => number;
}

/**
 * A fresh copy of the module per test, so the memoised init and the arm
 * generation start clean. The SDK is left real and only its three wake-word
 * methods are stood in for — init returns a promise this test decides when to
 * settle, which is the whole point: the races only exist while it is pending.
 */
async function loadClient(): Promise<Loaded> {
  vi.stubEnv("VITE_VOXIDE_PUBLIC_KEY", "vox_pub_test");
  vi.resetModules();
  const module = await import("@/voice/client");
  const client = module.voice;
  if (!client) throw new Error("a stubbed key should have built a client");

  let settle = noop;
  vi.spyOn(client, "init").mockReturnValue(
    new Promise((resolve) => {
      settle = () => resolve(client);
    }),
  );
  const armSpy = vi.spyOn(client, "armWakeWord").mockImplementation(() => {});
  const disarmSpy = vi.spyOn(client, "disarmWakeWord").mockImplementation(() => {});
  vi.spyOn(client, "isWakeWordAvailable").mockReturnValue(true);

  return {
    client,
    arm: module.armWakeWord,
    disarm: module.disarmWakeWord,
    finishInit: async () => {
      settle();
      // init, then the permission read, then the arm decision. Drained past a
      // macrotask rather than counted in turns, so the assertions cannot pass
      // by being lucky about how deep the chain happens to be.
      await drain();
      await drain();
    },
    armed: () => armSpy.mock.calls.length,
    disarmed: () => disarmSpy.mock.calls.length,
  };
}

// The client drags in the blocks and the generators behind it. Paid for once,
// here, so the first test is not timed against a cold transform.
beforeAll(async () => {
  await import("@/voice/client");
}, 30_000);

beforeEach(() => {
  giveMicrophone();
  givePermissionsApi("granted");
});

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, "permissions");
  Reflect.deleteProperty(navigator, "mediaDevices");
});

describe("armWakeWord", () => {
  it("arms once the permission is confirmed after init", async () => {
    const voice = await loadClient();

    voice.arm();
    await voice.finishInit();

    expect(voice.armed()).toBe(1);
  });

  it("does not arm when a disarm lands while init is still pending", async () => {
    const voice = await loadClient();

    voice.arm();
    voice.disarm();
    await voice.finishInit();

    expect(voice.armed()).toBe(0);
    expect(voice.disarmed()).toBe(1);
  });

  it("does not arm when the microphone is revoked while init is still pending", async () => {
    const voice = await loadClient();

    voice.arm();
    givePermissionsApi("denied");
    await voice.finishInit();

    expect(voice.armed()).toBe(0);
  });

  it("does not arm on a grant the browser no longer agrees with", async () => {
    // What a remount looks like: the store still holds the last known grant,
    // but the permission was taken away while nothing was watching.
    const voice = await loadClient();
    voice.arm();
    await voice.finishInit();
    expect(voice.armed()).toBe(1);

    givePermissionsApi("prompt");
    voice.arm();
    await voice.finishInit();

    expect(voice.armed()).toBe(1);
  });

  it("keeps only the newest arm when two overlap", async () => {
    const voice = await loadClient();

    voice.arm();
    voice.arm();
    await voice.finishInit();

    expect(voice.armed()).toBe(1);
  });

  it("does not arm from startVoice alone", async () => {
    const voice = await loadClient();

    const { startVoice } = await import("@/voice/client");
    void startVoice();
    await voice.finishInit();

    expect(voice.armed()).toBe(0);
  });
});
