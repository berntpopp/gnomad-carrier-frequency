import type { TemplateContext } from '@/types';

/**
 * Renders a template string by replacing {{variable}} placeholders with context values.
 * Missing variables are replaced with empty string and logged as warnings.
 *
 * @param template - Template string with {{variableName}} placeholders
 * @param context - Partial context object with variable values
 * @returns Rendered string with variables replaced
 *
 * @example
 * renderTemplate('Hello {{gene}}', { gene: 'CFTR' });
 * // Returns: "Hello CFTR"
 *
 * @example
 * renderTemplate('Risk: {{recurrenceRiskPercent}}', { gene: 'CFTR' });
 * // Logs warning and returns: "Risk: "
 */
export function renderTemplate(
  template: string,
  context: Partial<TemplateContext>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key as keyof TemplateContext];
    if (value === undefined || value === null) {
      console.warn(`Template variable "${key}" is undefined`);
      return '';
    }
    return String(value);
  });
}
