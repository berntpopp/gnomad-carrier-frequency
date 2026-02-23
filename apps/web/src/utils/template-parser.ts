import { TEMPLATE_VARIABLES } from '@/config/template-variables';

/**
 * Segment of a parsed template
 */
export interface TemplateSegment {
  type: 'text' | 'variable';
  content: string; // For text: the text, for variable: the variable name (without braces)
  raw?: string; // For variable: the raw {{variable}} string
}

/**
 * Parse template string into segments of text and variables
 * Consistent with template-renderer.ts regex pattern
 *
 * @example
 * parseTemplate('Hello {{gene}} world')
 * // Returns: [
 * //   { type: 'text', content: 'Hello ' },
 * //   { type: 'variable', content: 'gene', raw: '{{gene}}' },
 * //   { type: 'text', content: ' world' }
 * // ]
 */
export function parseTemplate(template: string): TemplateSegment[] {
  const regex = /(\{\{(\w+)\}\})/g;
  const segments: TemplateSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(template)) !== null) {
    // Text before variable
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: template.slice(lastIndex, match.index),
      });
    }

    // Variable
    segments.push({
      type: 'variable',
      content: match[2]!, // Variable name without braces (guaranteed by regex)
      raw: match[1], // Full {{variable}} string
    });

    lastIndex = regex.lastIndex;
  }

  // Remaining text after last variable
  if (lastIndex < template.length) {
    segments.push({
      type: 'text',
      content: template.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Reconstruct template string from segments
 */
export function segmentsToTemplate(segments: TemplateSegment[]): string {
  return segments
    .map((seg) => (seg.type === 'variable' ? `{{${seg.content}}}` : seg.content))
    .join('');
}

/**
 * Check if a variable name is valid (exists in TEMPLATE_VARIABLES)
 */
export function isValidVariable(name: string): boolean {
  return TEMPLATE_VARIABLES.some((v) => v.name === name);
}
