import { useState } from 'react';
import { Modal, Button, Form, Alert, Row, Col } from 'react-bootstrap';
import { createMaintenanceItem } from '../../services/firebase/maintenanceItems';

export default function CreateMaintenanceItemModal({ show, onHide, onItemCreated, vehicleId, usageUnit }) {
  const [formData, setFormData] = useState({
    name: '',
    usage_interval: '',
    time_interval_days: '',
    last_service_usage: '',
    last_service_date: '',
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

    if (!formData.name.trim()) {
      setError('Maintenance item name is required');
      return;
    }

    if (!formData.usage_interval && !formData.time_interval_days) {
      setError('At least one interval (usage or time) is required');
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        vehicle_id: vehicleId,
        name: formData.name.trim(),
        usage_interval: formData.usage_interval ? parseFloat(formData.usage_interval) : null,
        time_interval_days: formData.time_interval_days ? parseInt(formData.time_interval_days) : null,
        last_service_usage: formData.last_service_usage ? parseFloat(formData.last_service_usage) : null,
        last_service_date: formData.last_service_date ? new Date(formData.last_service_date) : null,
      };

      const itemId = await createMaintenanceItem(itemData);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        resetForm();
        onItemCreated(itemId);
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to create maintenance item:', err);
      setError(err.message || 'Failed to create maintenance item. Please try again.');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      usage_interval: '',
      time_interval_days: '',
      last_service_usage: '',
      last_service_date: '',
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
        <Modal.Title>Add Maintenance Item</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Maintenance item created successfully!</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Item Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              placeholder="e.g., Oil change, Chain cleaning, Tire rotation"
              value={formData.name}
              onChange={handleChange}
              disabled={loading || success}
              autoFocus
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Usage Interval ({usageLabel})</Form.Label>
                <Form.Control
                  type="number"
                  name="usage_interval"
                  placeholder={`e.g., ${usageUnit === 'hours' ? '50' : '5000'}`}
                  value={formData.usage_interval}
                  onChange={handleChange}
                  disabled={loading || success}
                  min="0"
                  step="0.1"
                />
                <Form.Text className="text-muted">
                  How often based on usage
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Time Interval (days)</Form.Label>
                <Form.Control
                  type="number"
                  name="time_interval_days"
                  placeholder="e.g., 90, 180, 365"
                  value={formData.time_interval_days}
                  onChange={handleChange}
                  disabled={loading || success}
                  min="0"
                />
                <Form.Text className="text-muted">
                  How often based on time
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Alert variant="info" className="mb-3">
            <small>
              <strong>Note:</strong> You must specify at least one interval. Both can be set, and the item will be due based on whichever comes first.
            </small>
          </Alert>

          <h6 className="mb-3">Last Service (Optional)</h6>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Last Service Usage ({usageLabel})</Form.Label>
                <Form.Control
                  type="number"
                  name="last_service_usage"
                  placeholder={`e.g., ${usageUnit === 'hours' ? '25' : '45000'}`}
                  value={formData.last_service_usage}
                  onChange={handleChange}
                  disabled={loading || success}
                  min="0"
                  step="0.1"
                />
                <Form.Text className="text-muted">
                  Usage when last serviced
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Last Service Date</Form.Label>
                <Form.Control
                  type="date"
                  name="last_service_date"
                  value={formData.last_service_date}
                  onChange={handleChange}
                  disabled={loading || success}
                  max={new Date().toISOString().split('T')[0]}
                />
                <Form.Text className="text-muted">
                  Date when last serviced
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? 'Creating...' : success ? 'Created!' : 'Create Item'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
