import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

/**
 * Cliente HTTP del backend de Canela en Rama.
 *
 * - Todas las respuestas tienen el formato `{ statusCode, message, response }`:
 *   acá se desenvuelve `response`.
 * - Auth con SuperTokens en **modo header**: el access token va como
 *   `Authorization: Bearer …`. El token se renueva antes de vencer y, si igual
 *   llega un 401, se renueva y se reintenta una vez. Las renovaciones se
 *   serializan entre requests y entre pestañas (el refresh token rota).
 */

const ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const API_BASE_URL = `${ORIGIN}/api`;
export const DEFAULT_API_TIMEOUT_MS = 15_000;

export function resolveApiTimeout(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_API_TIMEOUT_MS;
}

// ---------------------------------------------------------------- Tokens

const ACCESS_KEY = 'cer_access_token';
const REFRESH_KEY = 'cer_refresh_token';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // localStorage no disponible (modo privado): la sesión dura lo que la pestaña.
  }
}

let accessToken = readStorage(ACCESS_KEY);
let refreshToken = readStorage(REFRESH_KEY);

/**
 * localStorage es la fuente de verdad compartida entre pestañas. SuperTokens
 * ROTA el refresh token en cada renovación y, si alguien vuelve a usar uno
 * viejo, el core lo trata como robo de token y revoca la sesión. Por eso cada
 * pestaña escucha los cambios de las demás y relee el storage antes de renovar.
 */
const storageAvailable = (() => {
  try {
    const probe = '__cer_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

function syncFromStorage() {
  if (!storageAvailable) return;
  accessToken = readStorage(ACCESS_KEY);
  refreshToken = readStorage(REFRESH_KEY);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === ACCESS_KEY || e.key === REFRESH_KEY || e.key === null) syncFromStorage();
  });
}

/** Diferencia reloj local − reloj del servidor, medida con el `iat` del último token recibido. */
let clockSkew = 0;

function decodeJwt(token: string): { exp?: number; iat?: number } | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/** Milisegundos hasta que vence el access token (null si no se puede leer el `exp`). */
function accessTokenTtl(): number | null {
  const exp = accessToken ? decodeJwt(accessToken)?.exp : undefined;
  return typeof exp === 'number' ? exp * 1000 + clockSkew - Date.now() : null;
}

export const tokens = {
  get access() {
    return accessToken;
  },
  get refresh() {
    return refreshToken;
  },
  set(next: { access?: string | null; refresh?: string | null }) {
    if (next.access !== undefined) {
      accessToken = next.access;
      writeStorage(ACCESS_KEY, next.access);
      const iat = next.access ? decodeJwt(next.access)?.iat : undefined;
      if (typeof iat === 'number') clockSkew = Date.now() - iat * 1000;
    }
    if (next.refresh !== undefined) {
      refreshToken = next.refresh;
      writeStorage(REFRESH_KEY, next.refresh);
    }
  },
  clear() {
    this.set({ access: null, refresh: null });
  },
  /** Lee los tokens que SuperTokens devuelve en los headers de la respuesta. */
  captureFrom(headers: Record<string, unknown>) {
    const access = headers['st-access-token'];
    const refresh = headers['st-refresh-token'];
    if (typeof access === 'string' && access) this.set({ access });
    if (typeof refresh === 'string' && refresh) this.set({ refresh });
  },
};

/** El store registra acá qué hacer cuando la sesión ya no se puede renovar. */
let onSessionExpired: () => void = () => {};
export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

// ---------------------------------------------------------------- Errores

export class ApiError<P = unknown> extends Error {
  /** Código HTTP (0 si no hubo respuesta del servidor). */
  readonly status: number;
  /** Contenido de `response` en el cuerpo del error, si existe. */
  readonly payload: P | undefined;

  constructor(message: string, status: number, payload?: P) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'La solicitud tiene datos inválidos.',
  401: 'Tu sesión expiró. Volvé a ingresar.',
  403: 'No tenés permisos para realizar esta acción.',
  404: 'El recurso no existe.',
  409: 'La operación entra en conflicto con el estado actual.',
  500: 'Error interno del servidor.',
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: unknown; response?: unknown }>;
    if (!err.response) {
      return new ApiError(
        err.code === 'ECONNABORTED'
          ? 'El servidor tardó demasiado en responder.'
          : 'No se pudo conectar con el servidor. Verificá que la API esté en línea.',
        0,
      );
    }
    const { status, data } = err.response;
    const message =
      (data && typeof data.message === 'string' && data.message) ||
      DEFAULT_MESSAGES[status] ||
      `Error inesperado (${status}).`;
    return new ApiError(message, status, data?.response);
  }
  return new ApiError(error instanceof Error ? error.message : 'Error desconocido', 0);
}

