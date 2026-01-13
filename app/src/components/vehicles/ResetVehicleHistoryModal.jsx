import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { resetVehicleHistory } from '../../services/firebase/resetVehicleHistory';

export default function ResetVehicleHistoryModal({ show, onHide, onComplete, vehicle }) {
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (!show) {
      setConfirmationText('');
      setError(null);
      setSuccess(null);
    }
  }, [show]);

  const handleReset = async () => {
    if (confirmationText !== vehicle.name) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await resetVehicleHistory(vehicle.id);

      setSuccess(
        `Successfully reset vehicle history! Deleted ${result.serviceHistoryDeleted} service records, ` +
        `${result.usageHistoryDeleted} usage records, and reset ${result.maintenanceItemsReset} maintenance items.`
      );

      // Call onComplete to refresh vehicle data
      onComplete();

      // Close modal after short delay
      setTimeout(() => {
        onHide();
      }, 2000);
    } catch (err) {
      console.error('Failed to reset vehicle history:', err);
      setError(err.message || 'Failed to reset vehicle history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onHide();
    }
  };

  if (!vehicle) return null;

  const isConfirmationValid = confirmationText === vehicle.name;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton={!loading}>
        <Modal.Title>Reset Vehicle History</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {!success && (
          <>
            <Alert variant="warning">
              <div className="d-flex align-items-center mb-2">
                <span className="me-2" style={{ fontSize: '1.5rem' }}>⚠️</span>
                <strong>Warning: This action cannot be undone</strong>
              </div>
              <p className="mb-0">
                This action will permanently delete all service history and usage history for{' '}
                <strong>{vehicle.name}</strong>.
              </p>
            </Alert>

            <div className="mb-3">
              <h6>What will be reset:</h6>
              <ul>
                <li>Vehicle current usage will be set to 0</li>
                <li>All service history records will be deleted</li>
                <li>All usage history records will be deleted</li>
                <li>All maintenance items will be marked as &quot;never serviced&quot;</li>
              </ul>
            </div>

            <div className="mb-3">
              <h6>What will be preserved:</h6>
              <ul>
                <li>Vehicle details (make, model, year, etc.)</li>
                <li>Maintenance intervals will be preserved</li>
                <li>Team membership and permissions</li>
              </ul>
            </div>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="confirmation-input">
                Type <strong>&quot;{vehicle.name}&quot;</strong> to confirm:
              </Form.Label>
              <Form.Control
                id="confirmation-input"
                type="text"
                placeholder="Type vehicle name to confirm"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
              <Form.Text className="text-muted">
                This confirmation is case-sensitive and must match exactly.
              </Form.Text>
            </Form.Group>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {!success && (
          <Button
            variant="danger"
            onClick={handleReset}
            disabled={!isConfirmationValid || loading}
          >
            {loading ? 'Resetting...' : 'Reset History'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
