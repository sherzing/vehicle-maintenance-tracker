import { useState, useEffect } from 'react';
import { Card, ListGroup, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { getVehicleServiceHistory } from '../../services/firebase/maintenanceItems';
import EditServiceModal from './EditServiceModal';

export default function ServiceHistory({ vehicleId, usageUnit = 'km' }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    if (vehicleId) {
      loadServiceHistory();
    }
  }, [vehicleId]);

  const loadServiceHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const serviceHistory = await getVehicleServiceHistory(vehicleId);
      setHistory(serviceHistory);
    } catch (err) {
      console.error('Failed to load service history:', err);
      setError('Failed to load service history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatUsage = (usage) => {
    if (usage === null || usage === undefined) return 'N/A';
    const unit = usageUnit === 'hours' ? 'hours' : 'km';
    return `${usage.toLocaleString()} ${unit}`;
  };

  const handleEditService = (service) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleServiceUpdated = async () => {
    await loadServiceHistory();
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="danger" className="mb-0">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Service History</h6>
          <Badge bg="secondary">{history.length} service{history.length !== 1 ? 's' : ''}</Badge>
        </div>
      </Card.Header>
      {history.length === 0 ? (
        <Card.Body className="text-center py-4">
          <p className="text-muted mb-0">No service history yet. Log services to build your maintenance record.</p>
        </Card.Body>
      ) : (
        <ListGroup variant="flush">
          {history.map((entry) => (
            <ListGroup.Item key={entry.id}>
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="fw-semibold mb-1">{entry.item_name}</div>
                  <div>
                    <small className="text-muted d-block">
                      <strong>Date:</strong> {formatDate(entry.service_date)}
                    </small>
                    {entry.service_usage !== null && entry.service_usage !== undefined && (
                      <small className="text-muted d-block">
                        <strong>Usage:</strong> {formatUsage(entry.service_usage)}
                      </small>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handleEditService(entry)}
                >
                  Edit
                </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      <EditServiceModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onServiceUpdated={handleServiceUpdated}
        service={selectedService}
        usageUnit={usageUnit}
      />
    </Card>
  );
}
