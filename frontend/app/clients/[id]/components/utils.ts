/**
 * Safely formats a number to a fixed decimal place
 * Handles cases where the value might be a string (from PostgreSQL)
 */
export function formatNumber(value: number | string | null | undefined, decimals: number = 1): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  return num.toFixed(decimals);
}

