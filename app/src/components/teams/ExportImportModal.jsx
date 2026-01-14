import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import {
  exportTeamData,
  importTeamData,
  downloadExportData,
  readImportFile,
  validateImportData,
} from '../../services/firebase/teamDataExport';

export default function ExportImportModal({ show, onHide, team, onImportComplete }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importMode, setImportMode] = useState('full');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await exportTeamData(team.id);
      const filename = `${team.name.replace(/[^a-z0-9]/gi, '-')}-export-${new Date().toISOString().split('T')[0]}.json`;
      downloadExportData(data, filename);
      setSuccess(`Successfully exported ${data.vehicles.length} vehicle(s) with complete history.`);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export team data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setValidationErrors([]);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setValidationErrors([]);

    // Validate file
    try {
      const data = await readImportFile(file);
      const validation = validateImportData(data);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setError('Import file has validation errors. Please check the errors below.');
      } else {
        setSuccess(`File validated successfully. Found ${data.vehicles.length} vehicle(s) to import.`);
      }
    } catch (err) {
      setError('Invalid file format. Please select a valid export JSON file.');
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await readImportFile(selectedFile);
      const result = await importTeamData(team.id, data, importMode, user.uid, { overwriteExisting });

      let successMessage = `Successfully imported ${result.vehiclesImported} vehicle(s)`;

      if (result.vehiclesSkipped > 0) {
        successMessage += `, skipped ${result.vehiclesSkipped} existing vehicle(s)`;
      }
      if (result.vehiclesReplaced > 0) {
        successMessage += `, replaced ${result.vehiclesReplaced} existing vehicle(s)`;
      }

      successMessage += `, ${result.maintenanceItemsImported} maintenance item(s), ` +
        `${result.serviceHistoryImported} service record(s), and ` +
        `${result.usageHistoryImported} usage record(s).`;

      setSuccess(successMessage);

      // Reset form
      setSelectedFile(null);
      setValidationErrors([]);
      setOverwriteExisting(false);
      document.getElementById('import-file-input').value = '';

      // Notify parent to reload data
      setTimeout(() => {
        onImportComplete();
        onHide();
      }, 2000);
    } catch (err) {
      console.error('Import failed:', err);
      setError(err.message || 'Failed to import team data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(null);
      setSelectedFile(null);
      setValidationErrors([]);
      onHide();
    }
  };

  if (!team) return null;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Export / Import Team Data</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {validationErrors.length > 0 && (
          <Alert variant="warning">
            <strong>Validation Errors:</strong>
            <ul className="mb-0 mt-2">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Export Section */}
        <div className="mb-4">
          <h5>Export Data</h5>
          <p className="text-muted">
            Download all vehicles, maintenance schedules, service history, and usage logs for <strong>{team.name}</strong> as a JSON file.
          </p>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Exporting...
              </>
            ) : (
              <>
                📥 Export Team Data
              </>
            )}
          </Button>
        </div>

        <hr />

        {/* Import Section */}
        <div>
          <h5>Import Data</h5>
          <p className="text-muted">
            Import vehicles and their complete history from a previously exported JSON file.
          </p>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="import-mode-select">What to Import</Form.Label>
            <Form.Select
              id="import-mode-select"
              value={importMode}
              onChange={(e) => setImportMode(e.target.value)}
              disabled={loading}
            >
              <option value="full">Everything (recommended)</option>
              <option value="vehicle-maintenance-items">Vehicle + Maintenance Schedules Only</option>
              <option value="vehicle-maintenance">Vehicle + Maintenance (no usage history)</option>
              <option value="vehicle-only">Vehicle Data Only (no maintenance or history)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              {importMode === 'full' && 'Import complete vehicle data including all maintenance items, service history, and usage history'}
              {importMode === 'vehicle-maintenance-items' && 'Import vehicle info and maintenance interval schedules only (no service or usage history)'}
              {importMode === 'vehicle-maintenance' && 'Import vehicle info, maintenance schedules, and service history (no usage history)'}
              {importMode === 'vehicle-only' && 'Import only vehicle information (no maintenance schedules or history)'}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="overwrite-existing-check"
              label="Overwrite existing vehicles with same VIN"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              {overwriteExisting
                ? 'WARNING: This will delete and replace any existing vehicles that have the same VIN as vehicles in the import file.'
                : 'Vehicles with VINs that already exist in this team will be skipped.'}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="import-file-input">Select Import File</Form.Label>
            <Form.Control
              id="import-file-input"
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              Choose a JSON file previously exported from this application.
            </Form.Text>
          </Form.Group>

          <Button
            variant="success"
            onClick={handleImport}
            disabled={loading || !selectedFile || validationErrors.length > 0}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Importing...
              </>
            ) : (
              <>
                📤 Import Data
              </>
            )}
          </Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
