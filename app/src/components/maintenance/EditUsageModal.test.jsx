import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import EditUsageModal from './EditUsageModal';
import * as usageHistoryService from '../../services/firebase/usageHistory';
import { rateLimiter } from '../../utils/rateLimiter';

vi.mock('../../services/firebase/usageHistory');

describe('EditUsageModal', () => {
  const mockOnHide = vi.fn();
  const mockOnUsageUpdated = vi.fn();
  const mockUsageEntry = {
    id: 'usage123',
    usage: 50000,
    date: new Date('2024-01-15'),
    usage_type: 'track day',
    location: 'Laguna Seca',
    version: 1,
  };
  const mockUser = {
    uid: 'user123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter.clearAll(); // Clear rate limiter state between tests
  });

  it('should not render when show is false', () => {
    render(
      <EditUsageModal
        show={false}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    expect(screen.queryByText('Edit Usage Entry')).not.toBeInTheDocument();
  });

  it('should render when show is true', () => {
    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    expect(screen.getByText('Edit Usage Entry')).toBeInTheDocument();
  });

  it('should populate form with existing usage data', () => {
    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    const dateInput = screen.getByLabelText(/Date/);
    const usageTypeInput = screen.getByLabelText(/Usage Type/);
    const locationInput = screen.getByLabelText(/Location/);

    expect(usageInput.value).toBe('50000');
    expect(dateInput.value).toBe('2024-01-15');
    expect(usageTypeInput.value).toBe('track day');
    expect(locationInput.value).toBe('Laguna Seca');
  });

  it('should handle Firestore Timestamp for date', () => {
    const entryWithTimestamp = {
      ...mockUsageEntry,
      date: { toDate: () => new Date('2024-01-20') },
    };

    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={entryWithTimestamp}
        usageUnit="km"
        user={mockUser}
      />
    );

    const dateInput = screen.getByLabelText(/Date/);
    expect(dateInput.value).toBe('2024-01-20');
  });

  it('should show error when submitting empty usage', async () => {
    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    fireEvent.change(usageInput, { target: { value: '' } });

    // Submit form directly to bypass HTML5 validation
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Please provide a valid usage value/i)).toBeInTheDocument();
    });
  });

  it('should show error when date is in future', async () => {
    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    const dateInput = screen.getByLabelText(/Date/);
    fireEvent.change(dateInput, { target: { value: tomorrowString } });

    // Submit form directly to bypass HTML5 validation
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Date cannot be in the future/i)).toBeInTheDocument();
    });
  });

  it('should successfully update usage entry', async () => {
    usageHistoryService.updateUsageHistory.mockResolvedValue();

    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    const usageTypeInput = screen.getByLabelText(/Usage Type/);

    fireEvent.change(usageInput, { target: { value: '52000' } });
    fireEvent.change(usageTypeInput, { target: { value: 'road trip' } });

    // Submit form
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(usageHistoryService.updateUsageHistory).toHaveBeenCalledWith(
        'usage123',
        52000,
        new Date('2024-01-15'),
        'road trip',
        'Laguna Seca',
        'user123',
        1 // version
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Usage updated successfully/i)).toBeInTheDocument();
    });
  });

  it('should handle null optional fields', async () => {
    const entryWithoutOptionals = {
      id: 'usage456',
      usage: 45000,
      date: new Date('2024-01-10'),
      usage_type: null,
      location: null,
      version: 2,
    };

    usageHistoryService.updateUsageHistory.mockResolvedValue();

    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={entryWithoutOptionals}
        usageUnit="km"
        user={mockUser}
      />
    );

    const usageTypeInput = screen.getByLabelText(/Usage Type/);
    const locationInput = screen.getByLabelText(/Location/);

    expect(usageTypeInput.value).toBe('');
    expect(locationInput.value).toBe('');
  });

  it('should handle update error gracefully', async () => {
    usageHistoryService.updateUsageHistory.mockRejectedValue(new Error('Update failed'));

    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    // Submit form
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      // Error message is sanitized - expect generic update error
      expect(screen.getByText(/Unable to update resource/i)).toBeInTheDocument();
    });

    expect(mockOnUsageUpdated).not.toHaveBeenCalled();
  });

  it('should call onHide when cancel is clicked', () => {
    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnHide).toHaveBeenCalled();
  });

  it('should display usage unit as hours when specified', () => {
    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="hours"
      />
    );

    expect(screen.getByLabelText(/Usage \(hours\)/)).toBeInTheDocument();
  });

  it('should support decimal usage values', async () => {
    usageHistoryService.updateUsageHistory.mockResolvedValue();

    render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={mockUsageEntry}
        usageUnit="km"
        user={mockUser}
      />
    );

    const usageInput = screen.getByLabelText(/Usage \(km\)/);
    fireEvent.change(usageInput, { target: { value: '50000.5' } });

    // Submit form
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(usageHistoryService.updateUsageHistory).toHaveBeenCalledWith(
        'usage123',
        50000.5,
        expect.any(Date),
        'track day',
        'Laguna Seca',
        'user123',
        1 // version
      );
    });
  });

  it('should not render when usageEntry is null', () => {
    const { container } = render(
      <EditUsageModal
        show={true}
        onHide={mockOnHide}
        onUsageUpdated={mockOnUsageUpdated}
        usageEntry={null}
        usageUnit="km"
        user={mockUser}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
