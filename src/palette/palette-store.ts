import { createStore } from "zustand/vanilla";

interface PaletteState {
  readonly open: boolean;
}

/** Shared with voice, which reaches it from module scope. */
export const paletteStore = createStore<PaletteState>()(() => ({ open: true }));

export const isPaletteOpen = (): boolean => paletteStore.getState().open;

export function setPaletteOpen(open: boolean): void {
  paletteStore.setState({ open });
}
