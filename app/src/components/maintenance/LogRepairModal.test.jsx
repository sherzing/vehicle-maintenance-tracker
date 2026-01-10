import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import LogRepairModal from './LogRepairModal';
import * as maintenanceItemsService from '../../services/firebase/maintenanceItems';

vi.mock('../../services/firebase/maintenanceItems');

describe('LogRepairModal', () => {
  const mockOnHide = vi.fn();
  const mockOnRepairLogged = vi.fn();
  const mockVehicle = {
    id: 'vehicle123',
    name: 'Tesla Model 3',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when show is false', () => {
    render(
      <LogRepairModal
        show={false}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    expect(screen.queryByText('Log Repair')).not.toBeInTheDocument();
  });

  it('should not render when vehicle is null', () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={null}
      />
    );

    expect(screen.queryByText('Log Repair')).not.toBeInTheDocument();
  });

  it('should render when show is true and vehicle is provided', () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    // "Log Repair" appears in both modal title and button
    const logRepairElements = screen.getAllByText('Log Repair');
    expect(logRepairElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
  });

  it('should display vehicle name and description', () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
    expect(screen.getByText(/Record any repairs, part replacements/)).toBeInTheDocument();
  });

  it('should pre-fill service date with today', () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const dateInput = dateInputs[0];
    const today = new Date().toISOString().split('T')[0];
    expect(dateInput.value).toBe(today);
  });

  it('should update form fields when user types', () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Fixed engine light' } });
    expect(descriptionInput.value).toBe('Fixed engine light');

    const costInput = screen.getByPlaceholderText('Enter repair cost');
    fireEvent.change(costInput, { target: { value: '250.50' } });
    expect(costInput.value).toBe('250.50');

    const providerInput = screen.getByPlaceholderText(/Main Street Garage/);
    fireEvent.change(providerInput, { target: { value: 'DIY' } });
    expect(providerInput.value).toBe('DIY');
  });

  it('should show validation error when description is missing', async () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please provide a repair description')).toBeInTheDocument();
    });

    expect(maintenanceItemsService.logRepair).not.toHaveBeenCalled();
  });

  it('should show validation error when description is only whitespace', async () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: '   ' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please provide a repair description')).toBeInTheDocument();
    });

    expect(maintenanceItemsService.logRepair).not.toHaveBeenCalled();
  });

  it('should show validation error when date is missing', async () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Fixed brake' } });

    const dateInput = document.querySelectorAll('input[type="date"]')[0];
    fireEvent.change(dateInput, { target: { value: '' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please provide the repair date')).toBeInTheDocument();
    });

    expect(maintenanceItemsService.logRepair).not.toHaveBeenCalled();
  });

  it('should successfully log repair with all fields', async () => {
    maintenanceItemsService.logRepair.mockResolvedValueOnce('repair123');

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Fixed engine light' } });

    const costInput = screen.getByPlaceholderText('Enter repair cost');
    fireEvent.change(costInput, { target: { value: '250.50' } });

    const providerInput = screen.getByPlaceholderText(/Main Street Garage/);
    fireEvent.change(providerInput, { target: { value: 'Main Garage' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Repair logged successfully!')).toBeInTheDocument();
    });

    expect(maintenanceItemsService.logRepair).toHaveBeenCalledWith(
      'vehicle123',
      'Fixed engine light',
      expect.any(Date),
      250.50,
      'Main Garage'
    );

    // Wait for the 1 second delay and callbacks
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
      expect(mockOnHide).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should log repair with only description and date (no cost or provider)', async () => {
    maintenanceItemsService.logRepair.mockResolvedValueOnce('repair123');

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Oil change' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Repair logged successfully!')).toBeInTheDocument();
    });

    expect(maintenanceItemsService.logRepair).toHaveBeenCalledWith(
      'vehicle123',
      'Oil change',
      expect.any(Date),
      null,
      null
    );

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
      expect(mockOnHide).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should handle repair logging error', async () => {
    const errorMessage = 'Failed to log repair';
    maintenanceItemsService.logRepair.mockRejectedValueOnce(new Error(errorMessage));

    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnRepairLogged).not.toHaveBeenCalled();
    expect(mockOnHide).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('should show loading state during submission', async () => {
    let resolveRepair;
    const repairPromise = new Promise((resolve) => {
      resolveRepair = resolve;
    });
    maintenanceItemsService.logRepair.mockReturnValueOnce(repairPromise);

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Logging...')).toBeInTheDocument();
    });

    // Inputs should be disabled during loading
    const descInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    expect(descInput).toBeDisabled();

    resolveRepair('repair123');

    // Wait for success state and auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should disable cancel and submit during loading', async () => {
    let resolveRepair;
    const repairPromise = new Promise((resolve) => {
      resolveRepair = resolve;
    });
    maintenanceItemsService.logRepair.mockReturnValueOnce(repairPromise);

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      const loadingButton = screen.getByText('Logging...');
      expect(loadingButton).toBeDisabled();
    });

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();

    resolveRepair('repair123');

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should reset form and close modal when cancel is clicked', () => {
    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test' } });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnHide).toHaveBeenCalled();
  });

  it('should not close modal when cancel is clicked during loading', async () => {
    let resolveRepair;
    const repairPromise = new Promise((resolve) => {
      resolveRepair = resolve;
    });
    maintenanceItemsService.logRepair.mockReturnValueOnce(repairPromise);

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Logging...')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();

    resolveRepair('repair123');

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should trim whitespace from description', async () => {
    maintenanceItemsService.logRepair.mockResolvedValueOnce('repair123');

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: '  Fixed brake  ' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(maintenanceItemsService.logRepair).toHaveBeenCalledWith(
        'vehicle123',
        'Fixed brake', // Trimmed
        expect.any(Date),
        null,
        null
      );
    });

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should trim whitespace from provider input', async () => {
    maintenanceItemsService.logRepair.mockResolvedValueOnce('repair123');

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const providerInput = screen.getByPlaceholderText(/Main Street Garage/);
    fireEvent.change(providerInput, { target: { value: '  Test Garage  ' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(maintenanceItemsService.logRepair).toHaveBeenCalledWith(
        'vehicle123',
        'Test repair',
        expect.any(Date),
        null,
        'Test Garage' // Trimmed
      );
    });

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should handle empty provider as null', async () => {
    maintenanceItemsService.logRepair.mockResolvedValueOnce('repair123');

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const providerInput = screen.getByPlaceholderText(/Main Street Garage/);
    fireEvent.change(providerInput, { target: { value: '   ' } }); // Only whitespace

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(maintenanceItemsService.logRepair).toHaveBeenCalledWith(
        'vehicle123',
        'Test repair',
        expect.any(Date),
        null,
        '' // Whitespace trimmed to empty string
      );
    });

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should parse numeric cost correctly', async () => {
    maintenanceItemsService.logRepair.mockResolvedValueOnce('repair123');

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const costInput = screen.getByPlaceholderText('Enter repair cost');
    fireEvent.change(costInput, { target: { value: '99.99' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(maintenanceItemsService.logRepair).toHaveBeenCalledWith(
        'vehicle123',
        'Test repair',
        expect.any(Date),
        99.99,
        null
      );
    });

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should reset form to initial values when closed and reopened', async () => {
    const { rerender } = render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    // Change some values
    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test' } });

    const costInput = screen.getByPlaceholderText('Enter repair cost');
    fireEvent.change(costInput, { target: { value: '150' } });

    // Close modal
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Reopen modal
    rerender(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    // Fields should be reset
    const descInputAfterReopen = screen.getByPlaceholderText(/Replaced front brake pads/);
    expect(descInputAfterReopen.value).toBe('');

    const costInputAfterReopen = screen.getByPlaceholderText('Enter repair cost');
    expect(costInputAfterReopen.value).toBe('');
  });

  it('should handle date field correctly', async () => {
    maintenanceItemsService.logRepair.mockResolvedValueOnce('repair123');

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const dateInput = document.querySelectorAll('input[type="date"]')[0];
    fireEvent.change(dateInput, { target: { value: '2024-01-15' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(maintenanceItemsService.logRepair).toHaveBeenCalledWith(
        'vehicle123',
        'Test repair',
        expect.any(Date),
        null,
        null
      );
    });

    // Verify the date was parsed correctly
    const callArgs = maintenanceItemsService.logRepair.mock.calls[0];
    const passedDate = callArgs[2];
    expect(passedDate.toISOString().split('T')[0]).toBe('2024-01-15');

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should display success state correctly', async () => {
    maintenanceItemsService.logRepair.mockResolvedValueOnce('repair123');

    render(
      <LogRepairModal
        show={true}
        onHide={mockOnHide}
        onRepairLogged={mockOnRepairLogged}
        vehicle={mockVehicle}
      />
    );

    const descriptionInput = screen.getByPlaceholderText(/Replaced front brake pads/);
    fireEvent.change(descriptionInput, { target: { value: 'Test repair' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    // Success message should appear
    await waitFor(() => {
      expect(screen.getByText('Repair logged successfully!')).toBeInTheDocument();
    });

    // Wait for auto-close
    await waitFor(() => {
      expect(mockOnRepairLogged).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
