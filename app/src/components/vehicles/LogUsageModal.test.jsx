import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import LogUsageModal from './LogUsageModal';
import * as usageHistoryService from '../../services/firebase/usageHistory';
import { rateLimiter } from '../../utils/rateLimiter';

vi.mock('../../services/firebase/usageHistory');

describe('LogUsageModal', () => {
  const mockOnHide = vi.fn();
  const mockOnUsageLogged = vi.fn();
  const mockVehicle = {
    id: 'vehicle123',
    name: 'Test Vehicle',
    current_usage: 50000,
    usage_unit: 'km',
  };
  const mockUser = {
    uid: 'user123',
  };

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter.clearAll(); // Clear rate limiter state between tests
  });

  it('should not render when show is false', () => {
    render(
      <LogUsageModal
        show={false}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    expect(screen.queryByText('Log Usage')).not.toBeInTheDocument();
  });

  it('should render when show is true', () => {
    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Vehicle')).toBeInTheDocument();
    expect(screen.getByText('Current usage:')).toBeInTheDocument();
    expect(screen.getByText(/50,000/)).toBeInTheDocument();
  });

  it('should have date field defaulted to today', () => {
    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const dateInput = screen.getByLabelText(/Date/);
    expect(dateInput.value).toBe(getTodayString());
  });

  it('should show error when submitting empty usage', async () => {
    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    // Submit form directly to bypass HTML5 validation
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid usage value/i)).toBeInTheDocument();
    });
  });

  it('should show error when date is in future', async () => {
    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    const dateInput = screen.getByLabelText(/Date/);
    const usageInput = screen.getByLabelText(/Usage \(km\)/);

    fireEvent.change(dateInput, { target: { value: tomorrowString } });
    fireEvent.change(usageInput, { target: { value: '55000' } });

    // Submit form directly to bypass HTML5 validation
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Date cannot be in the future/i)).toBeInTheDocument();
    });
  });

  it('should show warning when usage is lower than current for today', async () => {
    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    fireEvent.change(usageInput, { target: { value: '45000' } });

    // Submit form directly
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Lower Usage Detected/i)).toBeInTheDocument();
    });
  });

  it('should successfully log usage with all fields', async () => {
    usageHistoryService.logUsageUpdate.mockResolvedValue('usage123');

    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const dateInput = screen.getByLabelText(/Date/);
    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    const usageTypeInput = screen.getByLabelText(/Usage Type/);
    const locationInput = screen.getByLabelText(/Location/);

    const testDate = '2024-01-15';
    fireEvent.change(dateInput, { target: { value: testDate } });
    fireEvent.change(usageInput, { target: { value: '55000' } });
    fireEvent.change(usageTypeInput, { target: { value: 'track day' } });
    fireEvent.change(locationInput, { target: { value: 'Laguna Seca' } });

    // Submit form
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(usageHistoryService.logUsageUpdate).toHaveBeenCalledWith(
        'vehicle123',
        55000,
        new Date(testDate),
        'track day',
        'Laguna Seca',
        'user123'
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Usage logged successfully/i)).toBeInTheDocument();
    });
  });

  it('should log usage with only required fields', async () => {
    usageHistoryService.logUsageUpdate.mockResolvedValue('usage123');

    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    fireEvent.change(usageInput, { target: { value: '55000' } });

    // Submit form
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(usageHistoryService.logUsageUpdate).toHaveBeenCalledWith(
        'vehicle123',
        55000,
        expect.any(Date),
        null,
        null,
        'user123'
      );
    });
  });

  it('should display usage unit as hours when vehicle uses hours', () => {
    const hourVehicle = { ...mockVehicle, usage_unit: 'hours' };

    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={hourVehicle}
        user={mockUser}
      />
    );

    expect(screen.getByLabelText(/Usage \(hours\)/)).toBeInTheDocument();
  });

  it('should show change amount when usage is entered', () => {
    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    fireEvent.change(usageInput, { target: { value: '55000' } });

    expect(screen.getByText('Change from current:')).toBeInTheDocument();
    expect(screen.getByText(/\+5,000/)).toBeInTheDocument();
  });

  it('should handle service error gracefully', async () => {
    usageHistoryService.logUsageUpdate.mockRejectedValue(new Error('Failed to log'));

    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    fireEvent.change(usageInput, { target: { value: '55000' } });

    // Submit form
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      // Error message is sanitized - expect generic create error
      expect(screen.getByText(/Unable to create resource/i)).toBeInTheDocument();
    });

    expect(mockOnUsageLogged).not.toHaveBeenCalled();
    expect(mockOnHide).not.toHaveBeenCalled();
  });

  it('should call onHide when cancel is clicked', () => {
    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnHide).toHaveBeenCalled();
  });

  it('should support decimal usage values', async () => {
    usageHistoryService.logUsageUpdate.mockResolvedValue('usage123');

    render(
      <LogUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageLogged={mockOnUsageLogged}
        vehicle={mockVehicle}
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    fireEvent.change(usageInput, { target: { value: '55000.5' } });

    // Submit form
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(usageHistoryService.logUsageUpdate).toHaveBeenCalledWith(
        'vehicle123',
        55000.5,
        expect.any(Date),
        null,
        null,
        'user123'
      );
    });
  });
});
