import { VoxideClient } from "@voxide/react";
import { VOICE_ACTIONS } from "@/voice/handlers";

const publicKey = import.meta.env.VITE_VOXIDE_PUBLIC_KEY;

/**
 * Module scope, so capabilities register once and a call survives re-renders.
 * Null without a key — the editor still works for a clone with no Voxide
 * account.
 */
export const voice: VoxideClient | null = publicKey
  ? new VoxideClient({ publicKey }).register(VOICE_ACTIONS)
  : null;
