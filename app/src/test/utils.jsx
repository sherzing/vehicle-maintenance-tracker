import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Custom render function that includes common providers
export function renderWithRouter(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    ...options,
  });
}

// Mock Firebase user for testing
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

// Mock team data
export const mockTeam = {
  id: 'team-123',
  name: 'Test Team',
  owner_id: 'test-user-123',
  member_ids: ['test-user-123'],
  created_at: new Date(),
};

// Mock vehicle data
export const mockVehicle = {
  id: 'vehicle-123',
  name: 'Test Car',
  type: 'car',
  unit: 'km',
  current_usage: 50000,
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  team_id: 'team-123',
};

// Mock maintenance item
export const mockMaintenanceItem = {
  id: 'item-123',
  name: 'Oil Change',
  primary_interval: 10000,
  secondary_interval: 6,
  last_serviced_usage: 45000,
  last_serviced_date: new Date('2024-01-01'),
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
