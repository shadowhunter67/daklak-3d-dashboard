import type { ReactNode } from 'react';
export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  /** Visible text of the "illustrative data" badge; the badge is omitted when undefined. */
  badge?: string;
  breadcrumbLabel?: string;
  actions?: ReactNode;
}
export function PageHeader({
  title,
  description,
  breadcrumb,
  badge,
  breadcrumbLabel,
  actions,
}: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      {breadcrumb && (
        <nav aria-label={breadcrumbLabel} className="ui-breadcrumb">
          {breadcrumb}
        </nav>
      )}
      <div className="ui-page-header-row">
        <div>
          <h1>{title}</h1>
          {badge && <span className="ui-illustrative-badge">{badge}</span>}
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="ui-page-actions">{actions}</div>}
      </div>
    </header>
  );
}
