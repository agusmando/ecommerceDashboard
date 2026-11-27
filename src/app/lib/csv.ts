/** Utilidades mínimas para exportar listados a CSV (se abre en Excel/Sheets). */

export const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Une encabezados + filas ya formateadas como texto en un CSV con BOM (para acentos en Excel). */
export function toCsv(header: (string | number)[], rows: (string | number | null | undefined)[][]) {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const csvFilename = (prefix: string) => `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
