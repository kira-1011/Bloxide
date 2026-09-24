import { createStore } from "zustand/vanilla";

/**
 * What the child is told about the microphone. Speech is the only input our
 * user has, so each of these needs its own sentence and its own way forward.
 */
export type MicPermission =
  | "unknown"
  | "ask"
  | "asking"
  | "granted"
  | "denied"
  | "no-mic"
  | "unsupported";

interface MicPermissionState {
  readonly permission: MicPermission;
}

/**
 * A store rather than component state: the browser's `change` event and a
 * pending `getUserMedia` both land outside React, and neither may depend on a
 * component still being mounted.
 */
export const micPermissionStore = createStore<MicPermissionState>()(() => ({
  permission: "unknown",
}));

export const getMicPermission = (): MicPermission => micPermissionStore.getState().permission;

function setPermission(permission: MicPermission): void {
  micPermissionStore.setState({ permission });
}

// lib.dom's PermissionName union predates the microphone permission, so the
// descriptor cannot be spelled without a cast.
const MICROPHONE_DESCRIPTOR = { name: "microphone" } as unknown as PermissionDescriptor;

/** `state` is a string off the platform, so it is parsed, not trusted. */
function fromPermissionState(state: string): MicPermission | null {
  if (state === "granted") return "granted";
  if (state === "denied") return "denied";
  if (state === "prompt") return "ask";
  return null;
}

function audioInput(): MediaDevices | null {
  const devices: MediaDevices | undefined = navigator.mediaDevices;
  return typeof devices?.getUserMedia === "function" ? devices : null;
}

/** Null where the browser has no Permissions API, or none for microphones. */
async function queryStatus(): Promise<PermissionStatus | null> {
  const permissions: Permissions | undefined = navigator.permissions;
  if (typeof permissions?.query !== "function") return null;
  try {
    return await permissions.query(MICROPHONE_DESCRIPTOR);
  } catch {
    return null;
  }
}

async function queryPermission(): Promise<MicPermission | null> {
  const status = await queryStatus();
  return status ? fromPermissionState(status.state) : null;
}

function nameOf(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

async function failureFrom(error: unknown): Promise<MicPermission> {
  const name = nameOf(error);
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-mic";
  if (name === "NotReadableError") return "no-mic";
  if (name === "NotAllowedError") {
    // Chrome rejects the same way whether the prompt was refused or dismissed.
    // A permission still sitting at "prompt" was dismissed, and asking again
    // will put the prompt back up; a denied one will not.
    return (await queryPermission()) === "ask" ? "ask" : "denied";
  }
  return "denied";
}

/** Reads the current permission without prompting. */
export async function checkMicPermission(): Promise<MicPermission> {
  if (!audioInput()) {
    setPermission("unsupported");
    return "unsupported";
  }
  const queried = await queryPermission();
  if (queried) setPermission(queried);
  else if (getMicPermission() === "unknown") setPermission("ask");
  return getMicPermission();
}

/**
 * Asks the browser, which puts its own prompt up. Called from a press, never
 * on load, so the child is told what is about to happen first.
 */
export async function askForMic(): Promise<MicPermission> {
  const devices = audioInput();
  if (!devices) {
    setPermission("unsupported");
    return "unsupported";
  }
  setPermission("asking");
  try {
    const stream = await devices.getUserMedia({ audio: true });
    // Nothing is recorded here; the grant was the whole point.
    stream.getTracks().forEach((track) => track.stop());
    setPermission("granted");
  } catch (error) {
    setPermission(await failureFrom(error));
  }
  return getMicPermission();
}

/**
 * Checks now and follows the permission for as long as the page is open, so a
 * grown-up who unblocks the microphone in another tab does not have to reload.
 */
export function watchMicPermission(): () => void {
  let stop: (() => void) | null = null;
  let cancelled = false;

  void (async () => {
    await checkMicPermission();
    const status = await queryStatus();
    if (!status || cancelled) return;
    const onChange = () => {
      const next = fromPermissionState(status.state);
      if (next) setPermission(next);
    };
    status.addEventListener("change", onChange);
    stop = () => status.removeEventListener("change", onChange);
  })();

  return () => {
    cancelled = true;
    stop?.();
    stop = null;
  };
}
