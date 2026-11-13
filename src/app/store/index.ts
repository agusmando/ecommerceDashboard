import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api/baseApi';
import { setSessionExpiredHandler } from '../api/client';
import authReducer, { sessionExpired } from './authSlice';
import uiReducer, { persistUi } from './uiSlice';
import filtersReducer, { persistFilters } from './filtersSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    ui: uiReducer,
    filters: filtersReducer,
  },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});

setupListeners(store.dispatch);

setSessionExpiredHandler(() => {
  store.dispatch(sessionExpired());
  store.dispatch(api.util.resetApiState());
});

// Persistencia liviana de preferencias y filtros.
let prevUi = store.getState().ui;
let prevFilters = store.getState().filters;
store.subscribe(() => {
  const { ui, filters } = store.getState();
  if (ui !== prevUi) persistUi((prevUi = ui));
  if (filters !== prevFilters) persistFilters((prevFilters = filters));
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
