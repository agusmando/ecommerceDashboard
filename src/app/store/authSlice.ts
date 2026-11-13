import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError, request, tokens } from '../api/client';
import { api } from '../api/baseApi';
import type { User } from '../api/types';

export const STAFF_ROLES = ['ADMIN', 'EMPLOYEE'];

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

const SUPERTOKENS_HEADERS = { 'st-auth-mode': 'header', rid: 'emailpassword' };

interface SignInResponse {
  status: 'OK' | 'WRONG_CREDENTIALS_ERROR' | 'FIELD_ERROR' | 'SIGN_IN_NOT_ALLOWED' | string;
  formFields?: { id: string; error: string }[];
  reason?: string;
}

const fetchMe = () => request<User>({ url: '/user/me' });

const isStaff = (user: User) =>
  (user.roles ?? []).some((r) => STAFF_ROLES.includes(r)) || STAFF_ROLES.includes(user.role);

export const signIn = createAsyncThunk<User, { email: string; password: string }, { rejectValue: string }>(
  'auth/signIn',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      tokens.clear();
      const res = await request<SignInResponse>({
        url: '/auth/signin',
        method: 'POST',
        headers: SUPERTOKENS_HEADERS,
        data: {
          formFields: [
            { id: 'email', value: email.trim() },
            { id: 'password', value: password },
          ],
        },
      });
      if (res.status === 'WRONG_CREDENTIALS_ERROR') return rejectWithValue('Email o contraseña incorrectos.');
      if (res.status === 'FIELD_ERROR') {
        return rejectWithValue(res.formFields?.map((f) => f.error).join(' ') || 'Revisá los datos ingresados.');
      }
      if (res.status !== 'OK') return rejectWithValue(res.reason || 'No se pudo iniciar sesión.');
      if (!tokens.access) {
        return rejectWithValue('El servidor no devolvió el token de sesión (¿CORS expone st-access-token?).');
      }

      const user = await fetchMe();
      if (!isStaff(user)) {
        await request({ url: '/auth/signout', method: 'POST' }).catch(() => undefined);
        tokens.clear();
        return rejectWithValue('Tu usuario no tiene rol de staff (ADMIN o EMPLOYEE).');
      }
      return user;
    } catch (e) {
      tokens.clear();
      return rejectWithValue(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión.');
    }
  },
);

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
      tokens.clear();
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
