/**
 * Log level enumeration for categorizing log entry severity
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Individual log entry with timestamp and optional structured details
 */
export interface LogEntry {
  id: number;
  timestamp: number; // Date.now()
  level: LogLevel;
  category: string; // 'api', 'calculation', 'error', 'user', etc.
  message: string;
  details?: unknown; // Optional structured data
}

/**
 * Log system settings for configuring behavior
 */
export interface LogSettings {
  maxEntries: number; // Default 500
  autoClearOnStart: boolean;
  defaultFilterLevel: LogLevel;
  enabledCategories: string[];
}

/**
 * Computed statistics about the log store
 */
export interface LogStats {
  totalCount: number;
  droppedCount: number;
  memoryEstimate: string; // "12.5 KB"
  byLevel: Record<LogLevel, number>;
}
