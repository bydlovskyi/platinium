/* eslint-disable @typescript-eslint/naming-convention */
/// <reference types="vite/client" />

/* UPDATE DEPENDING ON YOUR PROJRCT NEEDS */

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ENABLE_MOCKS?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
