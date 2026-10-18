import type { ReactNode } from 'react';
export type KpiTone = 'blue' | 'gold' | 'green' | 'red' | 'orange' | 'purple';
export interface KpiTileProps {
  label: string;
  value: string | number;
  tone: KpiTone;
  icon?: ReactNode;
  detail?: string;
}
export function KpiTile({ label, value, tone, icon, detail }: KpiTileProps) {
  return (
    <li className={`ui-kpi ui-kpi-${tone}`}>
      <span className="ui-kpi-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <div className="ui-kpi-label">{label}</div>
        <div className="ui-kpi-value" title={String(value)}>
          {value}
        </div>
        {detail && <div className="ui-kpi-detail">{detail}</div>}
      </div>
    </li>
  );
}
