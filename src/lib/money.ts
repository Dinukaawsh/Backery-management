export function parseMoney(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function formatMoney(value: number) {
  return value.toFixed(2);
}
