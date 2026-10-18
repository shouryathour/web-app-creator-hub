export function pct(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0)
    return { text: "0%", value: 0, hasData: false };
  const value = (numerator / denominator) * 100;
  return { text: `${Math.round(value)}%`, value, hasData: true };
}