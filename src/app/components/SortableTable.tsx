import { useState, ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./Table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (item: T) => ReactNode;
}

interface SortableTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => number;
  emptyMessage?: string;
}

export function SortableTable<T>({
  data,
  columns,
  onRowClick,
  getRowKey,
  emptyMessage = "No hay datos para mostrar",
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;

    const aValue = (a as any)[sortKey];
    const bValue = (b as any)[sortKey];

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Handle different types
    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      return sortDirection === "asc" ? comparison : -comparison;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // Default comparison
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1" />
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={`${column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : ""} ${column.sortable ? "cursor-pointer select-none hover:bg-muted/50" : ""}`}
              onClick={() => column.sortable && handleSort(column.key)}
            >
              <div className={`flex items-center ${column.align === "center" ? "justify-center" : column.align === "right" ? "justify-end" : ""}`}>
                {column.label}
                {column.sortable && getSortIcon(column.key)}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((item) => (
            <TableRow
              key={getRowKey(item)}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : ""}
                >
                  {column.render ? column.render(item) : String((item as any)[column.key] ?? "-")}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
