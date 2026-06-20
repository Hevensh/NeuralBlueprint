const WHITE = [248, 250, 252];
const GREEN = [34, 255, 106];
const ORANGE = [255, 154, 24];
const RED = [255, 52, 52];

export function knowledgePreviewColor(
  mastery: number,
  overfitPercent: number,
) {
  const mastered = mix(WHITE, GREEN, clamp(mastery));
  const overfit = clamp(overfitPercent / 100);
  const color = overfit <= 0.5
    ? mix(mastered, ORANGE, overfit * 2)
    : mix(ORANGE, RED, (overfit - 0.5) * 2);
  return `rgb(${color.join(', ')})`;
}

function mix(from: number[], to: number[], ratio: number) {
  return from.map((value, index) => (
    Math.round(value + (to[index] - value) * ratio)
  ));
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
