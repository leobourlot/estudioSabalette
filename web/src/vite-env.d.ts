/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, sin barra final y sin /api. Vacía en desarrollo. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
