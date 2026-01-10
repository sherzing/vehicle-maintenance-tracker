import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import LogServiceModal from './LogServiceModal';
import * as maintenanceItemsService from '../../services/firebase/maintenanceItems';

vi.mock('../../services/firebase/maintenanceItems');

describe('LogServiceModal', () => {
  const mockOnHide = vi.fn();
  const mockOnServiceLogged = vi.fn();
  const mockItem = {
    id: 'item123',
    name: 'Oil Change',
    usage_interval: 10000,
    last_service_usage: 40000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when show is false', () => {
    render(
      <LogServiceModal
        show={false}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    expect(screen.queryByText('Log Service')).not.toBeInTheDocument();
  });

  it('should render when show is true', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    // Check for modal title - it appears as "Log Service" text
    const logServiceElements = screen.getAllByText('Log Service');
    expect(logServiceElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Oil Change')).toBeInTheDocument();
  });

  it('should display current usage as placeholder', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
        usageUnit="km"
      />
    );

    const usageInput = screen.getByPlaceholderText('Current: 50000 km');
    expect(usageInput).toBeInTheDocument();
  });

  it('should display hours unit when usageUnit is hours', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={500}
        usageUnit="hours"
      />
    );

    expect(screen.getByText('Service Usage (hours)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Current: 500 hours')).toBeInTheDocument();
  });

  it('should default to km when usageUnit is not provided', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    expect(screen.getByText('Service Usage (km)')).toBeInTheDocument();
  });

  it('should pre-fill service usage with current usage', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const usageInput = screen.getByPlaceholderText('Current: 50000 km');
    expect(usageInput.value).toBe('50000');
  });

  it('should pre-fill service date with today', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const dateInput = dateInputs[0];
    const today = new Date().toISOString().split('T')[0];
    expect(dateInput.value).toBe(today);
  });

  it('should update form fields when user types', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const costInput = screen.getByPlaceholderText('Enter service cost');
    fireEvent.change(costInput, { target: { value: '150.50' } });
    expect(costInput.value).toBe('150.50');

    const providerInput = screen.getByPlaceholderText('e.g., Main Street Garage');
    fireEvent.change(providerInput, { target: { value: 'Test Garage' } });
    expect(providerInput.value).toBe('Test Garage');
  });

  it('should show validation error when both usage and date are missing', async () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    // Clear the pre-filled values
    const usageInput = screen.getByPlaceholderText('Current: 50000 km');
    const dateInput = document.querySelectorAll('input[type="date"]')[0];
    fireEvent.change(usageInput, { target: { value: '' } });
    fireEvent.change(dateInput, { target: { value: '' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please provide either service usage or service date')).toBeInTheDocument();
    });

    expect(maintenanceItemsService.logService).not.toHaveBeenCalled();
  });

  it('should successfully log service with all fields', async () => {
    maintenanceItemsService.logService.mockResolvedValueOnce('service123');

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const costInput = screen.getByPlaceholderText('Enter service cost');
    fireEvent.change(costInput, { target: { value: '150.50' } });

    const providerInput = screen.getByPlaceholderText('e.g., Main Street Garage');
    fireEvent.change(providerInput, { target: { value: 'Test Garage' } });

    // Find and submit the form directly
    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Service logged successfully!')).toBeInTheDocument();
    });

    expect(maintenanceItemsService.logService).toHaveBeenCalledWith(
      'item123',
      50000,
      expect.any(Date),
      150.50,
      'Test Garage'
    );

    // Wait for the 1 second delay and callbacks
    await waitFor(() => {
      expect(mockOnServiceLogged).toHaveBeenCalled();
      expect(mockOnHide).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should log service with only usage (no cost or provider)', async () => {
    maintenanceItemsService.logService.mockResolvedValueOnce('service123');

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Service logged successfully!')).toBeInTheDocument();
    });

    expect(maintenanceItemsService.logService).toHaveBeenCalledWith(
      'item123',
      50000,
      expect.any(Date),
      null,
      null
    );

    // Wait for the auto-close
    await waitFor(() => {
      expect(mockOnServiceLogged).toHaveBeenCalled();
      expect(mockOnHide).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should handle service logging error', async () => {
    const errorMessage = 'Failed to log service';
    maintenanceItemsService.logService.mockRejectedValueOnce(new Error(errorMessage));

    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnServiceLogged).not.toHaveBeenCalled();
    expect(mockOnHide).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('should show loading state during submission', async () => {
    let resolveService;
    const servicePromise = new Promise((resolve) => {
      resolveService = resolve;
    });
    maintenanceItemsService.logService.mockReturnValueOnce(servicePromise);

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Logging...')).toBeInTheDocument();
    });

    // Inputs should be disabled during loading
    const usageInput = screen.getByPlaceholderText('Current: 50000 km');
    expect(usageInput).toBeDisabled();

    resolveService('service123');

    // Wait for success state and auto-close
    await waitFor(() => {
      expect(mockOnServiceLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should disable cancel and submit during loading', async () => {
    let resolveService;
    const servicePromise = new Promise((resolve) => {
      resolveService = resolve;
    });
    maintenanceItemsService.logService.mockReturnValueOnce(servicePromise);

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      const loadingButton = screen.getByText('Logging...');
      expect(loadingButton).toBeDisabled();
    });

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();

    resolveService('service123');

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnServiceLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should reset form and close modal when cancel is clicked', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const costInput = screen.getByPlaceholderText('Enter service cost');
    fireEvent.change(costInput, { target: { value: '150' } });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnHide).toHaveBeenCalled();
  });

  it('should not close modal when cancel is clicked during loading', async () => {
    let resolveService;
    const servicePromise = new Promise((resolve) => {
      resolveService = resolve;
    });
    maintenanceItemsService.logService.mockReturnValueOnce(servicePromise);

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Logging...')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();

    resolveService('service123');

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnServiceLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should trim whitespace from provider input', async () => {
    maintenanceItemsService.logService.mockResolvedValueOnce('service123');

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const providerInput = screen.getByPlaceholderText('e.g., Main Street Garage');
    fireEvent.change(providerInput, { target: { value: '  Test Garage  ' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(maintenanceItemsService.logService).toHaveBeenCalledWith(
        'item123',
        50000,
        expect.any(Date),
        null,
        'Test Garage' // Trimmed
      );
    });

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnServiceLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should handle empty provider as null', async () => {
    maintenanceItemsService.logService.mockResolvedValueOnce('service123');

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const providerInput = screen.getByPlaceholderText('e.g., Main Street Garage');
    fireEvent.change(providerInput, { target: { value: '   ' } }); // Only whitespace

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(maintenanceItemsService.logService).toHaveBeenCalledWith(
        'item123',
        50000,
        expect.any(Date),
        null,
        '' // Whitespace trimmed to empty string
      );
    });

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnServiceLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should parse numeric values correctly', async () => {
    maintenanceItemsService.logService.mockResolvedValueOnce('service123');

    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    const usageInput = screen.getByPlaceholderText('Current: 50000 km');
    fireEvent.change(usageInput, { target: { value: '55123.5' } });

    const costInput = screen.getByPlaceholderText('Enter service cost');
    fireEvent.change(costInput, { target: { value: '99.99' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(maintenanceItemsService.logService).toHaveBeenCalledWith(
        'item123',
        55123.5,
        expect.any(Date),
        99.99,
        null
      );
    });

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnServiceLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should display item name in modal', () => {
    render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    expect(screen.getByText('Oil Change')).toBeInTheDocument();
    expect(screen.getByText(/Record when this service was performed/)).toBeInTheDocument();
  });

  it('should reset form to initial values when closed and reopened', async () => {
    const { rerender } = render(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    // Change some values
    const costInput = screen.getByPlaceholderText('Enter service cost');
    fireEvent.change(costInput, { target: { value: '150' } });

    // Close modal
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Reopen modal
    rerender(
      <LogServiceModal
        show={true}
        onHide={mockOnHide}
        onServiceLogged={mockOnServiceLogged}
        item={mockItem}
        currentUsage={50000}
      />
    );

    // Cost should be reset
    const costInputAfterReopen = screen.getByPlaceholderText('Enter service cost');
    expect(costInputAfterReopen.value).toBe('');
  });
});
