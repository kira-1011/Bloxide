import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  askForMic,
  checkMicPermission,
  getMicPermission,
  micPermissionStore,
  retryMic,
  watchMicPermission,
} from "@/voice/mic-permission";

function fakeStatus(state: string) {
  const listeners = new Set<() => void>();
  return {
    state,
    addEventListener: (_type: string, listener: () => void) => void listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => void listeners.delete(listener),
    change(next: string) {
      this.state = next;
      listeners.forEach((listener) => listener());
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function givePermissionsApi(status: ReturnType<typeof fakeStatus> | null) {
  Object.defineProperty(navigator, "permissions", {
    value: status ? { query: () => Promise.resolve(status) } : undefined,
    configurable: true,
  });
}

const stop = vi.fn();
const noopResolve: (value: unknown) => void = () => {};

function giveMicrophone(getUserMedia: () => Promise<unknown>) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
}

const grantingMic = () => Promise.resolve({ getTracks: () => [{ stop }] });

function refusingMic(name: string) {
  return () => Promise.reject(Object.assign(new Error(name), { name }));
}

beforeEach(() => {
  micPermissionStore.setState({ permission: "unknown" });
  stop.mockClear();
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "permissions");
  Reflect.deleteProperty(navigator, "mediaDevices");
});

describe("checkMicPermission", () => {
  it("reports a permission already granted, without prompting", async () => {
    const getUserMedia = vi.fn(grantingMic);
    giveMicrophone(getUserMedia);
    givePermissionsApi(fakeStatus("granted"));

    await expect(checkMicPermission()).resolves.toBe("granted");
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("reports a browser with no microphone support as unsupported", async () => {
    givePermissionsApi(fakeStatus("granted"));

    await expect(checkMicPermission()).resolves.toBe("unsupported");
  });

  it("falls back to asking where the browser has no Permissions API", async () => {
    giveMicrophone(grantingMic);
    givePermissionsApi(null);

    await expect(checkMicPermission()).resolves.toBe("ask");
  });

  it("keeps a known failure when the Permissions API cannot confirm it", async () => {
    giveMicrophone(grantingMic);
    givePermissionsApi(null);
    micPermissionStore.setState({ permission: "no-mic" });

    await expect(checkMicPermission()).resolves.toBe("no-mic");
  });
});

describe("askForMic", () => {
  it("grants, and lets go of the microphone it was given", async () => {
    giveMicrophone(grantingMic);

    await expect(askForMic()).resolves.toBe("granted");
    expect(stop).toHaveBeenCalledOnce();
  });

  it("says it is asking while the browser prompt is up", async () => {
    let allow = noopResolve;
    giveMicrophone(() => new Promise((resolve) => (allow = resolve)));

    const asked = askForMic();
    await Promise.resolve();
    expect(getMicPermission()).toBe("asking");

    allow({ getTracks: () => [{ stop }] });
    await expect(asked).resolves.toBe("granted");
  });

  it("treats a dismissed prompt as still askable", async () => {
    giveMicrophone(refusingMic("NotAllowedError"));
    givePermissionsApi(fakeStatus("prompt"));

    await expect(askForMic()).resolves.toBe("ask");
  });

  it("treats a refused prompt as denied", async () => {
    giveMicrophone(refusingMic("NotAllowedError"));
    givePermissionsApi(fakeStatus("denied"));

    await expect(askForMic()).resolves.toBe("denied");
  });

  it("assumes denied where a refusal cannot be checked against a Permissions API", async () => {
    giveMicrophone(refusingMic("NotAllowedError"));
    givePermissionsApi(null);

    await expect(askForMic()).resolves.toBe("denied");
  });

  it("separates a missing microphone from a blocked one", async () => {
    giveMicrophone(refusingMic("NotFoundError"));

    await expect(askForMic()).resolves.toBe("no-mic");
  });

  it("tells a microphone another app is holding apart from a missing one", async () => {
    giveMicrophone(refusingMic("NotReadableError"));

    await expect(askForMic()).resolves.toBe("mic-busy");
  });

  it("does not throw where the browser has no getUserMedia", async () => {
    await expect(askForMic()).resolves.toBe("unsupported");
  });
});

describe("retryMic", () => {
  it("only looks again where a blocked permission can be read back", async () => {
    const getUserMedia = vi.fn(grantingMic);
    giveMicrophone(getUserMedia);
    givePermissionsApi(fakeStatus("granted"));
    micPermissionStore.setState({ permission: "denied" });

    // Chrome will not prompt twice; the browser's own setting is the way back.
    await expect(retryMic()).resolves.toBe("granted");
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("asks again where no Permissions API can ever report a change", async () => {
    const getUserMedia = vi.fn(grantingMic);
    giveMicrophone(getUserMedia);
    givePermissionsApi(null);
    micPermissionStore.setState({ permission: "denied" });

    // Firefox and Safari publish nothing to watch, and do prompt again, so a
    // dismissal must not lock the child out for the rest of the session.
    await expect(retryMic()).resolves.toBe("granted");
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it("asks from every other state", async () => {
    const getUserMedia = vi.fn(grantingMic);
    giveMicrophone(getUserMedia);
    givePermissionsApi(fakeStatus("prompt"));
    micPermissionStore.setState({ permission: "ask" });

    await expect(retryMic()).resolves.toBe("granted");
    expect(getUserMedia).toHaveBeenCalledOnce();
  });
});

describe("watchMicPermission", () => {
  it("follows a permission revoked while the page is open", async () => {
    giveMicrophone(grantingMic);
    const status = fakeStatus("granted");
    givePermissionsApi(status);

    const unwatch = watchMicPermission();
    await vi.waitFor(() => expect(status.listenerCount).toBe(1));
    expect(getMicPermission()).toBe("granted");

    status.change("denied");
    expect(getMicPermission()).toBe("denied");

    unwatch();
    expect(status.listenerCount).toBe(0);
  });

  it("attaches nothing when stopped before the first read finishes", async () => {
    giveMicrophone(grantingMic);
    const status = fakeStatus("granted");
    givePermissionsApi(status);

    watchMicPermission()();
    await vi.waitFor(() => expect(getMicPermission()).toBe("granted"));

    expect(status.listenerCount).toBe(0);
  });

  it("survives a browser with no Permissions API", async () => {
    giveMicrophone(grantingMic);
    givePermissionsApi(null);

    const unwatch = watchMicPermission();
    await vi.waitFor(() => expect(getMicPermission()).toBe("ask"));

    expect(unwatch).not.toThrow();
  });
});
