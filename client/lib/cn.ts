/**
 * Small class-name helper. Keeps conditional Tailwind classes readable without
 * pulling in a dependency.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
