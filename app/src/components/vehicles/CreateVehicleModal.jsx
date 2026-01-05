import { useState } from 'react';
import { Modal, Button, Form, Alert, Row, Col } from 'react-bootstrap';
import { createVehicle } from '../../services/firebase/vehicles';

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

export default function CreateVehicleModal({ show, onHide, onVehicleCreated, teamId }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'car',
    make: '',
    model: '',
    year: '',
    race_number: '',
    current_usage: '',
    usage_unit: 'km',
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
      setError('Vehicle name is required');
      return;
    }

    setLoading(true);
    try {
      const vehicleData = {
        team_id: teamId,
        name: formData.name.trim(),
        type: formData.type,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        year: formData.year ? parseInt(formData.year) : null,
        race_number: formData.race_number.trim() || null,
        current_usage: formData.current_usage ? parseFloat(formData.current_usage) : 0,
        usage_unit: formData.usage_unit,
      };

      const vehicleId = await createVehicle(vehicleData);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        resetForm();
        onVehicleCreated(vehicleId);
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to create vehicle:', err);
      setError(err.message || 'Failed to create vehicle. Please try again.');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'car',
      make: '',
      model: '',
      year: '',
      race_number: '',
      current_usage: '',
      usage_unit: 'km',
    });
  };

  const handleClose = () => {
    if (!loading && !success) {
      resetForm();
      setError(null);
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Add New Vehicle</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Vehicle created successfully!</Alert>}

          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Vehicle Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  placeholder="e.g., Red Racing Bike"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading || success}
                  autoFocus
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Type *</Form.Label>
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
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Make</Form.Label>
                <Form.Control
                  type="text"
                  name="make"
                  placeholder="e.g., Honda, Trek"
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
                  placeholder="e.g., Civic, Fuel EX"
                  value={formData.model}
                  onChange={handleChange}
                  disabled={loading || success}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Year</Form.Label>
                <Form.Control
                  type="number"
                  name="year"
                  placeholder="e.g., 2023"
                  value={formData.year}
                  onChange={handleChange}
                  disabled={loading || success}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Race Number</Form.Label>
                <Form.Control
                  type="text"
                  name="race_number"
                  placeholder="e.g., 42"
                  value={formData.race_number}
                  onChange={handleChange}
                  disabled={loading || success}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
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
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Current Usage ({formData.usage_unit === 'km' ? 'kilometers' : 'hours'})
                </Form.Label>
                <Form.Control
                  type="number"
                  name="current_usage"
                  placeholder="0"
                  value={formData.current_usage}
                  onChange={handleChange}
                  disabled={loading || success}
                  min="0"
                  step="0.1"
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
            {loading ? 'Creating...' : success ? 'Created!' : 'Create Vehicle'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
