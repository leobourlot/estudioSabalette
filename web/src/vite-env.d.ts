/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, sin barra final y sin /api. Vacía en desarrollo. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Año en que se construyó el sitio, para la leyenda de derechos (vite.config.ts, spec 007, RF-44). */
declare const __ANIO_PUBLICACION__: number;
