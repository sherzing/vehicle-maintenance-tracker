import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Row, Col } from 'react-bootstrap';
import { updateVehicle } from '../../services/firebase/vehicles';

const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'other', label: 'Other' },
];

const USAGE_UNITS = [
  { value: 'km', label: 'Kilometers (km)' },
  { value: 'hours', label: 'Hours' },
];

export default function EditVehicleModal({ show, onHide, onVehicleUpdated, vehicle }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'car',
    make: '',
    model: '',
    year: '',
    race_number: '',
    usage_unit: 'km',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Pre-populate form when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setFormData({
        name: vehicle.name || '',
        type: vehicle.type || 'car',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        race_number: vehicle.race_number || '',
        usage_unit: vehicle.usage_unit || 'km',
      });
    }
  }, [vehicle]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.name.trim()) {
      setError('Vehicle name is required');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        name: formData.name.trim(),
        type: formData.type,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        year: formData.year ? parseInt(formData.year) : null,
        race_number: formData.race_number.trim() || null,
        usage_unit: formData.usage_unit,
      };

      await updateVehicle(vehicle.id, updates);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onVehicleUpdated();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to update vehicle:', err);
      setError(err.message || 'Failed to update vehicle. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !success) {
      setError(null);
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Vehicle</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Vehicle updated successfully!</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Vehicle Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              placeholder="e.g., My Bike, Race Car #5"
              value={formData.name}
              onChange={handleChange}
              disabled={loading || success}
              autoFocus
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={loading || success}
                >
                  {VEHICLE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Usage Unit</Form.Label>
                <Form.Select
                  name="usage_unit"
                  value={formData.usage_unit}
                  onChange={handleChange}
                  disabled={loading || success}
                >
                  {USAGE_UNITS.map(unit => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Make</Form.Label>
                <Form.Control
                  type="text"
                  name="make"
                  placeholder="e.g., Honda, Toyota"
                  value={formData.make}
                  onChange={handleChange}
                  disabled={loading || success}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Model</Form.Label>
                <Form.Control
                  type="text"
                  name="model"
                  placeholder="e.g., Civic, CBR600RR"
                  value={formData.model}
                  onChange={handleChange}
                  disabled={loading || success}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Year</Form.Label>
                <Form.Control
                  type="number"
                  name="year"
                  placeholder="e.g., 2020"
                  value={formData.year}
                  onChange={handleChange}
                  disabled={loading || success}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Race Number</Form.Label>
                <Form.Control
                  type="text"
                  name="race_number"
                  placeholder="e.g., 47"
                  value={formData.race_number}
                  onChange={handleChange}
                  disabled={loading || success}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? 'Updating...' : success ? 'Updated!' : 'Update Vehicle'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
