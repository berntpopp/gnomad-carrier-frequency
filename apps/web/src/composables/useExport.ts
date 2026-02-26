// Composable for exporting calculation results as JSON or Excel

import * as XLSX from "xlsx";
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

export interface UseExportReturn {
  exportToJson: (data: ExportData, gene: string, population?: string) => void;
  exportToExcel: (data: ExportData, gene: string, population?: string) => void;
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
  function exportToExcel(
    data: ExportData,
    gene: string,
    population?: string,
  ): void {
    const wb = XLSX.utils.book_new();

    // Summary sheet (single row)
    const summaryWs = XLSX.utils.json_to_sheet([data.summary]);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Populations sheet
    if (data.populations.length > 0) {
      const populationsWs = XLSX.utils.json_to_sheet(data.populations);
      XLSX.utils.book_append_sheet(wb, populationsWs, "Populations");
    }

    // Variants sheet
    if (data.variants.length > 0) {
      const variantsWs = XLSX.utils.json_to_sheet(data.variants);
      XLSX.utils.book_append_sheet(wb, variantsWs, "Variants");
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
    const metadataWs = XLSX.utils.json_to_sheet(metadataRows);
    XLSX.utils.book_append_sheet(wb, metadataWs, "Metadata");

    // Generate and download file
    const filename = generateFilename(gene, population) + ".xlsx";
    XLSX.writeFile(wb, filename);
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
