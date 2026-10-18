import type { ReactNode } from 'react';
export interface PanelHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  headingId?: string;
}
export function PanelHeader({ title, icon, action, headingId }: PanelHeaderProps) {
  return (
    <div className="ui-panel-header">
      <div className="ui-panel-heading">
        <span className="ui-panel-icon" aria-hidden="true">
          {icon}
        </span>
        <h2 id={headingId}>{title}</h2>
      </div>
      {action && <div className="ui-panel-action">{action}</div>}
    </div>
  );
}
