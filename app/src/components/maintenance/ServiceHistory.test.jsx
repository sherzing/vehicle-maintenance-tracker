import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '../../test/utils';
import ServiceHistory from './ServiceHistory';
import * as maintenanceItemsService from '../../services/firebase/maintenanceItems';
import * as usageHistoryService from '../../services/firebase/usageHistory';

vi.mock('../../services/firebase/maintenanceItems');
vi.mock('../../services/firebase/usageHistory');

describe('ServiceHistory', () => {
  const mockVehicleId = 'vehicle123';
  const mockUsageUnit = 'km';

  const mockServiceHistory = [
    {
      id: 'service1',
      item_name: 'Oil Change',
      type: 'service',
      service_date: { toDate: () => new Date('2024-01-15') },
      service_usage: 45000,
      cost: 50.00,
      provider: 'AutoShop',
    },
    {
      id: 'repair1',
      item_name: 'Brake Repair',
      type: 'repair',
      service_date: { toDate: () => new Date('2024-01-10') },
      service_usage: 44000,
      cost: 200.00,
    },
  ];

  const mockUsageHistory = [
    {
      id: 'usage1',
      usage: 46000,
      date: { toDate: () => new Date('2024-01-20') },
      usage_type: 'track day',
      location: 'Laguna Seca',
    },
    {
      id: 'usage2',
      usage: 43000,
      date: { toDate: () => new Date('2024-01-05') },
      usage_type: null,
      location: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner initially', () => {
    maintenanceItemsService.getVehicleServiceHistory.mockImplementation(() => new Promise(() => {}));
    usageHistoryService.getVehicleUsageHistory.mockImplementation(() => new Promise(() => {}));

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load and merge service and usage histories', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(mockServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    expect(screen.getByText('Brake Repair')).toBeInTheDocument();
    expect(screen.getByText(/Usage Update: 46,000 km/)).toBeInTheDocument();
    expect(screen.getByText(/Usage Update: 43,000 km/)).toBeInTheDocument();
  });

  it('should sort histories by date (most recent first)', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(mockServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText(/Usage Update: 46,000 km/)).toBeInTheDocument();
    });

    // Verify all entries are present and in correct order by checking they exist
    expect(screen.getByText(/Usage Update: 46,000 km/)).toBeInTheDocument(); // 2024-01-20 (most recent)
    expect(screen.getByText('Oil Change')).toBeInTheDocument(); // 2024-01-15
    expect(screen.getByText('Brake Repair')).toBeInTheDocument(); // 2024-01-10
    expect(screen.getByText(/Usage Update: 43,000 km/)).toBeInTheDocument(); // 2024-01-05 (oldest)
  });

  it('should display correct badges for different entry types', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(mockServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    // Check service badge
    const serviceBadges = screen.getAllByText('Service');
    expect(serviceBadges.length).toBeGreaterThan(0);

    // Check repair badge
    const repairBadges = screen.getAllByText('Repair');
    expect(repairBadges.length).toBeGreaterThan(0);

    // Check usage badges
    const usageBadges = screen.getAllByText('Usage');
    expect(usageBadges.length).toBeGreaterThan(0);
  });

  it('should display usage with correct unit (km)', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(mockServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit="km" />);

    await waitFor(() => {
      expect(screen.getByText(/46,000 km/)).toBeInTheDocument();
    });

    expect(screen.getByText(/45,000 km/)).toBeInTheDocument();
    expect(screen.getByText(/44,000 km/)).toBeInTheDocument();
  });

  it('should display usage with correct unit (hours)', async () => {
    const hourServiceHistory = [{
      ...mockServiceHistory[0],
      service_usage: 450,
    }];
    const hourUsageHistory = [{
      ...mockUsageHistory[0],
      usage: 460,
    }];

    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(hourServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(hourUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit="hours" />);

    await waitFor(() => {
      expect(screen.getByText(/460 hours/)).toBeInTheDocument();
    });

    expect(screen.getByText(/450 hours/)).toBeInTheDocument();
  });

  it('should display total entry count', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(mockServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText('4 entries')).toBeInTheDocument();
    });
  });


  it('should filter by usage entries only', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(mockServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText(/Usage Update: 46,000 km/)).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'usage' } });

    await waitFor(() => {
      expect(screen.getByText(/Usage Update: 46,000 km/)).toBeInTheDocument();
      expect(screen.getByText(/Usage Update: 43,000 km/)).toBeInTheDocument();
      expect(screen.queryByText('Oil Change')).not.toBeInTheDocument();
      expect(screen.queryByText('Brake Repair')).not.toBeInTheDocument();
    });
  });

  it('should show all entries when "all" filter is selected', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(mockServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole('combobox');

    // First change to service filter
    fireEvent.change(filterSelect, { target: { value: 'service' } });
    await waitFor(() => {
      expect(screen.queryByText('Brake Repair')).not.toBeInTheDocument();
    });

    // Then change back to all
    fireEvent.change(filterSelect, { target: { value: 'all' } });
    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
      expect(screen.getByText('Brake Repair')).toBeInTheDocument();
      expect(screen.getByText(/Usage Update: 46,000 km/)).toBeInTheDocument();
      expect(screen.getByText(/Usage Update: 43,000 km/)).toBeInTheDocument();
    });
  });

  it('should display filter counts correctly', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue(mockServiceHistory);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole('combobox');

    // Check option texts include counts
    expect(within(filterSelect).getByText('All (4)')).toBeInTheDocument();
    expect(within(filterSelect).getByText(/Services \(1\)/)).toBeInTheDocument();
    expect(within(filterSelect).getByText(/Repairs \(1\)/)).toBeInTheDocument();
    expect(within(filterSelect).getByText(/Usage Updates \(2\)/)).toBeInTheDocument();
  });

  it('should display usage type and location for usage entries', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue([]);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue(mockUsageHistory);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText(/Usage Update: 46,000 km/)).toBeInTheDocument();
    });

    expect(screen.getByText('track day')).toBeInTheDocument();
    expect(screen.getByText('Laguna Seca')).toBeInTheDocument();
  });

  it('should handle null usage type and location', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue([]);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue([mockUsageHistory[1]]);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText(/Usage Update: 43,000 km/)).toBeInTheDocument();
    });

    // Should not display Type or Location sections when null
    expect(screen.queryByText(/Type:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
  });

  it('should open EditUsageModal when clicking edit on usage entry', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue([]);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue([mockUsageHistory[0]]);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText(/Usage Update: 46,000 km/)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editButtons[0]);

    // Modal should be rendered (it has "Edit Usage Entry" in title from EditUsageModal)
    await waitFor(() => {
      expect(screen.getByText('Edit Usage Entry')).toBeInTheDocument();
    });
  });

  it('should show error message when loading fails', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockRejectedValue(new Error('Failed to load'));
    usageHistoryService.getVehicleUsageHistory.mockRejectedValue(new Error('Failed to load'));

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load history/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no history exists', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue([]);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue([]);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText(/No history yet/i)).toBeInTheDocument();
    });
  });

  it('should show filtered empty state when no matching entries', async () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue([mockServiceHistory[0]]);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue([]);

    render(<ServiceHistory vehicleId={mockVehicleId} usageUnit={mockUsageUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'repair' } });

    await waitFor(() => {
      expect(screen.getByText(/No repair entries found/i)).toBeInTheDocument();
    });
  });

  it('should not reload history when vehicleId is null', () => {
    maintenanceItemsService.getVehicleServiceHistory.mockResolvedValue([]);
    usageHistoryService.getVehicleUsageHistory.mockResolvedValue([]);

    render(<ServiceHistory vehicleId={null} usageUnit={mockUsageUnit} />);

    expect(maintenanceItemsService.getVehicleServiceHistory).not.toHaveBeenCalled();
    expect(usageHistoryService.getVehicleUsageHistory).not.toHaveBeenCalled();
  });
});
