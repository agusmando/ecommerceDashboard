import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationInfo } from '../api/types';
import { formatNumber } from '../lib/utils';
import { Button } from './Button';

interface PaginationProps {
  pagination?: PaginationInfo;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

export function Pagination({
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  disabled,
}: PaginationProps) {
  const total = pagination?.totalAmount ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-border text-sm">
      <div className="text-muted-foreground">
        {total > 0 ? (
          <>
            Mostrando <span className="text-foreground font-medium">{from}–{to}</span> de{' '}
            <span className="text-foreground font-medium">{formatNumber(total)}</span>
          </>
        ) : (
          'Sin resultados'
        )}
      </div>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-muted-foreground">
            Por página
            <select
              className="h-8 rounded-md border border-border bg-input-background px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Página anterior"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-2 tabular-nums text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Página siguiente"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
