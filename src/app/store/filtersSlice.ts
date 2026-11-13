import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Filtros de cada listado, guardados por clave (`products`, `orders`…).
 * Se conservan al navegar al detalle y volver, y durante la sesión del navegador.
 */
export type FilterValues = Record<string, unknown>;
type FiltersState = Record<string, FilterValues>;

const STORAGE_KEY = 'cer_filters';

function load(): FiltersState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistFilters(state: FiltersState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignorar
  }
}

const filtersSlice = createSlice({
  name: 'filters',
  initialState: load,
  reducers: {
    patchFilters(s, a: PayloadAction<{ key: string; patch: FilterValues }>) {
      s[a.payload.key] = { ...s[a.payload.key], ...a.payload.patch };
    },
    resetFilters(s, a: PayloadAction<{ key: string; values?: FilterValues }>) {
      if (a.payload.values) s[a.payload.key] = a.payload.values;
      else delete s[a.payload.key];
    },
  },
});

export const { patchFilters, resetFilters } = filtersSlice.actions;
export default filtersSlice.reducer;
