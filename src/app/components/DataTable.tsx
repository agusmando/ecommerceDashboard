import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import type { PaginationInfo } from '../api/types';
import { Card } from './Card';
import { EmptyState, ErrorState, TableSkeleton } from './States';
import { Pagination } from './Pagination';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
  /** Oculta la columna en pantallas chicas. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  /** Recargando con datos previos: atenúa la tabla. */
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  empty?: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode };
  /** Paginación del servidor. */
  pagination?: {
    info?: PaginationInfo;
    page: number;
    pageSize: number;
    onPageChange: (p: number) => void;
    onPageSizeChange?: (s: number) => void;
  };
  /** Contenido sobre la tabla dentro de la misma tarjeta (p. ej. filtros). */
  toolbar?: ReactNode;
  className?: string;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  fetching,
  error,
  onRetry,
  onRowClick,
  rowClassName,
  empty = { title: 'No hay resultados' },
  pagination,
  toolbar,
  className,
}: DataTableProps<T>) {
  const showSkeleton = loading && !rows;
  const showError = !!error && !rows;

  return (
    <Card className={cn('p-0 sm:p-0 overflow-hidden', className)}>
      {toolbar && <div className="border-b border-border p-3 sm:p-4">{toolbar}</div>}

      {showSkeleton ? (
        <TableSkeleton rows={6} columns={Math.min(columns.length, 6)} />
      ) : showError ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : !rows?.length ? (
        <EmptyState {...empty} />
      ) : (
        <div className={cn('overflow-x-auto transition-opacity', fetching && 'opacity-60')}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      'px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap',
                      alignClass[c.align ?? 'left'],
                      c.hideOnMobile && 'hidden md:table-cell',
                      c.headerClassName,
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-muted/40 transition-colors',
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-3 align-middle text-foreground',
                        alignClass[c.align ?? 'left'],
                        c.hideOnMobile && 'hidden md:table-cell',
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (rows?.length || pagination.page > 1) ? (
        <Pagination
          pagination={pagination.info}
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          disabled={fetching}
        />
      ) : null}
    </Card>
  );
}

/** Evita que un click en un botón de la fila dispare `onRowClick`. */
export const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
