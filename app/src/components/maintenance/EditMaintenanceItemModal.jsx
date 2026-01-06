import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Row, Col } from 'react-bootstrap';
import { updateMaintenanceItem, deleteMaintenanceItem } from '../../services/firebase/maintenanceItems';

export default function EditMaintenanceItemModal({ show, onHide, onItemUpdated, item, usageUnit }) {
  const [formData, setFormData] = useState({
    name: '',
    usage_interval: '',
    time_interval_days: '',
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Pre-populate form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        usage_interval: item.usage_interval !== null && item.usage_interval !== undefined ? item.usage_interval : '',
        time_interval_days: item.time_interval_days !== null && item.time_interval_days !== undefined ? item.time_interval_days : '',
      });
    }
  }, [item]);

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
      // Only update the intervals and name, NOT the last_service_* fields
      // This preserves historical service data while updating future intervals
      const updates = {
        name: formData.name.trim(),
        usage_interval: formData.usage_interval ? parseFloat(formData.usage_interval) : null,
        time_interval_days: formData.time_interval_days ? parseInt(formData.time_interval_days) : null,
      };

      await updateMaintenanceItem(item.id, updates);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onItemUpdated();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to update maintenance item:', err);
      setError(err.message || 'Failed to update maintenance item. Please try again.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteMaintenanceItem(item.id);
      setTimeout(() => {
        setDeleting(false);
        onItemUpdated();
        onHide();
      }, 500);
    } catch (err) {
      console.error('Failed to delete maintenance item:', err);
      setError(err.message || 'Failed to delete maintenance item. Please try again.');
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!loading && !success && !deleting) {
      setError(null);
      onHide();
    }
  };

  const usageLabel = usageUnit === 'hours' ? 'hours' : 'km';

  if (!item) return null;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Maintenance Item</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Maintenance item updated successfully!</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Item Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              placeholder="e.g., Oil change, Chain cleaning, Tire rotation"
              value={formData.name}
              onChange={handleChange}
              disabled={loading || success || deleting}
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
                  disabled={loading || success || deleting}
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
                  disabled={loading || success || deleting}
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
              <strong>Note:</strong> You must specify at least one interval. Changing intervals will only affect future maintenance schedules. Past service history will be preserved.
            </small>
          </Alert>

          {item.last_service_usage !== null || item.last_service_date !== null ? (
            <Alert variant="secondary" className="mb-0">
              <small>
                <strong>Service History:</strong> This item has service records. To update service history, use the "Log Service" button.
              </small>
            </Alert>
          ) : null}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button
            variant="outline-danger"
            onClick={handleDelete}
            disabled={loading || success || deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Item'}
          </Button>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading || success || deleting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading || success || deleting}>
              {loading ? 'Updating...' : success ? 'Updated!' : 'Update Item'}
            </Button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