/** Mensaje legible para un toast o un formulario (acepta errores de RTK Query). */
export function getErrorMessage(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}

// ---------------------------------------------------------------- Axios

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: resolveApiTimeout(import.meta.env.VITE_API_TIMEOUT),
  // `tags=a&tags=b` (el backend no entiende `tags[]=a`).
  paramsSerializer: { indexes: null },
});

/** Se renueva el access token si le quedan menos de 60 s (evita el 401 + reintento). */
const REFRESH_MARGIN_MS = 60_000;

const isAuthUrl = (url?: string) => !!url && url.replace(/^\/+/, '').startsWith('auth/');

function expireSession() {
  tokens.clear();
  onSessionExpired();
}

http.interceptors.request.use(async (config) => {
  config.headers.set('st-auth-mode', 'header');
  if (config.headers.has('Authorization')) return config;
  syncFromStorage();
  const ttl = accessTokenTtl();
  if (!isAuthUrl(config.url) && refreshToken && (!accessToken || (ttl !== null && ttl < REFRESH_MARGIN_MS))) {
    const result = await refreshSession();
    if (result === 'expired') expireSession();
  }
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  return config;
});

http.interceptors.response.use((res) => {
  tokens.captureFrom(res.headers as Record<string, unknown>);
  return res;
});

/** ok: hay tokens nuevos · expired: la sesión ya no se puede renovar · error: falla de red/servidor. */
export type RefreshResult = 'ok' | 'expired' | 'error';

let refreshing: Promise<RefreshResult> | null = null;

/** Serializa la renovación entre pestañas (Web Locks API); sin soporte, solo dentro de la pestaña. */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? (locks.request(`${REFRESH_KEY}:lock`, fn) as Promise<T>) : fn();
}

async function doRefresh(seen: string | null): Promise<RefreshResult> {
  syncFromStorage();
  if (!refreshToken) return 'expired';
  // Otra pestaña renovó mientras esperábamos el lock: usamos sus tokens.
  if (seen && refreshToken !== seen) return 'ok';
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/session/refresh`, null, {
      headers: { 'st-auth-mode': 'header', Authorization: `Bearer ${refreshToken}` },
      timeout: 15000,
    });
    tokens.captureFrom(res.headers as Record<string, unknown>);
    return 'ok';
  } catch (e) {
    return axios.isAxiosError(e) && e.response?.status === 401 ? 'expired' : 'error';
  }
}

/** Renueva el access token. Una sola renovación a la vez (por pestaña y entre pestañas). */
export function refreshSession(): Promise<RefreshResult> {
  if (!refreshing) {
    const seen = refreshToken;
    refreshing = withRefreshLock(() => doRefresh(seen)).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  if (error.response?.status !== 401 || !config || isAuthUrl(config.url)) throw error;

  if (!config._retried) {
    config._retried = true;
    const used = String(config.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
    syncFromStorage();
    // Si otra request u otra pestaña ya renovó mientras esta viajaba, solo reintentamos.
    const result: RefreshResult =
      accessToken && accessToken !== used ? 'ok' : refreshToken ? await refreshSession() : 'expired';
    if (result === 'ok' && accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
      return http.request(config);
    }
    // Sin conexión con el backend: no cerramos la sesión, el próximo intento puede renovar.
    if (result === 'error') throw error;
  }
  expireSession();
  throw error;
});

// ---------------------------------------------------------------- Requests

export type QueryParams = Record<string, unknown>;

/** Quita vacíos ('' / null / undefined / []) para no mandar filtros sin valor. */
export function cleanParams(params?: QueryParams) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
    ),
  );
}

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'response' in body && 'statusCode' in body) {
    return (body as { response: T }).response;
  }
  return body as T;
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await http.request(config);
    return unwrap<T>(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}

export interface RequestArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  params?: QueryParams;
  data?: unknown;
  headers?: Record<string, string>;
}

export interface QueryError {
  status: number;
  message: string;
  payload?: unknown;
}

/** baseQuery de RTK Query sobre axios. */
export const axiosBaseQuery: BaseQueryFn<RequestArgs, unknown, QueryError> = async ({
  url,
  method = 'GET',
  params,
  data,
  headers,
}) => {
  try {
    const result = await request<unknown>({ url, method, params: cleanParams(params), data, headers });
    return { data: result };
  } catch (e) {
    const err = toApiError(e);
    return { error: { status: err.status, message: err.message, payload: err.payload } };
  }
};

// ---------------------------------------------------------------- Multipart

/** Arma un FormData: objetos/arrays como JSON string (así lo espera el backend). */
export function toFormData(fields: Record<string, unknown>, files: File[] = [], fileField = 'image') {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    fd.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  files.forEach((f) => fd.append(fileField, f));
  return fd;
}
