import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError, request, tokens } from '../api/client';
import { api } from '../api/baseApi';
import type { User } from '../api/types';
import { hasPermission } from '../lib/permissions';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  /** Motivo del último cierre de sesión forzado (p. ej. token vencido). */
  notice: string | null;
}

const initialState: AuthState = {
  user: null,
  status: tokens.access ? 'checking' : 'anonymous',
  notice: null,
};

/**
 * SuperTokens en modo header (`st-auth-mode: header` lo agrega el cliente HTTP).
 * El header `rid` elige la receta: email/contraseña o ThirdParty (Google).
 */
const EP_HEADERS = { rid: 'emailpassword' };
const TP_HEADERS = { rid: 'thirdparty' };

interface StResponse {
  status: 'OK' | 'WRONG_CREDENTIALS_ERROR' | 'FIELD_ERROR' | 'SIGN_IN_NOT_ALLOWED' | string;
  formFields?: { id: string; error: string }[];
  reason?: string;
  message?: string;
}

const fetchMe = () => request<User>({ url: '/user/me' });

const isStaff = (user: User) => hasPermission(user, 'dashboard.access');

const rejectMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/**
 * Común a email y Google: valida la respuesta de SuperTokens, trae el usuario y
 * aplica el control de staff (sin `dashboard.access` se cierra la sesión).
 */
async function completeStaffLogin(res: StResponse, fallback: string, deniedMsg: string): Promise<User> {
  if (res.status === 'WRONG_CREDENTIALS_ERROR') throw new ApiError('Email o contraseña incorrectos.', 400);
  if (res.status === 'FIELD_ERROR') {
    throw new ApiError(res.formFields?.map((f) => f.error).join(' ') || 'Revisá los datos ingresados.', 400);
  }
  if (res.status === 'NO_EMAIL_GIVEN_BY_PROVIDER') {
    throw new ApiError('Google no compartió tu email. Probá con otra cuenta.', 400);
  }
  if (res.status !== 'OK') throw new ApiError(res.reason || res.message || fallback, 400);
  if (!tokens.access) {
    throw new ApiError('El servidor no devolvió el token de sesión (¿CORS expone st-access-token?).', 0);
  }

  const user = await fetchMe();
  if (!isStaff(user)) {
    await request({ url: '/auth/signout', method: 'POST' }).catch(() => undefined);
    tokens.clear();
    throw new ApiError(deniedMsg, 403);
  }
  return user;
}

export const signIn = createAsyncThunk<User, { email: string; password: string }, { rejectValue: string }>(
  'auth/signIn',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      tokens.clear();
      const res = await request<StResponse>({
        url: '/auth/signin',
        method: 'POST',
        headers: EP_HEADERS,
        data: {
          formFields: [
            { id: 'email', value: email.trim() },
            { id: 'password', value: password },
          ],
        },
      });
      return await completeStaffLogin(
        res,
        'No se pudo iniciar sesión.',
        'Tu usuario no tiene acceso al panel. Pedile a un administrador que te asigne un rol.',
      );
    } catch (e) {
      tokens.clear();
      return rejectWithValue(rejectMsg(e, 'No se pudo iniciar sesión.'));
    }
  },
);

// ---------------------------------------------------------------- Google (ThirdParty)

const GOOGLE_KEY = 'cer_admin_google_oauth';
export const googleRedirectUri = () => `${window.location.origin}/auth/callback/google`;

interface GoogleState {
  state: string;
  pkceCodeVerifier?: string;
  returnTo: string;
}

