export function formatTrainingSignal(value: number) {
  if (!Number.isFinite(value)) return '0';
  const absolute = Math.abs(value);
  if (absolute === 0) return '0';
  return absolute < 0.001 || absolute >= 1000
    ? value.toExponential(2)
    : value.toFixed(3);
}
