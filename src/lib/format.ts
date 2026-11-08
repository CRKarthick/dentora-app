/** Shared display-formatting helpers used across patient-related screens. */

/** Format an ISO date string as `D/M/YYYY`. Returns the input unchanged if it can't be parsed. */
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

const indianRupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  currencyDisplay: "symbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a whole-rupee amount with Indian grouping, e.g. `120000` -> `₹1,20,000`. */
export function formatCurrency(amount: number): string {
  return indianRupeeFormatter.format(Math.abs(amount));
}
