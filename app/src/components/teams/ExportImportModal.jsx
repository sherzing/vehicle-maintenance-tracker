import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import {
  exportTeamData,
  importTeamData,
  downloadExportData,
  readImportFile,
  validateImportData,
} from '../../services/firebase/teamDataExport';

export default function ExportImportModal({ show, onHide, team, onImportComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importMode, setImportMode] = useState('new');
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
      const result = await importTeamData(team.id, data, importMode);

      setSuccess(
        `Successfully imported ${result.vehiclesImported} vehicle(s), ` +
        `${result.maintenanceItemsImported} maintenance item(s), ` +
        `${result.serviceHistoryImported} service record(s), and ` +
        `${result.usageHistoryImported} usage record(s).`
      );

      // Reset form
      setSelectedFile(null);
      setValidationErrors([]);
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
            <Form.Label>Import Mode</Form.Label>
            <Form.Select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value)}
              disabled={loading}
            >
              <option value="new">Create as new vehicles (recommended)</option>
              <option value="replace" disabled>Replace existing data (coming soon)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              {importMode === 'new'
                ? 'Imported vehicles will be created as new entries. Existing data will not be affected.'
                : 'This will replace all existing vehicles and their data.'}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Select Import File</Form.Label>
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
