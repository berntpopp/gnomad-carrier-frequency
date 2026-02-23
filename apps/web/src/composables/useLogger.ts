import { useLogStore } from '@/stores/useLogStore';
import type { LogLevel } from '@/types';

/**
 * Return type for the useLogger composable
 */
export interface UseLoggerReturn {
  /** Log a debug message */
  debug: (message: string, details?: unknown) => void;
  /** Log an info message */
  info: (message: string, details?: unknown) => void;
  /** Log a warning message */
  warn: (message: string, details?: unknown) => void;
  /** Log an error message */
  error: (message: string, details?: unknown) => void;
  /** Direct access to the underlying log store */
  store: ReturnType<typeof useLogStore>;
}

/**
 * Composable for convenient logging with category-scoped methods
 *
 * @param category - Log category for grouping related messages (default: 'app')
 * @returns Object with debug/info/warn/error convenience methods
 *
 * @example
 * ```ts
 * const logger = useLogger('api');
 * logger.info('Fetching gene variants', { gene: 'CFTR' });
 * logger.error('API request failed', { error: err.message });
 * ```
 */
export function useLogger(category: string = 'app'): UseLoggerReturn {
  const store = useLogStore();

  function log(level: LogLevel, message: string, details?: unknown) {
    store.log(level, category, message, details);
  }

  return {
    // Convenience level methods
    debug: (message: string, details?: unknown) => log('DEBUG', message, details),
    info: (message: string, details?: unknown) => log('INFO', message, details),
    warn: (message: string, details?: unknown) => log('WARN', message, details),
    error: (message: string, details?: unknown) => log('ERROR', message, details),

    // Direct access to store for advanced use
    store,
  };
}
