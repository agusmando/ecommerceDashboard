import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

/**
 * Cliente HTTP del backend de Canela en Rama.
 *
 * - Todas las respuestas tienen el formato `{ statusCode, message, response }`:
 *   acá se desenvuelve `response`.
 * - Auth con SuperTokens en **modo header**: el access token va como
 *   `Authorization: Bearer …`; si el backend responde 401 se intenta un
 *   refresh (una sola vez, compartido entre requests concurrentes).
 */

const ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const API_BASE_URL = `${ORIGIN}/api`;

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
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 20000,
  // `tags=a&tags=b` (el backend no entiende `tags[]=a`).
  paramsSerializer: { indexes: null },
});

http.interceptors.request.use((config) => {
  if (accessToken && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

http.interceptors.response.use((res) => {
  tokens.captureFrom(res.headers as Record<string, unknown>);
  return res;
});

let refreshing: Promise<boolean> | null = null;

/** Renueva el access token. Concurrent-safe: todas las requests esperan el mismo refresh. */
export function refreshSession(): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false);
  refreshing ??= axios
    .post(`${API_BASE_URL}/auth/session/refresh`, null, {
      headers: { 'st-auth-mode': 'header', Authorization: `Bearer ${refreshToken}` },
      timeout: 15000,
    })
    .then((res) => {
      tokens.captureFrom(res.headers as Record<string, unknown>);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  const isAuthCall = config?.url?.startsWith('/auth/');
  if (error.response?.status === 401 && config && !config._retried && !isAuthCall && refreshToken) {
    config._retried = true;
    if (await refreshSession()) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
      return http.request(config);
    }
  }
  if (error.response?.status === 401 && !isAuthCall) {
    tokens.clear();
    onSessionExpired();
  }
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
