/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PUBLIC_ORIGIN?: string;
  readonly VITE_PUBLIC_HOST?: string;
  readonly VITE_PUBLIC_PORT?: string;
  readonly VITE_PUBLIC_PROTOCOL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
