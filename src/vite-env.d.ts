/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_API_TIMEOUT?: string;
  /** URL de la tienda (para "¿Olvidaste tu contraseña?"). En dev: http://localhost:5173 */
  readonly VITE_SHOP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
