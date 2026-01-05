import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { updateVehicle } from '../../services/firebase/vehicles';

export default function UpdateUsageModal({ show, onHide, onUsageUpdated, vehicle }) {
  const [newUsage, setNewUsage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const usageValue = parseFloat(newUsage);

    if (!newUsage || isNaN(usageValue)) {
      setError('Please enter a valid usage value');
      return;
    }

    const currentUsage = vehicle?.current_usage || 0;
    if (usageValue < currentUsage) {
      setError(`New usage (${usageValue}) cannot be less than current usage (${currentUsage})`);
      return;
    }

    setLoading(true);
    try {
      await updateVehicle(vehicle.id, {
        current_usage: usageValue,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setNewUsage('');
        onUsageUpdated();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to update usage:', err);
      setError(err.message || 'Failed to update usage. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !success) {
      setNewUsage('');
      setError(null);
      onHide();
    }
  };

  const usageLabel = vehicle?.usage_unit === 'hours' ? 'hours' : 'km';
  const currentUsage = vehicle?.current_usage || 0;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Update Usage</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Usage updated successfully!</Alert>}

          {vehicle && (
            <div className="mb-3">
              <h6>{vehicle.name}</h6>
              <p className="text-muted mb-2">
                Current usage: <strong>{currentUsage.toLocaleString()} {usageLabel}</strong>
              </p>
              <small className="text-muted">
                Enter the new usage reading. This should be higher than the current value.
              </small>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>New Usage ({usageLabel})</Form.Label>
            <Form.Control
              type="number"
              placeholder={`e.g., ${currentUsage + (vehicle?.usage_unit === 'hours' ? 10 : 1000)}`}
              value={newUsage}
              onChange={(e) => setNewUsage(e.target.value)}
              disabled={loading || success}
              min={currentUsage}
              step="0.1"
              autoFocus
            />
            <Form.Text className="text-muted">
              Must be greater than or equal to current usage ({currentUsage} {usageLabel})
            </Form.Text>
          </Form.Group>

          {newUsage && !isNaN(parseFloat(newUsage)) && parseFloat(newUsage) > currentUsage && (
            <Alert variant="info">
              <small>
                <strong>Change:</strong> +{(parseFloat(newUsage) - currentUsage).toLocaleString()} {usageLabel}
              </small>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? 'Updating...' : success ? 'Updated!' : 'Update Usage'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
