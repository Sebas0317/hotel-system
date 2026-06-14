import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HotelTitle from '../components/HotelTitle';

describe('HotelTitle', () => {
  it('renders default topbar variant', () => {
    render(<HotelTitle />);
    expect(screen.getByText('EcoBosque')).toBeInTheDocument();
  });

  it('renders login variant as h1', () => {
    render(<HotelTitle variant="login" />);
    const el = screen.getByRole('heading', { level: 1 });
    expect(el).toHaveTextContent('EcoBosque');
  });

  it('renders inline variant as h2', () => {
    render(<HotelTitle variant="inline" />);
    const el = screen.getByRole('heading', { level: 2 });
    expect(el).toHaveTextContent('EcoBosque');
  });

  it('fires onClick when clicked with clickable variant', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<HotelTitle onClick={handleClick} />);
    await user.click(screen.getByText('EcoBosque'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
