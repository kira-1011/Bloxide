// No `import` statements here, or the global augmentation stops applying.
// "vite/client" types are pulled in via tsconfig compilerOptions.types.

interface ImportMetaEnv {
  /** Publishable — Vite inlines VITE_* into the bundle. Never a secret. */
  readonly VITE_VOXIDE_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
