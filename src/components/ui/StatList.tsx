export interface StatItem {
  label: string;
  value: string | number;
}
export function StatList({ items }: { items: StatItem[] }) {
  return (
    <dl className="ui-stat-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
