import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { logRepair } from '../../services/firebase/maintenanceItems';

export default function LogRepairModal({ show, onHide, onRepairLogged, vehicle }) {
  const [formData, setFormData] = useState({
    description: '',
    serviceDate: new Date().toISOString().split('T')[0],
    cost: '',
    provider: '',
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

    if (!formData.description || !formData.description.trim()) {
      setError('Please provide a repair description');
      return;
    }

    if (!formData.serviceDate) {
      setError('Please provide the repair date');
      return;
    }

    setLoading(true);
    try {
      const serviceDate = formData.serviceDate ? new Date(formData.serviceDate) : null;
      const cost = formData.cost ? parseFloat(formData.cost) : null;
      const provider = formData.provider ? formData.provider.trim() : null;
      const description = formData.description.trim();

      await logRepair(vehicle.id, description, serviceDate, cost, provider);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        resetForm();
        onRepairLogged();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to log repair:', err);
      setError(err.message || 'Failed to log repair. Please try again.');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      serviceDate: new Date().toISOString().split('T')[0],
      cost: '',
      provider: '',
    });
  };

  const handleClose = () => {
    if (!loading && !success) {
      resetForm();
      setError(null);
      onHide();
    }
  };

  if (!vehicle) return null;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Log Repair</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Repair logged successfully!</Alert>}

          <div className="mb-3">
            <h6>{vehicle.name}</h6>
            <small className="text-muted">
              Record any repairs, part replacements, or maintenance work performed on this vehicle.
            </small>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Repair Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              placeholder="e.g., Replaced front brake pads, Changed oil, Fixed engine light"
              value={formData.description}
              onChange={handleChange}
              disabled={loading || success}
              required
            />
            <Form.Text className="text-muted">
              Describe what was repaired or replaced
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Repair Date</Form.Label>
            <Form.Control
              type="date"
              name="serviceDate"
              value={formData.serviceDate}
              onChange={handleChange}
              disabled={loading || success}
              max={new Date().toISOString().split('T')[0]}
              required
            />
            <Form.Text className="text-muted">
              When the repair was performed
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cost (optional)</Form.Label>
            <Form.Control
              type="number"
              name="cost"
              placeholder="Enter repair cost"
              value={formData.cost}
              onChange={handleChange}
              disabled={loading || success}
              min="0"
              step="0.01"
            />
            <Form.Text className="text-muted">
              Total cost of the repair
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Service Provider (optional)</Form.Label>
            <Form.Control
              type="text"
              name="provider"
              placeholder="e.g., Main Street Garage, DIY"
              value={formData.provider}
              onChange={handleChange}
              disabled={loading || success}
            />
            <Form.Text className="text-muted">
              Who performed the repair
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? 'Logging...' : success ? 'Logged!' : 'Log Repair'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
