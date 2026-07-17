export interface MapLabelCandidate {
  id: string;
  text: string;
  point: [number, number];
  priority: number;
  emphasized?: boolean;
}

export function layoutMapLabels(candidates: MapLabelCandidate[], maximum: number) {
  const occupied: Array<{ left: number; right: number; top: number; bottom: number }> = [];
  return [...candidates]
    .sort(
      (first, second) =>
        Number(Boolean(second.emphasized)) - Number(Boolean(first.emphasized)) ||
        first.priority - second.priority,
    )
    .filter((candidate) => {
      if (occupied.length >= maximum && !candidate.emphasized) return false;
      const halfWidth = Math.max(15, candidate.text.length * 3.35);
      const box = {
        left: candidate.point[0] - halfWidth,
        right: candidate.point[0] + halfWidth,
        top: candidate.point[1] - 6,
        bottom: candidate.point[1] + 6,
      };
      const overlaps = occupied.some(
        (other) =>
          box.left < other.right + 3 &&
          box.right > other.left - 3 &&
          box.top < other.bottom + 3 &&
          box.bottom > other.top - 3,
      );
      if (overlaps && !candidate.emphasized) return false;
      occupied.push(box);
      return true;
    });
}
