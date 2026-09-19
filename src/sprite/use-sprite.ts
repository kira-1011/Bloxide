import { useStore } from "zustand";
import type { SpriteState } from "@/sprite/sprite-state";
import { spriteStore } from "@/sprite/sprite-store";

/** The whole sprite, so nothing outside the sprite module holds the store. */
export function useSprite(): SpriteState {
  return useStore(spriteStore);
}