/** Solo rutas internas (evita redirecciones abiertas con `returnTo`). */
const safeReturnTo = (to: string | undefined) => (to && to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard');

/** Pide la URL de autorización al backend, guarda state + PKCE y redirige a Google. */
export async function startGoogleSignIn(returnTo = '/dashboard') {
  const res = await request<{ status: string; urlWithQueryParams?: string; pkceCodeVerifier?: string }>({
    url: '/auth/authorisationurl',
    headers: TP_HEADERS,
    params: { thirdPartyId: 'google', redirectURIOnProviderDashboard: googleRedirectUri() },
  });
  if (res.status !== 'OK' || !res.urlWithQueryParams) {
    throw new ApiError('El ingreso con Google no está disponible.', 500);
  }
  const state = crypto.randomUUID();
  const saved: GoogleState = { state, pkceCodeVerifier: res.pkceCodeVerifier, returnTo: safeReturnTo(returnTo) };
  try {
    sessionStorage.setItem(GOOGLE_KEY, JSON.stringify(saved));
  } catch {
    throw new ApiError('Tu navegador bloquea el almacenamiento de la sesión. No se puede ingresar con Google.', 0);
  }
  const url = new URL(res.urlWithQueryParams);
  url.searchParams.set('state', state);
  window.location.assign(url.toString());
}

/** Completa el login al volver de Google (`/auth/callback/google?code&state`). */
export const finishGoogleSignIn = createAsyncThunk<
  { user: User; returnTo: string },
  URLSearchParams,
  { rejectValue: string }
>('auth/google', async (params, { rejectWithValue }) => {
  let saved: GoogleState | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(GOOGLE_KEY) ?? 'null');
    sessionStorage.removeItem(GOOGLE_KEY);
  } catch {
    saved = null;
  }

  if (params.get('error')) {
    return rejectWithValue(
      params.get('error') === 'access_denied'
        ? 'Cancelaste el ingreso con Google.'
        : 'Google rechazó el ingreso. Intentá de nuevo.',
    );
  }
  if (!saved || saved.state !== params.get('state') || !params.get('code')) {
    return rejectWithValue('La sesión con Google expiró o es inválida. Intentá de nuevo.');
  }
  try {
    tokens.clear();
    const res = await request<StResponse>({
      url: '/auth/signinup',
      method: 'POST',
      headers: TP_HEADERS,
      data: {
        thirdPartyId: 'google',
        redirectURIInfo: {
          redirectURIOnProviderDashboard: googleRedirectUri(),
          redirectURIQueryParams: Object.fromEntries(params.entries()),
          pkceCodeVerifier: saved.pkceCodeVerifier,
        },
      },
    });
    const user = await completeStaffLogin(
      res,
      'No se pudo ingresar con Google.',
      'Tu cuenta de Google no tiene acceso al panel. Pedile a un administrador que te asigne un rol.',
    );
    return { user, returnTo: safeReturnTo(saved.returnTo) };
  } catch (e) {
    tokens.clear();
    return rejectWithValue(rejectMsg(e, 'No se pudo ingresar con Google.'));
  }
});

/** Al cargar la app: si hay token guardado, valida la sesión con /user/me. */
export const restoreSession = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/restore',
  async (_, { rejectWithValue }) => {
    try {
      const user = await fetchMe();
      if (!isStaff(user)) {
        tokens.clear();
        return rejectWithValue('Tu usuario no tiene rol de staff.');
      }
      return user;
    } catch (e) {
      // 401 ya lo resolvió el cliente (intentó renovar y, si no pudo, limpió los tokens).
      // Errores de red / cold start del backend: conservamos los tokens para el próximo intento.
      return rejectWithValue(e instanceof ApiError ? e.message : 'Sesión inválida');
    }
  },
);

export const signOut = createAsyncThunk('auth/signOut', async (_, { dispatch }) => {
  await request({ url: '/auth/signout', method: 'POST' }).catch(() => undefined);
  tokens.clear();
  dispatch(api.util.resetApiState());
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired(state) {
      if (state.status === 'authenticated') state.notice = 'Tu sesión expiró. Volvé a ingresar.';
      state.user = null;
      state.status = 'anonymous';
    },
    clearNotice(state) {
      state.notice = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(signIn.fulfilled, (s, a) => {
      s.user = a.payload;
      s.status = 'authenticated';
      s.notice = null;
    });
    b.addCase(finishGoogleSignIn.fulfilled, (s, a) => {
      s.user = a.payload.user;
      s.status = 'authenticated';
      s.notice = null;
    });
    // El error se muestra en /login (el callback redirige ahí).
    b.addCase(finishGoogleSignIn.rejected, (s, a) => {
      s.user = null;
      s.status = 'anonymous';
      s.notice = a.payload ?? 'No se pudo ingresar con Google.';
    });
    b.addCase(restoreSession.pending, (s) => {
      s.status = 'checking';
    });
    b.addCase(restoreSession.fulfilled, (s, a) => {
      s.user = a.payload;
      s.status = 'authenticated';
    });
    b.addCase(restoreSession.rejected, (s) => {
      s.user = null;
      s.status = 'anonymous';
    });
    b.addCase(signOut.fulfilled, (s) => {
      s.user = null;
      s.status = 'anonymous';
    });
  },
});

export const { sessionExpired, clearNotice } = authSlice.actions;
export default authSlice.reducer;
