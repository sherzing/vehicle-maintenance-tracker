import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetVehicleHistoryModal from './ResetVehicleHistoryModal';
import * as resetVehicleHistory from '../../services/firebase/resetVehicleHistory';

// Mock the resetVehicleHistory service
vi.mock('../../services/firebase/resetVehicleHistory', () => ({
  resetVehicleHistory: vi.fn(),
}));

describe('ResetVehicleHistoryModal', () => {
  const mockVehicle = {
    id: 'vehicle123',
    name: 'Test Vehicle',
    type: 'car',
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    current_usage: 50000,
  };

  const mockOnHide = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    return render(
      <ResetVehicleHistoryModal
        show={true}
        onHide={mockOnHide}
        onComplete={mockOnComplete}
        vehicle={mockVehicle}
        {...props}
      />
    );
  };

  describe('Modal Display', () => {
    it('should render modal when show is true', () => {
      renderModal();

      expect(screen.getByText(/reset vehicle history/i)).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      renderModal({ show: false });

      expect(screen.queryByText(/reset vehicle history/i)).not.toBeInTheDocument();
    });

    it('should not render when vehicle is null', () => {
      renderModal({ vehicle: null });

      expect(screen.queryByText(/reset vehicle history/i)).not.toBeInTheDocument();
    });

    it('should display warning message explaining what will be reset', () => {
      renderModal();

      expect(screen.getByText(/this action will permanently delete/i)).toBeInTheDocument();
      expect(screen.getAllByText(/service history/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/usage history/i).length).toBeGreaterThan(0);
    });

    it('should display what will be preserved', () => {
      renderModal();

      expect(screen.getByText(/maintenance intervals\/schedules.*but reset to.*never serviced/i)).toBeInTheDocument();
    });

    it('should display vehicle name in explanation', () => {
      renderModal();

      expect(screen.getAllByText(/Test Vehicle/i).length).toBeGreaterThan(0);
    });
  });

  describe('Confirmation Input', () => {
    it('should display input field for vehicle name confirmation', () => {
      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      expect(input).toBeInTheDocument();
    });

    it('should show label instructing user to type vehicle name', () => {
      renderModal();

      const label = screen.getByLabelText(/type.*to confirm/i);
      expect(label).toBeInTheDocument();
    });

    it('should disable confirm button when input is empty', () => {
      renderModal();

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should disable confirm button when input does not match vehicle name', () => {
      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Wrong Name' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should enable confirm button when input matches vehicle name exactly', () => {
      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      expect(confirmButton).not.toBeDisabled();
    });

    it('should be case-sensitive when matching vehicle name', () => {
      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'test vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should not allow extra whitespace to match', () => {
      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: ' Test Vehicle ' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Reset Functionality', () => {
    it('should call resetVehicleHistory when confirm button is clicked', async () => {
      resetVehicleHistory.resetVehicleHistory.mockResolvedValue({
        success: true,
        serviceHistoryDeleted: 10,
        usageHistoryDeleted: 5,
        maintenanceItemsReset: 3,
      });

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(resetVehicleHistory.resetVehicleHistory).toHaveBeenCalledWith('vehicle123', { keepMaintenanceItems: true });
      });
    });

    it('should show loading state during reset', async () => {
      resetVehicleHistory.resetVehicleHistory.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/resetting/i)).toBeInTheDocument();
      });
    });

    it('should disable buttons during reset', async () => {
      resetVehicleHistory.resetVehicleHistory.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });
    });

    it('should show success message after successful reset', async () => {
      resetVehicleHistory.resetVehicleHistory.mockResolvedValue({
        success: true,
        serviceHistoryDeleted: 10,
        usageHistoryDeleted: 5,
        maintenanceItemsReset: 3,
      });

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/successfully reset vehicle history/i)).toBeInTheDocument();
      });
    });

    it('should display reset counts in success message', async () => {
      resetVehicleHistory.resetVehicleHistory.mockResolvedValue({
        success: true,
        serviceHistoryDeleted: 10,
        usageHistoryDeleted: 5,
        maintenanceItemsReset: 3,
      });

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/10.*service.*5.*usage/i)).toBeInTheDocument();
        expect(screen.getByText(/3.*maintenance.*never serviced/i)).toBeInTheDocument();
      });
    });

    it('should call onComplete after successful reset', async () => {
      resetVehicleHistory.resetVehicleHistory.mockResolvedValue({
        success: true,
        serviceHistoryDeleted: 10,
        usageHistoryDeleted: 5,
        maintenanceItemsReset: 3,
      });

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('should call onHide after successful reset and delay', async () => {
      resetVehicleHistory.resetVehicleHistory.mockResolvedValue({
        success: true,
        serviceHistoryDeleted: 10,
        usageHistoryDeleted: 5,
        maintenanceItemsReset: 3,
      });

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(
        () => {
          expect(mockOnHide).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should show error message on reset failure', async () => {
      resetVehicleHistory.resetVehicleHistory.mockRejectedValue(new Error('Permission denied'));

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
      });
    });

    it('should display error details in error message', async () => {
      resetVehicleHistory.resetVehicleHistory.mockRejectedValue(new Error('Network error'));

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should not call onComplete on error', async () => {
      resetVehicleHistory.resetVehicleHistory.mockRejectedValue(new Error('Permission denied'));

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
      });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('should re-enable buttons after error', async () => {
      resetVehicleHistory.resetVehicleHistory.mockRejectedValue(new Error('Permission denied'));

      renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
      });

      expect(confirmButton).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onHide when cancel button is clicked', () => {
      renderModal();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnHide).toHaveBeenCalled();
    });

    it('should reset input field when modal is closed and reopened', () => {
      const { rerender } = renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      expect(input).toHaveValue('Test Vehicle');

      // Close modal
      rerender(
        <ResetVehicleHistoryModal
          show={false}
          onHide={mockOnHide}
          onComplete={mockOnComplete}
          vehicle={mockVehicle}
        />
      );

      // Reopen modal
      rerender(
        <ResetVehicleHistoryModal
          show={true}
          onHide={mockOnHide}
          onComplete={mockOnComplete}
          vehicle={mockVehicle}
        />
      );

      const newInput = screen.getByPlaceholderText(/type vehicle name/i);
      expect(newInput).toHaveValue('');
    });

    it('should clear error message when modal is reopened', () => {
      resetVehicleHistory.resetVehicleHistory.mockRejectedValue(new Error('Error'));

      const { rerender } = renderModal();

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      // Wait for error
      waitFor(() => {
        expect(screen.getByText(/failed to reset/i)).toBeInTheDocument();
      });

      // Close and reopen
      rerender(
        <ResetVehicleHistoryModal
          show={false}
          onHide={mockOnHide}
          onComplete={mockOnComplete}
          vehicle={mockVehicle}
        />
      );

      rerender(
        <ResetVehicleHistoryModal
          show={true}
          onHide={mockOnHide}
          onComplete={mockOnComplete}
          vehicle={mockVehicle}
        />
      );

      expect(screen.queryByText(/failed to reset/i)).not.toBeInTheDocument();
    });
  });

  describe('Warning Indicators', () => {
    it('should display danger variant for destructive action', () => {
      renderModal();

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      expect(confirmButton).toHaveClass('btn-danger');
    });

    it('should display warning icon or color', () => {
      renderModal();

      const warnings = screen.getAllByText(/⚠️|warning/i);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should emphasize that action is permanent', () => {
      renderModal();

      const permanentTexts = screen.getAllByText(/cannot be undone|permanent/i);
      expect(permanentTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Keep Maintenance Items Checkbox', () => {
    it('should display checkbox for keeping maintenance schedules', () => {
      renderModal();

      const checkbox = screen.getByLabelText(/keep maintenance schedules/i);
      expect(checkbox).toBeInTheDocument();
    });

    it('should have checkbox checked by default', () => {
      renderModal();

      const checkbox = screen.getByLabelText(/keep maintenance schedules/i);
      expect(checkbox).toBeChecked();
    });

    it('should allow unchecking the checkbox', () => {
      renderModal();

      const checkbox = screen.getByLabelText(/keep maintenance schedules/i);
      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();
    });

    it('should call resetVehicleHistory with keepMaintenanceItems false when unchecked', async () => {
      resetVehicleHistory.resetVehicleHistory.mockResolvedValue({
        success: true,
        serviceHistoryDeleted: 10,
        usageHistoryDeleted: 5,
        maintenanceItemsReset: 0,
      });

      renderModal();

      const checkbox = screen.getByLabelText(/keep maintenance schedules/i);
      fireEvent.click(checkbox);

      const input = screen.getByPlaceholderText(/type vehicle name/i);
      fireEvent.change(input, { target: { value: 'Test Vehicle' } });

      const confirmButton = screen.getByRole('button', { name: /reset history/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(resetVehicleHistory.resetVehicleHistory).toHaveBeenCalledWith('vehicle123', { keepMaintenanceItems: false });
      });
    });

    it('should update help text when checkbox is unchecked', () => {
      renderModal();

      const checkbox = screen.getByLabelText(/keep maintenance schedules/i);
      fireEvent.click(checkbox);

      expect(screen.getByText(/all maintenance items and schedules will be permanently deleted/i)).toBeInTheDocument();
    });

    it('should update help text when checkbox is checked', () => {
      renderModal();

      expect(screen.getByText(/maintenance intervals will be preserved but marked as never serviced/i)).toBeInTheDocument();
    });

    it('should hide maintenance items from reset list when checkbox is unchecked', () => {
      renderModal();

      const checkbox = screen.getByLabelText(/keep maintenance schedules/i);
      fireEvent.click(checkbox);

      expect(screen.queryByText(/all maintenance items will be marked as.*never serviced/i)).not.toBeInTheDocument();
    });

    it('should hide maintenance schedules from preserved list when checkbox is unchecked', () => {
      renderModal();

      const checkbox = screen.getByLabelText(/keep maintenance schedules/i);
      fireEvent.click(checkbox);

      expect(screen.queryByText(/maintenance intervals\/schedules/i)).not.toBeInTheDocument();
    });

    it('should reset checkbox state when modal is closed and reopened', () => {
      const { rerender } = renderModal();

      const checkbox = screen.getByLabelText(/keep maintenance schedules/i);
      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();

      // Close modal
      rerender(
        <ResetVehicleHistoryModal
          show={false}
          onHide={mockOnHide}
          onComplete={mockOnComplete}
          vehicle={mockVehicle}
        />
      );

      // Reopen modal
      rerender(
        <ResetVehicleHistoryModal
          show={true}
          onHide={mockOnHide}
          onComplete={mockOnComplete}
          vehicle={mockVehicle}
        />
      );

      const newCheckbox = screen.getByLabelText(/keep maintenance schedules/i);
      expect(newCheckbox).toBeChecked();
    });
  });
});
