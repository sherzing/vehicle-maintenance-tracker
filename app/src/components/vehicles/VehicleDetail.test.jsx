import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import VehicleDetail from './VehicleDetail';
import * as vehiclesService from '../../services/firebase/vehicles';
import * as maintenanceItemsService from '../../services/firebase/maintenanceItems';
import * as maintenanceStatus from '../../utils/maintenanceStatus';
import * as vehicleStats from '../../utils/vehicleStats';

// Mock all dependencies
vi.mock('../../services/firebase/vehicles');
vi.mock('../../services/firebase/maintenanceItems');
vi.mock('../../utils/maintenanceStatus');
vi.mock('../../utils/vehicleStats');

// Mock useAuth hook
const mockUser = { uid: 'user123', email: 'test@example.com' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock modal components to simplify testing
vi.mock('../maintenance/CreateMaintenanceItemModal', () => ({
  default: ({ show }) => (show ? <div data-testid="create-item-modal">Create Item Modal</div> : null),
}));
vi.mock('../maintenance/EditMaintenanceItemModal', () => ({
  default: ({ show }) => (show ? <div data-testid="edit-item-modal">Edit Item Modal</div> : null),
}));
vi.mock('../maintenance/LogServiceModal', () => ({
  default: ({ show }) => (show ? <div data-testid="log-service-modal">Log Service Modal</div> : null),
}));
vi.mock('../maintenance/LogRepairModal', () => ({
  default: ({ show }) => (show ? <div data-testid="log-repair-modal">Log Repair Modal</div> : null),
}));
vi.mock('./LogUsageModal', () => ({
  default: ({ show }) => (show ? <div data-testid="log-usage-modal">Log Usage Modal</div> : null),
}));
vi.mock('./EditVehicleModal', () => ({
  default: ({ show }) => (show ? <div data-testid="edit-vehicle-modal">Edit Vehicle Modal</div> : null),
}));
vi.mock('../maintenance/EditServiceModal', () => ({
  default: ({ show }) => (show ? <div data-testid="edit-service-modal">Edit Service Modal</div> : null),
}));

describe('VehicleDetail', () => {
  const mockVehicle = {
    id: 'vehicle123',
    name: 'Tesla Model 3',
    make: 'Tesla',
    model: 'Model 3',
    year: 2020,
    current_usage: 50000,
    usage_unit: 'km',
    created_at: new Date('2020-01-01'),
  };

  const mockMaintenanceItems = [
    {
      id: 'item1',
      name: 'Oil Change',
      usage_interval: 10000,
      time_interval_days: 365,
      last_service_usage: 45000,
    },
  ];

  const mockServiceHistory = [
    {
      id: 'service1',
      item_name: 'Oil Change',
      service_date: new Date('2024-01-15'),
      service_usage: 45000,
      cost: 75.50,
      provider: 'Main Garage',
      type: 'service',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks for utility functions
    maintenanceStatus.getMaintenanceStatus.mockReturnValue({
      status: 'good',
      percentage: 0.5,
    });
    maintenanceStatus.getStatusText.mockReturnValue('Good');
    maintenanceStatus.formatRemaining.mockReturnValue('5,000 km remaining');

    vehicleStats.calculateDaysInService.mockReturnValue(1500);
    vehicleStats.calculateNextServiceDue.mockReturnValue({
      name: 'Oil Change',
      remaining: '5,000 km',
    });
    vehicleStats.calculateTotalCost.mockReturnValue(750.50);
    vehicleStats.formatTimelineDate.mockReturnValue({
      day: '15',
      monthYear: 'Jan 2024',
    });
  });

  it('should show loading spinner initially', () => {
    vehiclesService.getVehicle.mockImplementation(() => new Promise(() => {})); // Never resolves
    maintenanceItemsService.getVehicleMaintenanceItems.mockImplementation(() => new Promise(() => {}));
    maintenanceItemsService.getVehicleServiceHistory.mockImplementation(() => new Promise(() => {}));

    render(<VehicleDetail vehicleId="vehicle123" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display error alert when data loading fails', async () => {
    const errorMessage = 'Network error';
    vehiclesService.getVehicle.mockRejectedValueOnce(new Error(errorMessage));
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce([]);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce([]);

    // Suppress console.error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load vehicle details. Please try again.')).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it('should display info message when no vehicle is loaded', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(null);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce([]);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce([]);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Select a vehicle to view details')).toBeInTheDocument();
    });
  });

  it('should load and display vehicle details', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
      expect(screen.getByText('2020 Tesla Model 3')).toBeInTheDocument();
    });
  });

  it('should display vehicle stats correctly', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Current Mileage')).toBeInTheDocument();
      expect(screen.getByText('50,000')).toBeInTheDocument();
      expect(screen.getByText('km')).toBeInTheDocument();
      expect(screen.getByText('Next Service Due')).toBeInTheDocument();
      expect(screen.getByText('Days in Service')).toBeInTheDocument();
      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getByText('Total Maintenance')).toBeInTheDocument();
      expect(screen.getByText('$750.50')).toBeInTheDocument();
    });
  });

  it('should display "All up to date" when no next service is due', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce([]);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce([]);
    vehicleStats.calculateNextServiceDue.mockReturnValue(null);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('All up to date')).toBeInTheDocument();
    });
  });

  it('should display "No data" when no cost history is available', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce([]);
    vehicleStats.calculateTotalCost.mockReturnValue(null);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('No data')).toBeInTheDocument();
    });
  });

  it('should display maintenance items with status', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      // "Oil Change" appears in multiple places, so check for unique maintenance item text
      expect(screen.getByText('Every 10,000 km or Every 365 days')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Last: 45,000 km')).toBeInTheDocument();
      expect(screen.getByText('5,000 km remaining')).toBeInTheDocument();
    });
  });

  it('should display empty state when no maintenance items exist', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce([]);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('No maintenance items for this vehicle yet.')).toBeInTheDocument();
      expect(screen.getByText('Add First Maintenance Item')).toBeInTheDocument();
    });
  });

  it('should display service history entries', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Service History')).toBeInTheDocument();
      expect(screen.getByText('1 service')).toBeInTheDocument();
      expect(screen.getByText('Main Garage')).toBeInTheDocument();
      expect(screen.getByText('📍 45,000 km')).toBeInTheDocument();
      expect(screen.getByText('💰 $75.50')).toBeInTheDocument();
    });
  });

  it('should display empty state when no service history exists', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce([]);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('No service history yet. Log services to build your maintenance record.')).toBeInTheDocument();
    });
  });

  it('should open Create Maintenance Item modal when Add Item button is clicked', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Schedule')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: '+ Add Item' });
    fireEvent.click(addButton);

    expect(screen.getByTestId('create-item-modal')).toBeInTheDocument();
  });

  it('should open Edit Maintenance Item modal when Edit button is clicked', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Schedule')).toBeInTheDocument();
    });

    // Find the Edit button within the maintenance item (there are Edit buttons in service history too)
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    // First Edit button is for the maintenance item
    fireEvent.click(editButtons[0]);

    expect(screen.getByTestId('edit-item-modal')).toBeInTheDocument();
  });

  it('should open Log Service modal when Log Service button is clicked', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Schedule')).toBeInTheDocument();
    });

    const logServiceButton = screen.getByRole('button', { name: 'Log Service' });
    fireEvent.click(logServiceButton);

    expect(screen.getByTestId('log-service-modal')).toBeInTheDocument();
  });

  it('should open Log Repair modal when Log Repair button is clicked', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
    });

    const logRepairButton = screen.getByRole('button', { name: 'Log Repair' });
    fireEvent.click(logRepairButton);

    expect(screen.getByTestId('log-repair-modal')).toBeInTheDocument();
  });

  it('should open Edit Vehicle modal when Edit Vehicle menu item is clicked', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
    });

    // Open the settings dropdown
    const settingsButton = screen.getByRole('button', { name: '⚙️' });
    fireEvent.click(settingsButton);

    // Click on Edit Vehicle menu item
    const editVehicleMenuItem = screen.getByText('Edit Vehicle');
    fireEvent.click(editVehicleMenuItem);

    expect(screen.getByTestId('edit-vehicle-modal')).toBeInTheDocument();
  });

  it('should open Log Usage modal when Log Usage button is clicked', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
    });

    const logUsageButton = screen.getByRole('button', { name: 'Log Usage' });
    fireEvent.click(logUsageButton);

    expect(screen.getByTestId('log-usage-modal')).toBeInTheDocument();
  });

  it('should display repair entry with correct icon and label', async () => {
    const repairEntry = {
      id: 'repair1',
      item_name: 'Brake Replacement',
      service_date: new Date('2024-02-01'),
      service_usage: 48000,
      cost: 250.00,
      provider: 'Auto Shop',
      type: 'repair',
    };

    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce([repairEntry]);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('🔧')).toBeInTheDocument();
      expect(screen.getByText('Brake Replacement')).toBeInTheDocument();
    });
  });

  it('should handle hours usage unit correctly', async () => {
    const hoursVehicle = { ...mockVehicle, usage_unit: 'hours', current_usage: 500 };
    vehiclesService.getVehicle.mockResolvedValueOnce(hoursVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('hours')).toBeInTheDocument();
    });
  });

  it('should display 0 km when current_usage is null', async () => {
    const vehicleWithNoUsage = { ...mockVehicle, current_usage: null };
    vehiclesService.getVehicle.mockResolvedValueOnce(vehicleWithNoUsage);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('should display "Never serviced" for items without last_service_usage', async () => {
    const neverServicedItem = {
      id: 'item2',
      name: 'New Item',
      usage_interval: 5000,
      time_interval_days: 180,
      last_service_usage: null,
    };

    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce([neverServicedItem]);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('Never serviced')).toBeInTheDocument();
    });
  });

  it('should pluralize "services" correctly when count is not 1', async () => {
    const multipleServices = [
      mockServiceHistory[0],
      { ...mockServiceHistory[0], id: 'service2' },
    ];

    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(multipleServices);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('2 services')).toBeInTheDocument();
    });
  });

  it('should use singular "service" when count is 1', async () => {
    vehiclesService.getVehicle.mockResolvedValueOnce(mockVehicle);
    maintenanceItemsService.getVehicleMaintenanceItems.mockResolvedValueOnce(mockMaintenanceItems);
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValueOnce(mockServiceHistory);

    render(<VehicleDetail vehicleId="vehicle123" />);

    await waitFor(() => {
      expect(screen.getByText('1 service')).toBeInTheDocument();
    });
  });
});
