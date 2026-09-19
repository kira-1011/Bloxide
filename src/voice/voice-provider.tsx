import { VoxideWidget } from "@voxide/react";
import { voice } from "@/voice/client";

/**
 * Mounted once at the root so a call survives navigation. Wake word is Chrome
 * and Edge only and is configured in the dashboard, not here.
 */
export function VoiceProvider() {
  if (!voice) return null;

  // No appearance props: position, title and the rest are the dashboard's,
  // and passing them here overrides the Appearance tab.
  return <VoxideWidget client={voice} />;
}
