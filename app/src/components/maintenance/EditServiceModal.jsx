import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { updateServiceHistory, deleteServiceHistory } from '../../services/firebase/maintenanceItems';

export default function EditServiceModal({ show, onHide, onServiceUpdated, service, usageUnit = 'km' }) {
  const [formData, setFormData] = useState({
    serviceUsage: '',
    serviceDate: '',
    cost: '',
    provider: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (service) {
      const date = service.service_date?.toDate ? service.service_date.toDate() : new Date(service.service_date);
      setFormData({
        serviceUsage: service.service_usage !== null && service.service_usage !== undefined ? service.service_usage : '',
        serviceDate: date.toISOString().split('T')[0],
        cost: service.cost !== null && service.cost !== undefined ? service.cost : '',
        provider: service.provider || '',
        description: service.item_name || '',
      });
    }
  }, [service]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const isRepair = service.type === 'repair';

    // For repairs, description and date are required
    // For services, usage or date is required
    if (isRepair) {
      if (!formData.description || !formData.description.trim()) {
        setError('Please provide a repair description');
        return;
      }
      if (!formData.serviceDate) {
        setError('Please provide the repair date');
        return;
      }
    } else {
      if (!formData.serviceUsage && !formData.serviceDate) {
        setError('Please provide either service usage or service date');
        return;
      }
    }

    setLoading(true);
    try {
      const serviceUsage = formData.serviceUsage ? parseFloat(formData.serviceUsage) : null;
      const serviceDate = formData.serviceDate ? new Date(formData.serviceDate) : null;
      const cost = formData.cost ? parseFloat(formData.cost) : null;
      const provider = formData.provider ? formData.provider.trim() : null;
      const description = isRepair && formData.description ? formData.description.trim() : null;

      await updateServiceHistory(service.id, serviceUsage, serviceDate, cost, provider, description);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onServiceUpdated();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to update service:', err);
      setError(err.message || 'Failed to update service. Please try again.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this service record for "${service.item_name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteServiceHistory(service.id);
      setTimeout(() => {
        setDeleting(false);
        onServiceUpdated();
        onHide();
      }, 500);
    } catch (err) {
      console.error('Failed to delete service:', err);
      setError(err.message || 'Failed to delete service. Please try again.');
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
  const isRepair = service?.type === 'repair';
  const modalTitle = isRepair ? 'Edit Repair Record' : 'Edit Service Record';
  const successMessage = isRepair ? 'Repair updated successfully!' : 'Service updated successfully!';

  if (!service) return null;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{successMessage}</Alert>}

          <div className="mb-3">
            <h6>{service.item_name}</h6>
            <small className="text-muted">
              {isRepair
                ? 'Update the repair details.'
                : 'Update the service details. The maintenance schedule will be automatically recalculated.'}
            </small>
          </div>

          {isRepair && (
            <Form.Group className="mb-3">
              <Form.Label>Repair Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                placeholder="Describe what was repaired or replaced"
                value={formData.description}
                onChange={handleChange}
                disabled={loading || success || deleting}
                required
              />
              <Form.Text className="text-muted">
                What was repaired or replaced
              </Form.Text>
            </Form.Group>
          )}

          {!isRepair && (
            <Form.Group className="mb-3">
              <Form.Label>Service Usage ({usageLabel})</Form.Label>
              <Form.Control
                type="number"
                name="serviceUsage"
                placeholder={`e.g., 45000`}
                value={formData.serviceUsage}
                onChange={handleChange}
                disabled={loading || success || deleting}
                min="0"
                step="0.1"
              />
              <Form.Text className="text-muted">
                The usage reading when the service was performed
              </Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Service Date</Form.Label>
            <Form.Control
              type="date"
              name="serviceDate"
              value={formData.serviceDate}
              onChange={handleChange}
              disabled={loading || success || deleting}
              max={new Date().toISOString().split('T')[0]}
            />
            <Form.Text className="text-muted">
              When the service was performed
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cost (optional)</Form.Label>
            <Form.Control
              type="number"
              name="cost"
              placeholder="Enter service cost"
              value={formData.cost}
              onChange={handleChange}
              disabled={loading || success || deleting}
              min="0"
              step="0.01"
            />
            <Form.Text className="text-muted">
              Total cost of the service
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Service Provider (optional)</Form.Label>
            <Form.Control
              type="text"
              name="provider"
              placeholder="e.g., Main Street Garage"
              value={formData.provider}
              onChange={handleChange}
              disabled={loading || success || deleting}
            />
            <Form.Text className="text-muted">
              Name of the service provider or mechanic
            </Form.Text>
          </Form.Group>

          {!isRepair && (
            <Alert variant="info" className="mb-0">
              <small>
                <strong>Note:</strong> If this is the most recent service, updating it will change the maintenance schedule.
                If an older service becomes the most recent after editing, the schedule will be recalculated automatically.
              </small>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button
            variant="outline-danger"
            onClick={handleDelete}
            disabled={loading || success || deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Service'}
          </Button>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading || success || deleting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading || success || deleting}>
              {loading ? 'Updating...' : success ? 'Updated!' : 'Update Service'}
            </Button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
