import { describe, it, expect } from 'vitest';
import { render, screen } from './test/utils';
import App from './App';

describe('App', () => {
  it('should render the app title', () => {
    render(<App />);
    expect(screen.getByText('Vehicle Maintenance Tracker')).toBeInTheDocument();
  });

  it('should render welcome message', () => {
    render(<App />);
    expect(screen.getByText('Welcome to Vehicle Maintenance Tracker')).toBeInTheDocument();
  });

  it('should show setup in progress message', () => {
    render(<App />);
    expect(
      screen.getByText('Setup in progress. Authentication and features coming soon.')
    ).toBeInTheDocument();
  });

  it('should render navbar with dark variant', () => {
    const { container } = render(<App />);
    const navbar = container.querySelector('.navbar');
    expect(navbar).toHaveClass('bg-dark');
    expect(navbar).toHaveClass('navbar-dark');
  });
});
