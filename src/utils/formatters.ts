// Display formatting functions for frequencies

import { config } from '@/config';

// Decimal places from config
const { frequencyDecimalPlaces } = config.settings;

/**
 * Format frequency as percentage string
 * Returns "Not detected" for null values
 */
export function frequencyToPercent(frequency: number | null): string {
  if (frequency === null) return 'Not detected';
  return `${(frequency * 100).toFixed(frequencyDecimalPlaces)}%`;
}

/**
 * Format frequency as ratio string (e.g., "1:25")
 * Returns "Not detected" for null or zero values
 */
export function frequencyToRatio(frequency: number | null): string {
  if (frequency === null) return 'Not detected';
  if (frequency === 0) return 'Not detected';
  const ratio = Math.round(1 / frequency);
  return `1:${ratio.toLocaleString()}`;
}

/**
 * Format carrier frequency with both percent and ratio representations
 */
export function formatCarrierFrequency(frequency: number | null): {
  percent: string;
  ratio: string;
} {
  return {
    percent: frequencyToPercent(frequency),
    ratio: frequencyToRatio(frequency),
  };
}
