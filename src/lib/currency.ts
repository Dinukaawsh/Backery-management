export function formatCurrency(amount: number | string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return "Rs 0.00";

  return `Rs ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
