import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import * as teamsService from '../../services/firebase/teams';
import * as vehiclesService from '../../services/firebase/vehicles';
import * as maintenanceItemsService from '../../services/firebase/maintenanceItems';
import * as maintenanceStatus from '../../utils/maintenanceStatus';
import * as vehicleStats from '../../utils/vehicleStats';

// Mock all dependencies
vi.mock('../../services/firebase/teams');
vi.mock('../../services/firebase/vehicles');
vi.mock('../../services/firebase/maintenanceItems');
vi.mock('../../utils/maintenanceStatus');
vi.mock('../../utils/vehicleStats');

// Mock useAuth and useNavigate
const mockNavigate = vi.fn();
const mockUser = { uid: 'user123', email: 'test@example.com', displayName: 'Test User' };

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock CreateTeamModal
vi.mock('../teams/CreateTeamModal', () => ({
  default: ({ show, onTeamCreated }) =>
    show ? (
      <div data-testid="create-team-modal">
        <button onClick={() => onTeamCreated('new-team-123')}>Create Team</button>
      </div>
    ) : null,
}));

describe('Dashboard', () => {
  const mockTeams = [
    { id: 'team1', name: 'Team Alpha' },
    { id: 'team2', name: 'Team Beta' },
  ];

  const mockVehicles = [
    {
      id: 'vehicle1',
      name: 'Tesla Model 3',
      make: 'Tesla',
      model: 'Model 3',
      current_usage: 50000,
      usage_unit: 'km',
    },
    {
      id: 'vehicle2',
      name: 'Honda Civic',
      make: 'Honda',
      model: 'Civic',
      current_usage: 75000,
      usage_unit: 'km',
    },
  ];

  const mockMaintenanceItems = [
    {
      id: 'item1',
      name: 'Oil Change',
      usage_interval: 10000,
      last_service_usage: 45000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Setup default mocks
    maintenanceStatus.getMaintenanceStatus.mockReturnValue({ status: 'ok' });
    maintenanceStatus.getStatusText.mockImplementation((status) => {
      if (status === 'overdue') return 'Overdue';
      if (status === 'due_soon') return 'Due Soon';
      return 'Good';
    });
    vehicleStats.calculateNextServiceDue.mockReturnValue({
      name: 'Oil Change',
      remaining: '5,000 km',
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should show loading spinner initially', () => {
    teamsService.getUserTeams.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load and display user teams', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Team Alpha')).toBeInTheDocument();
    });
  });

  it('should display welcome message with user name', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });
  });

  it('should select first team by default when no localStorage', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('selectedTeamId')).toBe('team1');
      expect(screen.getByDisplayValue('Team Alpha')).toBeInTheDocument();
    });
  });

  it('should use team from localStorage if valid', async () => {
    localStorage.setItem('selectedTeamId', 'team2');
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Team Beta')).toBeInTheDocument();
    });
  });

  it('should show error alert when teams fail to load', async () => {
    teamsService.getUserTeams.mockRejectedValueOnce(new Error('Network error'));

    // Suppress console.error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load teams. Please try again.')).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it('should show empty state when no teams exist', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No teams found/)).toBeInTheDocument();
      expect(screen.getByText(/Create a team/)).toBeInTheDocument();
    });
  });

  it('should change selected team when dropdown changes', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValue(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Team Alpha')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'team2' } });

    expect(localStorage.getItem('selectedTeamId')).toBe('team2');
  });

  it('should open create team modal when "Create New Team" is selected', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Team Alpha')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'create-new-team' } });

    expect(screen.getByTestId('create-team-modal')).toBeInTheDocument();
  });

  it('should display vehicle cards with correct information', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // "Tesla Model 3" and "Honda Civic" appear in both name and model, use getAllByText
      const teslaElements = screen.getAllByText(/Tesla Model 3/);
      expect(teslaElements.length).toBeGreaterThan(0);
      const hondaElements = screen.getAllByText(/Honda Civic/);
      expect(hondaElements.length).toBeGreaterThan(0);
      expect(screen.getByText('50,000')).toBeInTheDocument();
      expect(screen.getByText('75,000')).toBeInTheDocument();
    });
  });

  it('should display status badges for vehicles', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const statusBadges = screen.getAllByText('Good');
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  it('should display next service information', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Oil Change').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5,000 km').length).toBeGreaterThan(0);
    });
  });

  it('should show empty state when no vehicles in team', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No vehicles found in this team/)).toBeInTheDocument();
      expect(screen.getByText(/Add a vehicle/)).toBeInTheDocument();
    });
  });

  it('should navigate to vehicle detail when card is clicked', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce([mockVehicles[0]]);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const teslaElements = screen.getAllByText(/Tesla Model 3/);
      expect(teslaElements.length).toBeGreaterThan(0);
    });

    const vehicleCard = screen.getAllByText(/Tesla Model 3/)[0].closest('.minimalist-vehicle-card');
    fireEvent.click(vehicleCard);

    expect(mockNavigate).toHaveBeenCalledWith('/vehicles?vehicleId=vehicle1');
  });

  it('should display all filter buttons with counts', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/All Vehicles \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Overdue \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Due Soon \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Good Standing \(2\)/)).toBeInTheDocument();
    });
  });

  it('should filter vehicles by overdue status', async () => {
    maintenanceStatus.getMaintenanceStatus.mockReturnValueOnce({ status: 'overdue' });

    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce([mockVehicles[0]]);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Overdue \(1\)/)).toBeInTheDocument();
    });

    const overdueButton = screen.getByText(/Overdue \(1\)/);
    fireEvent.click(overdueButton);

    const teslaElements = screen.getAllByText(/Tesla Model 3/);
    expect(teslaElements.length).toBeGreaterThan(0);
  });

  it('should show empty state when filter has no matches', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/All Vehicles \(2\)/)).toBeInTheDocument();
    });

    const overdueButton = screen.getByText(/Overdue \(0\)/);
    fireEvent.click(overdueButton);

    expect(screen.getByText('No vehicles with overdue maintenance')).toBeInTheDocument();
  });

  it('should handle hours usage unit correctly', async () => {
    const hoursVehicle = {
      ...mockVehicles[0],
      usage_unit: 'hours',
      current_usage: 500,
    };

    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce([hoursVehicle]);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('hours')).toBeInTheDocument();
    });
  });

  it('should display 0 when current_usage is null', async () => {
    const vehicleWithNoUsage = {
      ...mockVehicles[0],
      current_usage: null,
    };

    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce([vehicleWithNoUsage]);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('should show "No maintenance items defined" when vehicle has no items', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce([mockVehicles[0]]);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue([]);
    vehicleStats.calculateNextServiceDue.mockReturnValue(null);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No maintenance items defined')).toBeInTheDocument();
    });
  });

  it('should sort vehicles by status priority (overdue first)', async () => {
    maintenanceStatus.getMaintenanceStatus
      .mockReturnValueOnce({ status: 'ok' })
      .mockReturnValueOnce({ status: 'overdue' });

    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockResolvedValueOnce(mockVehicles);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValue(mockMaintenanceItems);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const vehicleCards = screen.getAllByText(/Tesla Model 3|Honda Civic/);
      // The overdue vehicle (Honda Civic) should appear first
      expect(vehicleCards[0]).toHaveTextContent('Honda Civic');
    });
  });

  it('should reload teams and select new team after team creation', async () => {
    teamsService.getUserTeams
      .mockResolvedValueOnce(mockTeams)
      .mockResolvedValueOnce([...mockTeams, { id: 'new-team-123', name: 'New Team' }]);

    vehiclesService.getTeamVehicles.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Team Alpha')).toBeInTheDocument();
    });

    // Open create team modal
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'create-new-team' } });

    // Simulate team creation
    const createButton = screen.getByText('Create Team');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(localStorage.getItem('selectedTeamId')).toBe('new-team-123');
    });
  });

  it('should handle dashboard data loading error', async () => {
    teamsService.getUserTeams.mockResolvedValueOnce(mockTeams);
    vehiclesService.getTeamVehicles.mockRejectedValueOnce(new Error('Network error'));

    // Suppress console.error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard. Please try again.')).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it('should dismiss error alert when close button is clicked', async () => {
    teamsService.getUserTeams.mockRejectedValueOnce(new Error('Network error'));

    // Suppress console.error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load teams. Please try again.')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: 'Close alert' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Failed to load teams. Please try again.')).not.toBeInTheDocument();
    });

    spy.mockRestore();
  });
});
