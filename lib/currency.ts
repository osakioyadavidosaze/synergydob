export function formatNaira(value: number): string {
  return `₦${new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 2,
  }).format(value)}`;
}
