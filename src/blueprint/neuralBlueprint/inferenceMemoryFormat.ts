export function formatInferenceMemoryPoint(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? 'compact' : 'standard',
  }).format(value);
}
