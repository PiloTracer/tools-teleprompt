/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PUBLIC_ORIGIN?: string;
  readonly VITE_PUBLIC_HOST?: string;
  readonly VITE_PUBLIC_PORT?: string;
  readonly VITE_PUBLIC_PROTOCOL?: string;
  readonly VITE_DEV_HMR_HOST?: string;
  readonly VITE_DEV_HMR_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
