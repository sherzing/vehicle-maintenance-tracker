import { useState, useEffect } from 'react';
import { Card, ListGroup, Badge, Spinner, Alert, Button, Form } from 'react-bootstrap';
import { getVehicleServiceHistory } from '../../services/firebase/maintenanceItems';
import { getVehicleUsageHistory } from '../../services/firebase/usageHistory';
import EditServiceModal from './EditServiceModal';
import EditUsageModal from './EditUsageModal';

export default function ServiceHistory({ vehicleId, usageUnit = 'km' }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, service, repair, usage
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showEditUsageModal, setShowEditUsageModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedUsageEntry, setSelectedUsageEntry] = useState(null);

  useEffect(() => {
    if (vehicleId) {
      loadServiceHistory();
    }
  }, [vehicleId]);

  const loadServiceHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load both service and usage history in parallel
      const [serviceHistory, usageHistory] = await Promise.all([
        getVehicleServiceHistory(vehicleId),
        getVehicleUsageHistory(vehicleId)
      ]);

      // Merge and tag with historyType
      const allHistory = [
        ...serviceHistory.map(entry => ({ ...entry, historyType: entry.type })), // 'service' or 'repair'
        ...usageHistory.map(entry => ({ ...entry, historyType: 'usage' }))
      ];

      // Sort by date (most recent first)
      allHistory.sort((a, b) => {
        const dateA = a.service_date || a.date;
        const dateB = b.service_date || b.date;
        const timeA = dateA?.toDate ? dateA.toDate() : new Date(dateA);
        const timeB = dateB?.toDate ? dateB.toDate() : new Date(dateB);
        return timeB - timeA;
      });

      setHistory(allHistory);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load history. Please try again.');
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

  const handleEdit = (entry) => {
    if (entry.historyType === 'usage') {
      setSelectedUsageEntry(entry);
      setShowEditUsageModal(true);
    } else {
      setSelectedService(entry);
      setShowEditServiceModal(true);
    }
  };

  const handleUpdated = async () => {
    await loadServiceHistory();
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'service': return 'primary';
      case 'repair': return 'warning';
      case 'usage': return 'info';
      default: return 'secondary';
    }
  };

  const getBadgeLabel = (type) => {
    switch (type) {
      case 'service': return 'Service';
      case 'repair': return 'Repair';
      case 'usage': return 'Usage';
      default: return type;
    }
  };

  // Filter history
  const filteredHistory = history.filter(entry =>
    filter === 'all' || entry.historyType === filter
  );

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
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">History</h6>
          <Badge bg="secondary">{history.length} {history.length !== 1 ? 'entries' : 'entry'}</Badge>
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <Form.Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            size="sm"
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="all">All ({history.length})</option>
            <option value="service">
              Services ({history.filter(e => e.historyType === 'service').length})
            </option>
            <option value="repair">
              Repairs ({history.filter(e => e.historyType === 'repair').length})
            </option>
            <option value="usage">
              Usage Updates ({history.filter(e => e.historyType === 'usage').length})
            </option>
          </Form.Select>
        </div>
      </Card.Header>
      {filteredHistory.length === 0 ? (
        <Card.Body className="text-center py-4">
          <p className="text-muted mb-0">
            {filter === 'all'
              ? 'No history yet. Log services, repairs, or usage updates to build your record.'
              : `No ${filter} entries found.`}
          </p>
        </Card.Body>
      ) : (
        <ListGroup variant="flush">
          {filteredHistory.map((entry) => (
            <ListGroup.Item key={entry.id}>
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="mb-1">
                    <Badge bg={getBadgeColor(entry.historyType)} className="me-2">
                      {getBadgeLabel(entry.historyType)}
                    </Badge>
                    <span className="fw-semibold">
                      {entry.historyType === 'usage'
                        ? `Usage Update: ${formatUsage(entry.usage)}`
                        : entry.item_name}
                    </span>
                  </div>
                  <div>
                    <small className="text-muted d-block">
                      <strong>Date:</strong> {formatDate(entry.service_date || entry.date)}
                    </small>
                    {entry.historyType === 'usage' && entry.usage_type && (
                      <small className="text-muted d-block">
                        <strong>Type:</strong> {entry.usage_type}
                      </small>
                    )}
                    {entry.historyType === 'usage' && entry.location && (
                      <small className="text-muted d-block">
                        <strong>Location:</strong> {entry.location}
                      </small>
                    )}
                    {entry.historyType !== 'usage' && entry.service_usage !== null && entry.service_usage !== undefined && (
                      <small className="text-muted d-block">
                        <strong>Usage:</strong> {formatUsage(entry.service_usage)}
                      </small>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handleEdit(entry)}
                >
                  Edit
                </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      <EditServiceModal
        show={showEditServiceModal}
        onHide={() => setShowEditServiceModal(false)}
        onServiceUpdated={handleUpdated}
        service={selectedService}
        usageUnit={usageUnit}
      />

      <EditUsageModal
        show={showEditUsageModal}
        onHide={() => setShowEditUsageModal(false)}
        onUsageUpdated={handleUpdated}
        usageEntry={selectedUsageEntry}
        usageUnit={usageUnit}
      />
    </Card>
  );
}
