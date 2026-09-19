import { lazy, Suspense } from "react";

// Both are heavy and neither is needed for the first paint.
const BlocklyWorkspace = lazy(() => import("@/blockly/blockly-workspace"));
const VoiceProvider = lazy(() =>
  import("@/voice/voice-provider").then((m) => ({ default: m.VoiceProvider })),
);

const WORKSPACE_FALLBACK = (
  <div className="flex h-full w-full items-center justify-center text-slate-500">
    Loading blocks…
  </div>
);

export default function App() {
  return (
    <main className="h-full w-full">
      <Suspense fallback={WORKSPACE_FALLBACK}>
        <BlocklyWorkspace />
      </Suspense>
      <Suspense fallback={null}>
        <VoiceProvider />
      </Suspense>
    </main>
  );
}
