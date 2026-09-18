import { lazy, Suspense } from "react";

// Blockly is ~900 kB. Loading it as its own chunk lets the shell paint first.
const BlocklyWorkspace = lazy(() => import("./blockly/BlocklyWorkspace"));

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
