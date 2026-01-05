import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { updateVehicle } from '../../services/firebase/vehicles';
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

export default function EditVehicleModal({ show, onHide, onVehicleUpdated, vehicle }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'car',
    make: '',
    model: '',
    year: '',
    race_number: '',
    vin: '',
    usage_unit: 'km',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(false);
  const [vinMismatches, setVinMismatches] = useState(null);

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
        vin: vehicle.vin || '',
        usage_unit: vehicle.usage_unit || 'km',
      });
      setVinMismatches(null);
    }
  }, [vehicle]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear mismatches if VIN changes
    if (name === 'vin' && vinMismatches) {
      setVinMismatches(null);
    }
  };

  const handleCheckVIN = async () => {
    if (!formData.vin) {
      setError('Please enter a VIN first');
      return;
    }

    if (!isValidVINFormat(formData.vin)) {
      setError('Invalid VIN format. VIN must be 17 characters and cannot contain I, O, or Q.');
      return;
    }

    setChecking(true);
    setError(null);
    setVinMismatches(null);

    try {
      const decoded = await decodeVIN(formData.vin);

      // Compare decoded data with form data
      const mismatches = {};

      if (decoded.make && formData.make && decoded.make.toLowerCase() !== formData.make.toLowerCase()) {
        mismatches.make = { current: formData.make, decoded: decoded.make };
      }

      if (decoded.model && formData.model && decoded.model.toLowerCase() !== formData.model.toLowerCase()) {
        mismatches.model = { current: formData.model, decoded: decoded.model };
      }

      if (decoded.year && formData.year && decoded.year !== formData.year.toString()) {
        mismatches.year = { current: formData.year, decoded: decoded.year };
      }

      if (Object.keys(mismatches).length > 0) {
        setVinMismatches({ mismatches, decoded });
      } else {
        setVinMismatches({ mismatches: null, decoded });
      }
    } catch (err) {
      console.error('VIN check error:', err);
      setError(err.message || 'Failed to check VIN. Please check the VIN and try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleApplyVINData = () => {
    if (vinMismatches && vinMismatches.decoded) {
      const decoded = vinMismatches.decoded;
      setFormData(prev => ({
        ...prev,
        make: decoded.make || prev.make,
        model: decoded.model || prev.model,
        year: decoded.year || prev.year,
        type: decoded.type || prev.type,
      }));
      setVinMismatches(null);
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
      const updates = {
        name: formData.name.trim(),
        type: formData.type,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        year: formData.year ? parseInt(formData.year) : null,
        race_number: formData.race_number.trim() || null,
        vin: formData.vin.trim() || null,
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
                  isInvalid={vinMismatches?.mismatches?.make}
                />
                {vinMismatches?.mismatches?.make && (
                  <Form.Control.Feedback type="invalid">
                    VIN says: {vinMismatches.mismatches.make.decoded}
                  </Form.Control.Feedback>
                )}
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
                  isInvalid={vinMismatches?.mismatches?.model}
                />
                {vinMismatches?.mismatches?.model && (
                  <Form.Control.Feedback type="invalid">
                    VIN says: {vinMismatches.mismatches.model.decoded}
                  </Form.Control.Feedback>
                )}
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
                  isInvalid={vinMismatches?.mismatches?.year}
                />
                {vinMismatches?.mismatches?.year && (
                  <Form.Control.Feedback type="invalid">
                    VIN says: {vinMismatches.mismatches.year.decoded}
                  </Form.Control.Feedback>
                )}
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
                    disabled={loading || success || checking}
                    maxLength="17"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <Button
                    variant="outline-primary"
                    onClick={handleCheckVIN}
                    disabled={loading || success || checking || !formData.vin || formData.vin.length !== 17}
                  >
                    {checking ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-1" />
                        Checking...
                      </>
                    ) : (
                      'Check VIN'
                    )}
                  </Button>
                </div>
                <Form.Text className="text-muted">
                  Optional 17-character vehicle identification number. Click "Check VIN" to validate data.
                </Form.Text>
                {vinMismatches && vinMismatches.mismatches && Object.keys(vinMismatches.mismatches).length > 0 && (
                  <Alert variant="warning" className="mt-2 mb-0">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>Data Mismatch Detected:</strong>
                        <ul className="mb-0 mt-1">
                          {Object.entries(vinMismatches.mismatches).map(([field, data]) => (
                            <li key={field}>
                              <strong>{field.charAt(0).toUpperCase() + field.slice(1)}:</strong> Current: "{data.current}" → VIN says: "{data.decoded}"
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={handleApplyVINData}
                      >
                        Apply VIN Data
                      </Button>
                    </div>
                  </Alert>
                )}
                {vinMismatches && (!vinMismatches.mismatches || Object.keys(vinMismatches.mismatches).length === 0) && (
                  <Alert variant="success" className="mt-2 mb-0">
                    <small>
                      <strong>VIN Verified:</strong> {vinMismatches.decoded.year} {vinMismatches.decoded.make} {vinMismatches.decoded.model} - All data matches!
                    </small>
                  </Alert>
                )}
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
