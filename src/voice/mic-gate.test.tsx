import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isWakeWordSupported } from "@voxide/react";
import { MicGate } from "@/voice/mic-gate";
import { getMicPermission, micPermissionStore } from "@/voice/mic-permission";

vi.mock(import("@voxide/react"), async (importOriginal) => ({
  ...(await importOriginal()),
  isWakeWordSupported: vi.fn(() => true),
}));

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

function giveMicrophone(getUserMedia: () => Promise<unknown>) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
}

const noopResolve: (value: unknown) => void = () => {};

const granting = () => Promise.resolve({ getTracks: () => [{ stop: () => {} }] });

function renderGate() {
  return render(
    <MicGate>
      <p>the mic</p>
    </MicGate>,
  );
}

/** The effect reads the browser, so every case settles before it is asserted. */
async function settled(permission: string) {
  await vi.waitFor(() => expect(getMicPermission()).toBe(permission));
}

beforeEach(() => {
  micPermissionStore.setState({ permission: "unknown" });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "permissions");
  Reflect.deleteProperty(navigator, "mediaDevices");
});

describe("MicGate", () => {
  it("gets out of the way once the microphone is ours", async () => {
    giveMicrophone(granting);
    givePermissionsApi(fakeStatus("granted"));

    renderGate();
    await settled("granted");

    expect(screen.getByText("the mic")).toBeInTheDocument();
    expect(screen.queryByText("Bloxide needs to hear you")).not.toBeInTheDocument();
  });

  it("explains the browser prompt before it appears, and asks on a press", async () => {
    const getUserMedia = vi.fn(granting);
    giveMicrophone(getUserMedia);
    givePermissionsApi(fakeStatus("prompt"));

    renderGate();
    await settled("ask");

    expect(screen.getByText("Bloxide needs to hear you")).toBeInTheDocument();
    expect(screen.queryByText("the mic")).not.toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();

    await act(async () => screen.getByRole("button", { name: "Turn on my microphone" }).click());

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(screen.getByText("the mic")).toBeInTheDocument();
  });

  it("promises press-to-talk where the wake word cannot work", async () => {
    vi.mocked(isWakeWordSupported).mockReturnValue(false);
    giveMicrophone(granting);
    givePermissionsApi(fakeStatus("prompt"));

    renderGate();
    await settled("ask");

    expect(
      screen.getByText(
        "Press the big button, then choose Allow. After that, press the mic to talk.",
      ),
    ).toBeInTheDocument();
  });

  it("sends a blocked microphone to the browser's own setting, not to another prompt", async () => {
    const getUserMedia = vi.fn(granting);
    giveMicrophone(getUserMedia);
    const status = fakeStatus("denied");
    givePermissionsApi(status);

    renderGate();
    await settled("denied");

    expect(screen.getByText("My microphone is blocked")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ask a grown-up to press the icon next to the web address, find Microphone and choose Allow. Then press the big button.",
      ),
    ).toBeInTheDocument();

    status.state = "granted";
    await act(async () => screen.getByRole("button", { name: "I fixed it" }).click());

    // A denied permission never prompts again; the button only looks afresh.
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByText("the mic")).toBeInTheDocument();
  });

  it("tells a missing microphone apart from a blocked one", async () => {
    giveMicrophone(granting);
    givePermissionsApi(null);
    micPermissionStore.setState({ permission: "no-mic" });

    renderGate();
    await settled("no-mic");

    expect(screen.getByText("I cannot find a microphone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("offers no button in a browser that can never hear, and names one that can", async () => {
    renderGate();
    await settled("unsupported");

    expect(screen.getByText("This browser cannot hear you")).toBeInTheDocument();
    expect(
      screen.getByText("Ask a grown-up to open Bloxide in Chrome or Edge."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("takes the mic back when the permission is revoked while the page is open", async () => {
    giveMicrophone(granting);
    const status = fakeStatus("granted");
    givePermissionsApi(status);

    renderGate();
    await settled("granted");

    act(() => status.change("denied"));

    expect(screen.queryByText("the mic")).not.toBeInTheDocument();
    expect(screen.getByText("My microphone is blocked")).toBeInTheDocument();
  });

  it("stops watching on unmount, and survives a request still in flight", async () => {
    let allow = noopResolve;
    giveMicrophone(() => new Promise((resolve) => (allow = resolve)));
    const status = fakeStatus("prompt");
    givePermissionsApi(status);

    const { unmount } = renderGate();
    await settled("ask");

    screen.getByRole("button", { name: "Turn on my microphone" }).click();
    unmount();

    await act(async () => allow({ getTracks: () => [{ stop: () => {} }] }));

    expect(getMicPermission()).toBe("granted");
    expect(status.listenerCount).toBe(0);
  });
});
