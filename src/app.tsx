import { lazy, Suspense } from "react";

// Heavy, and not needed for the first paint.
const BlocklyWorkspace = lazy(() => import("@/blockly/blockly-workspace"));

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
    </main>
  );
}
