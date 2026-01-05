import { Card, ListGroup, Button, Badge } from 'react-bootstrap';
import {
  getMaintenanceStatus,
  getStatusBadgeVariant,
  getStatusText,
  formatRemaining,
} from '../../utils/maintenanceStatus';

export default function MaintenanceItemList({
  items,
  onCreateItem,
  onDeleteItem,
  onLogService,
  usageUnit = 'km',
  currentUsage = 0,
}) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          <p className="text-muted mb-3">No maintenance items for this vehicle yet.</p>
          <Button variant="primary" size="sm" onClick={onCreateItem}>
            Add First Maintenance Item
          </Button>
        </Card.Body>
      </Card>
    );
  }

  const formatInterval = (value, unit) => {
    if (value === null || value === undefined) return null;
    return `${value.toLocaleString()} ${unit}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Maintenance Schedule</h6>
        <Button variant="primary" size="sm" onClick={onCreateItem}>
          + Add Item
        </Button>
      </Card.Header>
      <ListGroup variant="flush">
        {items.map((item) => {
          const usageIntervalText = formatInterval(item.usage_interval, usageUnit);
          const timeIntervalText = formatInterval(item.time_interval_days, 'days');
          const lastServiceUsage = formatInterval(item.last_service_usage, usageUnit);
          const lastServiceDate = formatDate(item.last_service_date);

          // Calculate maintenance status
          const statusInfo = getMaintenanceStatus(item, currentUsage);
          const statusVariant = getStatusBadgeVariant(statusInfo.status);
          const statusLabel = getStatusText(statusInfo.status);
          const remaining = formatRemaining(statusInfo, usageUnit);

          return (
            <ListGroup.Item key={item.id}>
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="fw-semibold">{item.name}</span>
                    <Badge bg={statusVariant}>{statusLabel}</Badge>
                  </div>

                  <div className="mt-1">
                    <small className="text-muted d-block">
                      <strong>Intervals:</strong>
                      {usageIntervalText && <span> Every {usageIntervalText}</span>}
                      {usageIntervalText && timeIntervalText && <span> or</span>}
                      {timeIntervalText && <span> Every {timeIntervalText}</span>}
                    </small>
                  </div>

                  {(lastServiceUsage || lastServiceDate) && (
                    <div className="mt-1">
                      <small className="text-muted">
                        <strong>Last service:</strong>
                        {lastServiceUsage && <span> at {lastServiceUsage}</span>}
                        {lastServiceDate && <span> on {lastServiceDate}</span>}
                      </small>
                    </div>
                  )}

                  {!lastServiceUsage && !lastServiceDate && (
                    <div className="mt-1">
                      <Badge bg="secondary" text="white">Never serviced</Badge>
                    </div>
                  )}

                  {remaining && statusInfo.status !== 'overdue' && (
                    <div className="mt-1">
                      <small className="text-muted">
                        <strong>Remaining:</strong> {remaining}
                      </small>
                    </div>
                  )}

                  {statusInfo.status === 'overdue' && (
                    <div className="mt-1">
                      <small className="text-danger">
                        <strong>Action required!</strong> This maintenance is overdue.
                      </small>
                    </div>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => onLogService(item)}
                  >
                    Log Service
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => onDeleteItem(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Card>
  );
}
