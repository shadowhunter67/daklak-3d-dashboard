const vietnameseCollator = new Intl.Collator('vi', {
  sensitivity: 'base',
  numeric: true,
});

export function sortAdministrativeUnits<T extends { name: string; type: string; code: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      vietnameseCollator.compare(a.name, b.name) ||
      vietnameseCollator.compare(a.type, b.type) ||
      a.code.localeCompare(b.code),
  );
}
