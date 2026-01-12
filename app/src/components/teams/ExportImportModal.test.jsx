import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportImportModal from './ExportImportModal';
import * as teamDataExport from '../../services/firebase/teamDataExport';
import * as AuthContext from '../../contexts/AuthContext';

// Mock the teamDataExport service
vi.mock('../../services/firebase/teamDataExport', () => ({
  exportTeamData: vi.fn(),
  importTeamData: vi.fn(),
  downloadExportData: vi.fn(),
  readImportFile: vi.fn(),
  validateImportData: vi.fn(),
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ExportImportModal', () => {
  const mockTeam = {
    id: 'team123',
    name: 'Test Team',
  };

  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
  };

  const mockOnHide = vi.fn();
  const mockOnImportComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    AuthContext.useAuth.mockReturnValue({ user: mockUser });
  });

  const renderModal = (props = {}) => {
    return render(
      <ExportImportModal
        show={true}
        onHide={mockOnHide}
        team={mockTeam}
        onImportComplete={mockOnImportComplete}
        {...props}
      />
    );
  };

  describe('Export Functionality', () => {
    it('should display export section with button', () => {
      renderModal();

      expect(screen.getByText(/export data/i)).toBeInTheDocument();
      expect(screen.getByText(/📥 export team data/i)).toBeInTheDocument();
    });

    it('should call exportTeamData when export button is clicked', async () => {
      const mockExportData = {
        teamId: 'team123',
        exportDate: '2024-01-01',
        vehicles: [{ vehicleData: { name: 'Car 1' } }],
      };

      teamDataExport.exportTeamData.mockResolvedValue(mockExportData);
      teamDataExport.downloadExportData.mockImplementation(() => {});

      renderModal();

      const exportButton = screen.getByText(/📥 export team data/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(teamDataExport.exportTeamData).toHaveBeenCalledWith('team123');
      });
    });

    it('should trigger download after successful export', async () => {
      const mockExportData = {
        teamId: 'team123',
        exportDate: '2024-01-01T00:00:00.000Z',
        vehicles: [{ vehicleData: { name: 'Car 1' } }],
      };

      teamDataExport.exportTeamData.mockResolvedValue(mockExportData);
      teamDataExport.downloadExportData.mockImplementation(() => {});

      renderModal();

      const exportButton = screen.getByText(/📥 export team data/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(teamDataExport.downloadExportData).toHaveBeenCalledWith(
          mockExportData,
          expect.stringContaining('Test-Team-export-')
        );
      });
    });

    it('should show success message after export', async () => {
      const mockExportData = {
        teamId: 'team123',
        exportDate: '2024-01-01',
        vehicles: [{ vehicleData: { name: 'Car 1' } }, { vehicleData: { name: 'Car 2' } }],
      };

      teamDataExport.exportTeamData.mockResolvedValue(mockExportData);
      teamDataExport.downloadExportData.mockImplementation(() => {});

      renderModal();

      const exportButton = screen.getByText(/📥 export team data/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/successfully exported 2 vehicle\(s\)/i)).toBeInTheDocument();
      });
    });

    it('should show error message on export failure', async () => {
      teamDataExport.exportTeamData.mockRejectedValue(new Error('Export failed'));

      renderModal();

      const exportButton = screen.getByText(/📥 export team data/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });

    it('should disable buttons during export', async () => {
      teamDataExport.exportTeamData.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderModal();

      const exportButton = screen.getByText(/📥 export team data/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/exporting\.\.\./i)).toBeInTheDocument();
      });
    });
  });

  describe('Import Functionality', () => {
    it('should display import section with file input', () => {
      renderModal();

      expect(screen.getByRole('heading', { name: /import data/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/select import file/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📤 import data/i })).toBeInTheDocument();
    });

    it('should display import mode selector', () => {
      renderModal();

      const modeSelector = screen.getByLabelText(/import mode/i);
      expect(modeSelector).toBeInTheDocument();
      expect(screen.getByText(/create as new vehicles/i)).toBeInTheDocument();
    });

    it('should validate file on selection', async () => {
      const mockFileData = {
        teamId: 'team123',
        exportDate: '2024-01-01',
        vehicles: [{ vehicleData: { name: 'Car 1', type: 'car', make: 'Toyota', model: 'Camry', year: 2020 }, maintenanceItems: [], serviceHistory: [], usageHistory: [] }],
      };

      teamDataExport.readImportFile.mockResolvedValue(mockFileData);
      teamDataExport.validateImportData.mockReturnValue({ valid: true, errors: [] });

      renderModal();

      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File([JSON.stringify(mockFileData)], 'export.json', { type: 'application/json' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(teamDataExport.readImportFile).toHaveBeenCalledWith(file);
        expect(teamDataExport.validateImportData).toHaveBeenCalledWith(mockFileData);
      });
    });

    it('should show validation success message', async () => {
      const mockFileData = {
        teamId: 'team123',
        exportDate: '2024-01-01',
        vehicles: [{ vehicleData: { name: 'Car 1', type: 'car', make: 'Toyota', model: 'Camry', year: 2020 }, maintenanceItems: [], serviceHistory: [], usageHistory: [] }],
      };

      teamDataExport.readImportFile.mockResolvedValue(mockFileData);
      teamDataExport.validateImportData.mockReturnValue({ valid: true, errors: [] });

      renderModal();

      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File([JSON.stringify(mockFileData)], 'export.json', { type: 'application/json' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/file validated successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/found 1 vehicle\(s\) to import/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors', async () => {
      const mockFileData = {
        teamId: 'team123',
        vehicles: [{ vehicleData: { name: 'Car 1' } }],
      };

      teamDataExport.readImportFile.mockResolvedValue(mockFileData);
      teamDataExport.validateImportData.mockReturnValue({
        valid: false,
        errors: ['Vehicle 0: Missing type', 'Vehicle 0: Missing make'],
      });

      renderModal();

      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File([JSON.stringify(mockFileData)], 'export.json', { type: 'application/json' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/validation errors:/i)).toBeInTheDocument();
        expect(screen.getByText(/vehicle 0: missing type/i)).toBeInTheDocument();
        expect(screen.getByText(/vehicle 0: missing make/i)).toBeInTheDocument();
      });
    });

    it('should disable import button when no file selected', () => {
      renderModal();

      const importButton = screen.getByText(/📤 import data/i);
      expect(importButton).toBeDisabled();
    });

    it('should disable import button when validation errors exist', async () => {
      const mockFileData = {
        teamId: 'team123',
        vehicles: [],
      };

      teamDataExport.readImportFile.mockResolvedValue(mockFileData);
      teamDataExport.validateImportData.mockReturnValue({
        valid: false,
        errors: ['Missing or invalid vehicles array'],
      });

      renderModal();

      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File([JSON.stringify(mockFileData)], 'export.json', { type: 'application/json' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const importButton = screen.getByText(/📤 import data/i);
        expect(importButton).toBeDisabled();
      });
    });

    it('should call importTeamData with correct parameters', async () => {
      const mockFileData = {
        teamId: 'team123',
        exportDate: '2024-01-01',
        vehicles: [{ vehicleData: { name: 'Car 1', type: 'car', make: 'Toyota', model: 'Camry', year: 2020 }, maintenanceItems: [], serviceHistory: [], usageHistory: [] }],
      };

      const mockImportResult = {
        success: true,
        vehiclesImported: 1,
        maintenanceItemsImported: 2,
        serviceHistoryImported: 3,
        usageHistoryImported: 4,
      };

      teamDataExport.readImportFile.mockResolvedValue(mockFileData);
      teamDataExport.validateImportData.mockReturnValue({ valid: true, errors: [] });
      teamDataExport.importTeamData.mockResolvedValue(mockImportResult);

      renderModal();

      // Select file
      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File([JSON.stringify(mockFileData)], 'export.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/file validated successfully/i)).toBeInTheDocument();
      });

      // Click import
      const importButton = screen.getByText(/📤 import data/i);
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(teamDataExport.importTeamData).toHaveBeenCalledWith(
          'team123',
          mockFileData,
          'new',
          'user123'
        );
      });
    });

    it('should show success message after import', async () => {
      const mockFileData = {
        teamId: 'team123',
        exportDate: '2024-01-01',
        vehicles: [{ vehicleData: { name: 'Car 1', type: 'car', make: 'Toyota', model: 'Camry', year: 2020 }, maintenanceItems: [], serviceHistory: [], usageHistory: [] }],
      };

      const mockImportResult = {
        success: true,
        vehiclesImported: 1,
        maintenanceItemsImported: 2,
        serviceHistoryImported: 3,
        usageHistoryImported: 4,
      };

      teamDataExport.readImportFile.mockResolvedValue(mockFileData);
      teamDataExport.validateImportData.mockReturnValue({ valid: true, errors: [] });
      teamDataExport.importTeamData.mockResolvedValue(mockImportResult);

      renderModal();

      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File([JSON.stringify(mockFileData)], 'export.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/file validated successfully/i)).toBeInTheDocument();
      });

      const importButton = screen.getByText(/📤 import data/i);
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/successfully imported 1 vehicle\(s\)/i)).toBeInTheDocument();
        expect(screen.getByText(/2 maintenance item\(s\)/i)).toBeInTheDocument();
        expect(screen.getByText(/3 service record\(s\)/i)).toBeInTheDocument();
        expect(screen.getByText(/4 usage record\(s\)/i)).toBeInTheDocument();
      });
    });

    it('should call onImportComplete after successful import', async () => {
      const mockFileData = {
        teamId: 'team123',
        exportDate: '2024-01-01',
        vehicles: [{ vehicleData: { name: 'Car 1', type: 'car', make: 'Toyota', model: 'Camry', year: 2020 }, maintenanceItems: [], serviceHistory: [], usageHistory: [] }],
      };

      const mockImportResult = {
        success: true,
        vehiclesImported: 1,
        maintenanceItemsImported: 0,
        serviceHistoryImported: 0,
        usageHistoryImported: 0,
      };

      teamDataExport.readImportFile.mockResolvedValue(mockFileData);
      teamDataExport.validateImportData.mockReturnValue({ valid: true, errors: [] });
      teamDataExport.importTeamData.mockResolvedValue(mockImportResult);

      renderModal();

      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File([JSON.stringify(mockFileData)], 'export.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/file validated successfully/i)).toBeInTheDocument();
      });

      const importButton = screen.getByText(/📤 import data/i);
      fireEvent.click(importButton);

      await waitFor(
        () => {
          expect(mockOnImportComplete).toHaveBeenCalled();
          expect(mockOnHide).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('should show error on import failure', async () => {
      const mockFileData = {
        teamId: 'team123',
        exportDate: '2024-01-01',
        vehicles: [{ vehicleData: { name: 'Car 1', type: 'car', make: 'Toyota', model: 'Camry', year: 2020 }, maintenanceItems: [], serviceHistory: [], usageHistory: [] }],
      };

      teamDataExport.readImportFile.mockResolvedValue(mockFileData);
      teamDataExport.validateImportData.mockReturnValue({ valid: true, errors: [] });
      teamDataExport.importTeamData.mockRejectedValue(new Error('Import failed'));

      renderModal();

      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File([JSON.stringify(mockFileData)], 'export.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/file validated successfully/i)).toBeInTheDocument();
      });

      const importButton = screen.getByText(/📤 import data/i);
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/import failed/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid JSON file', async () => {
      teamDataExport.readImportFile.mockRejectedValue(new Error('Invalid JSON file'));

      renderModal();

      const fileInput = screen.getByLabelText(/select import file/i);
      const file = new File(['invalid json'], 'export.json', { type: 'application/json' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/invalid file format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should render when show is true', () => {
      renderModal({ show: true });

      expect(screen.getByText(/export \/ import team data/i)).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      renderModal({ show: false });

      expect(screen.queryByText(/export \/ import team data/i)).not.toBeInTheDocument();
    });

    it('should not render when team is null', () => {
      renderModal({ team: null });

      expect(screen.queryByText(/export \/ import team data/i)).not.toBeInTheDocument();
    });

    it('should call onHide when close button is clicked', () => {
      renderModal();

      const closeButton = screen.getByText(/close/i);
      fireEvent.click(closeButton);

      expect(mockOnHide).toHaveBeenCalled();
    });
  });
});
