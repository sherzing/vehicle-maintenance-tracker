import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { logService } from '../../services/firebase/maintenanceItems';

export default function LogServiceModal({ show, onHide, onServiceLogged, item, currentUsage, usageUnit = 'km' }) {
  const [formData, setFormData] = useState({
    serviceUsage: currentUsage || '',
    serviceDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.serviceUsage && !formData.serviceDate) {
      setError('Please provide either service usage or service date');
      return;
    }

    setLoading(true);
    try {
      const serviceUsage = formData.serviceUsage ? parseFloat(formData.serviceUsage) : null;
      const serviceDate = formData.serviceDate ? new Date(formData.serviceDate) : null;

      await logService(item.id, serviceUsage, serviceDate);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        resetForm();
        onServiceLogged();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to log service:', err);
      setError(err.message || 'Failed to log service. Please try again.');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serviceUsage: currentUsage || '',
      serviceDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleClose = () => {
    if (!loading && !success) {
      resetForm();
      setError(null);
      onHide();
    }
  };

  const usageLabel = usageUnit === 'hours' ? 'hours' : 'km';

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Log Service</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Service logged successfully!</Alert>}

          {item && (
            <div className="mb-3">
              <h6>{item.name}</h6>
              <small className="text-muted">
                Record when this service was performed to reset the maintenance schedule.
              </small>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Service Usage ({usageLabel})</Form.Label>
            <Form.Control
              type="number"
              name="serviceUsage"
              placeholder={`Current: ${currentUsage || 0} ${usageLabel}`}
              value={formData.serviceUsage}
              onChange={handleChange}
              disabled={loading || success}
              min="0"
              step="0.1"
            />
            <Form.Text className="text-muted">
              The usage reading when the service was performed
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Service Date</Form.Label>
            <Form.Control
              type="date"
              name="serviceDate"
              value={formData.serviceDate}
              onChange={handleChange}
              disabled={loading || success}
              max={new Date().toISOString().split('T')[0]}
            />
            <Form.Text className="text-muted">
              When the service was performed
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? 'Logging...' : success ? 'Logged!' : 'Log Service'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
