import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'section' | 'div';
}

export function Card({ children, as = 'section', className, ...props }: CardProps) {
  const Component = as;
  return (
    <Component className={['ui-card', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Component>
  );
}
