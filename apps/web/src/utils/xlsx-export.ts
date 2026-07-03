import writeXlsxFile from "write-excel-file/universal";
import type { Cell, SheetData } from "write-excel-file/universal";

export interface XlsxSheetDefinition {
  name: string;
  rows: Record<string, unknown>[];
}

const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_NAME_CHARS = /[\\/?*:[\]]/g;

function normalizeSheetName(name: string, fallbackIndex: number): string {
  const cleaned = name.replace(INVALID_SHEET_NAME_CHARS, "_").trim();
  const fallback = `Sheet ${fallbackIndex + 1}`;
  return (cleaned || fallback).slice(0, MAX_SHEET_NAME_LENGTH);
}

function toCellValue(value: unknown): Cell {
  if (value == null) return null;
  if (value instanceof Date) return value;

  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return value;
    default:
      return JSON.stringify(value);
  }
}

function rowsToSheetData(rows: Record<string, unknown>[]): SheetData {
  if (rows.length === 0) return [];

  const firstRow = rows[0];
  if (!firstRow) return [];

  const headers = Object.keys(firstRow);
  return [
    headers,
    ...rows.map((row) => headers.map((key) => toCellValue(row[key]))),
  ];
}

function buildColumnWidths(data: SheetData): { width: number }[] {
  const headerRow = data[0] ?? [];
  return headerRow.map((_, columnIndex) => {
    const maxLength = data.reduce((max, row) => {
      const value = row[columnIndex];
      const text = value == null ? "" : String(value);
      return Math.max(max, text.length);
    }, 10);

    return { width: Math.min(Math.max(maxLength + 2, 10), 48) };
  });
}

export async function buildXlsxBlob(
  sheets: XlsxSheetDefinition[],
): Promise<Blob> {
  const workbookSheets = sheets
    .map((sheet, index) => {
      const data = rowsToSheetData(sheet.rows);
      return {
        data,
        sheet: normalizeSheetName(sheet.name, index),
        columns: buildColumnWidths(data),
      };
    })
    .filter((sheet) => sheet.data.length > 0);

  return writeXlsxFile(workbookSheets).toBlob();
}
