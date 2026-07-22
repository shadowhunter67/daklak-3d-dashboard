import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DetailMapSourceNotice } from './DetailMapSourceNotice';

describe('DetailMapSourceNotice', () => {
  afterEach(cleanup);

  it('explains that the map is intentionally empty rather than broken', () => {
    render(<DetailMapSourceNotice />);
    expect(screen.getByText('Chế độ chờ dữ liệu')).toBeInTheDocument();
    expect(screen.getByText(/không dùng dữ liệu giả thay thế/)).toBeInTheDocument();
  });
});
