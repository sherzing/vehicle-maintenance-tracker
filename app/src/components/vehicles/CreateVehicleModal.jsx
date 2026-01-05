import { useState } from 'react';
import { Modal, Button, Form, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { createVehicle } from '../../services/firebase/vehicles';
import { decodeVIN, isValidVINFormat } from '../../utils/vinDecoder';

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
    vin: '',
    current_usage: '',
    usage_unit: 'km',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [decodedInfo, setDecodedInfo] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear decoded info if VIN changes
    if (name === 'vin' && decodedInfo) {
      setDecodedInfo(null);
    }
  };

  const handleDecodeVIN = async () => {
    if (!formData.vin) {
      setError('Please enter a VIN first');
      return;
    }

    if (!isValidVINFormat(formData.vin)) {
      setError('Invalid VIN format. VIN must be 17 characters and cannot contain I, O, or Q.');
      return;
    }

    setDecoding(true);
    setError(null);

    try {
      const decoded = await decodeVIN(formData.vin);
      setDecodedInfo(decoded);

      // Auto-populate fields with decoded data
      setFormData(prev => ({
        ...prev,
        make: decoded.make || prev.make,
        model: decoded.model || prev.model,
        year: decoded.year || prev.year,
        type: decoded.type || prev.type,
      }));

      // Success feedback
      setError(null);
    } catch (err) {
      console.error('VIN decode error:', err);
      setError(err.message || 'Failed to decode VIN. Please check the VIN and try again.');
      setDecodedInfo(null);
    } finally {
      setDecoding(false);
    }
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
        vin: formData.vin.trim() || null,
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

      // Check if it's a network/firestore connectivity issue
      let errorMessage = err.message || 'Failed to create vehicle. Please try again.';

      if (err.code === 'unavailable' || err.message?.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection or disable ad blockers that might be blocking Firestore.';
      }

      setError(errorMessage);
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
      vin: '',
      current_usage: '',
      usage_unit: 'km',
    });
    setDecodedInfo(null);
  };

  const handleClose = () => {
    // Always allow closing, but warn if loading
    if (loading) {
      if (!confirm('Vehicle creation is in progress. Are you sure you want to cancel?')) {
        return;
      }
    }

    // Reset all states when closing
    setLoading(false);
    setSuccess(false);
    setError(null);
    resetForm();
    onHide();
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
                <Form.Label>VIN (Vehicle Identification Number)</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    name="vin"
                    placeholder="e.g., 1HGBH41JXMN109186"
                    value={formData.vin}
                    onChange={handleChange}
                    disabled={loading || success || decoding}
                    maxLength="17"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <Button
                    variant="outline-primary"
                    onClick={handleDecodeVIN}
                    disabled={loading || success || decoding || !formData.vin || formData.vin.length !== 17}
                  >
                    {decoding ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-1" />
                        Decoding...
                      </>
                    ) : (
                      'Decode VIN'
                    )}
                  </Button>
                </div>
                <Form.Text className="text-muted">
                  Optional 17-character vehicle identification number. Click "Decode VIN" to auto-fill make, model, and year.
                </Form.Text>
                {decodedInfo && (
                  <Alert variant="success" className="mt-2 mb-0">
                    <small>
                      <strong>VIN Decoded:</strong> {decodedInfo.year} {decodedInfo.make} {decodedInfo.model}
                      {decodedInfo.manufacturer && ` (${decodedInfo.manufacturer})`}
                    </small>
                  </Alert>
                )}
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
          <Button variant="secondary" onClick={handleClose} disabled={success}>
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
