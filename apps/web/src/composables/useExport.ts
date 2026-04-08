// Composable for exporting calculation results as JSON or Excel

import ExcelJS from "exceljs";
import type { ExportData, LogEntry, LogStats } from "@gnomad-cf/core/types";
import {
  generateFilename,
  sanitizeFilename,
  buildPopulationsTsv,
  buildVariantsTsv,
} from "@/utils/export-utils";

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Add rows from an array of objects to an ExcelJS worksheet,
 * with a header row derived from object keys.
 */
function addJsonToSheet(
  ws: ExcelJS.Worksheet,
  rows: Record<string, unknown>[],
): void {
  if (rows.length === 0) return;
  const firstRow = rows[0];
  if (!firstRow) return;
  const columns = Object.keys(firstRow).map((key) => ({
    header: key,
    key,
  }));
  ws.columns = columns;
  for (const row of rows) {
    ws.addRow(row);
  }
}

export interface UseExportReturn {
  exportToJson: (data: ExportData, gene: string, population?: string) => void;
  exportToExcel: (
    data: ExportData,
    gene: string,
    population?: string,
  ) => Promise<void>;
  exportLogsToJson: (entries: LogEntry[], stats: LogStats) => void;
  exportPopulationsTsv: (data: ExportData, gene: string) => void;
  exportVariantsTsv: (data: ExportData, gene: string) => void;
}

/**
 * Composable for exporting calculation results
 */
export function useExport(): UseExportReturn {
  /**
   * Export data as JSON file
   */
  function exportToJson(
    data: ExportData,
    gene: string,
    population?: string,
  ): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const filename = generateFilename(gene, population) + ".json";
    downloadBlob(blob, filename);
  }

  /**
   * Export data as Excel file with multiple sheets
   */
  async function exportToExcel(
    data: ExportData,
    gene: string,
    population?: string,
  ): Promise<void> {
    const wb = new ExcelJS.Workbook();

    // Summary sheet (single row)
    const summaryWs = wb.addWorksheet("Summary");
    addJsonToSheet(summaryWs, [data.summary] as unknown as Record<
      string,
      unknown
    >[]);

    // Populations sheet
    if (data.populations.length > 0) {
      const populationsWs = wb.addWorksheet("Populations");
      addJsonToSheet(
        populationsWs,
        data.populations as unknown as Record<string, unknown>[],
      );
    }

    // Variants sheet
    if (data.variants.length > 0) {
      const variantsWs = wb.addWorksheet("Variants");
      addJsonToSheet(
        variantsWs,
        data.variants as unknown as Record<string, unknown>[],
      );
    }

    // Metadata sheet (flatten for readability)
    const metadataRows = [
      { field: "Export Date", value: data.metadata.exportDate },
      { field: "gnomAD Version", value: data.metadata.gnomadVersion },
      { field: "gnomAD Display Name", value: data.metadata.gnomadDisplayName },
      { field: "App Version", value: data.metadata.appVersion },
      {
        field: "LoF HC Filter",
        value: String(data.metadata.filtersApplied.lofHcEnabled),
      },
      {
        field: "Missense Filter",
        value: String(data.metadata.filtersApplied.missenseEnabled),
      },
      {
        field: "ClinVar Filter",
        value: String(data.metadata.filtersApplied.clinvarEnabled),
      },
      {
        field: "ClinVar Star Threshold",
        value: String(data.metadata.filtersApplied.clinvarStarThreshold),
      },
      {
        field: "Calc: HWE Formula",
        value: String(data.metadata.calcConfig.useHWEFormula),
      },
      {
        field: "Calc: Homozygote Exclusion",
        value: String(data.metadata.calcConfig.useHomExclusion),
      },
      {
        field: "Calc: Penetrance",
        value: String(data.metadata.calcConfig.penetrance),
      },
    ];
    const metadataWs = wb.addWorksheet("Metadata");
    addJsonToSheet(metadataWs, metadataRows);

    // Generate and download file
    const filename = generateFilename(gene, population) + ".xlsx";
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, filename);
  }

  /**
   * Export populations data as TSV file with UTF-8 BOM for Excel compatibility
   */
  function exportPopulationsTsv(data: ExportData, gene: string): void {
    const BOM = "\uFEFF";
    const tsv = BOM + buildPopulationsTsv(data);
    const blob = new Blob([tsv], {
      type: "text/tab-separated-values;charset=utf-8",
    });
    const date = new Date().toISOString().split("T")[0];
    const filename = `${sanitizeFilename(gene)}_populations_${date}.tsv`;
    downloadBlob(blob, filename);
  }

  /**
   * Export variants data as TSV file with UTF-8 BOM for Excel compatibility
   */
  function exportVariantsTsv(data: ExportData, gene: string): void {
    const BOM = "\uFEFF";
    const tsv = BOM + buildVariantsTsv(data);
    const blob = new Blob([tsv], {
      type: "text/tab-separated-values;charset=utf-8",
    });
    const date = new Date().toISOString().split("T")[0];
    const filename = `${sanitizeFilename(gene)}_variants_${date}.tsv`;
    downloadBlob(blob, filename);
  }

  /**
   * Export logs as JSON file (for LogViewer)
   */
  function exportLogsToJson(entries: LogEntry[], stats: LogStats): void {
    const data = {
      exportDate: new Date().toISOString(),
      stats,
      entries,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const filename = `carrier-freq-logs_${new Date().toISOString().split("T")[0]}.json`;
    downloadBlob(blob, filename);
  }

  return {
    exportToJson,
    exportToExcel,
    exportLogsToJson,
    exportPopulationsTsv,
    exportVariantsTsv,
  };
}
