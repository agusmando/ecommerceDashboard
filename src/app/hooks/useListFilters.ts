import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { patchFilters, resetFilters, type FilterValues } from '../store/filtersSlice';
import { useDebouncedValue } from './useDebouncedValue';

export interface Paging {
  page: number;
  pageSize: number;
}

/**
 * Estado de filtros + paginación de un listado, guardado en Redux por `key`.
 *
 * - Cambiar cualquier filtro vuelve a la página 1.
 * - `debounced` aplica un retardo a los campos de texto (`textKeys`) para no
 *   disparar una request por tecla.
 * - `activeCount` sirve para el badge "N filtros".
 */
export function useListFilters<F extends FilterValues>(
  key: string,
  defaults: F,
  options: { textKeys?: (keyof F)[]; pageSize?: number } = {},
) {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((s) => s.filters[key]);
  const defaultPageSize = options.pageSize ?? 20;

  const values = useMemo(
    () => ({ page: 1, pageSize: defaultPageSize, ...defaults, ...stored }) as F & Paging,
    // defaults es un literal en cada render: se compara por contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stored, JSON.stringify(defaults), defaultPageSize],
  );

  const set = useCallback(
    (patch: Partial<F>) => dispatch(patchFilters({ key, patch: { ...patch, page: 1 } })),
    [dispatch, key],
  );
  const setPage = useCallback((page: number) => dispatch(patchFilters({ key, patch: { page } })), [dispatch, key]);
  const setPageSize = useCallback(
    (pageSize: number) => dispatch(patchFilters({ key, patch: { pageSize, page: 1 } })),
    [dispatch, key],
  );
  const reset = useCallback(() => dispatch(resetFilters({ key })), [dispatch, key]);

  // Retardo sólo para los campos de texto.
  const textSnapshot = JSON.stringify((options.textKeys ?? []).map((k) => values[k]));
  const debouncedText = useDebouncedValue(textSnapshot, 350);
  const debounced = useMemo(() => {
    const out = { ...values };
    const parsed = JSON.parse(debouncedText) as unknown[];
    (options.textKeys ?? []).forEach((k, i) => {
      (out as FilterValues)[k as string] = parsed[i];
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, debouncedText]);

  const activeCount = Object.keys(defaults).filter((k) => {
    const v = values[k];
    const d = defaults[k];
    return JSON.stringify(v ?? '') !== JSON.stringify(d ?? '');
  }).length;

  return { values, debounced, set, setPage, setPageSize, reset, activeCount };
}
