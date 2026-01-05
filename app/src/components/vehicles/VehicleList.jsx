import { Card, ListGroup, Badge, Button } from 'react-bootstrap';

const VEHICLE_TYPE_LABELS = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  bicycle: 'Bicycle',
  other: 'Other',
};

export default function VehicleList({ vehicles, onVehicleSelect, onCreateVehicle, selectedVehicleId }) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <p className="text-muted mb-3">No vehicles in this team yet.</p>
          <Button variant="primary" onClick={onCreateVehicle}>
            Add Your First Vehicle
          </Button>
        </Card.Body>
      </Card>
    );
  }

  const formatUsage = (usage) => {
    if (usage === null || usage === undefined) return '0 km';
    return `${usage.toLocaleString()} km`;
  };

  const getVehicleLabel = (vehicle) => {
    const parts = [];
    if (vehicle.year) parts.push(vehicle.year);
    if (vehicle.make) parts.push(vehicle.make);
    if (vehicle.model) parts.push(vehicle.model);
    return parts.length > 0 ? parts.join(' ') : VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type;
  };

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Vehicles</h5>
        <Button variant="primary" size="sm" onClick={onCreateVehicle}>
          + Add Vehicle
        </Button>
      </Card.Header>
      <ListGroup variant="flush">
        {vehicles.map((vehicle) => {
          const isSelected = vehicle.id === selectedVehicleId;

          return (
            <ListGroup.Item
              key={vehicle.id}
              action
              active={isSelected}
              onClick={() => onVehicleSelect(vehicle.id)}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="fw-semibold">{vehicle.name}</div>
                  <small className="text-muted d-block">
                    {getVehicleLabel(vehicle)}
                  </small>
                  <small className="text-muted">
                    Usage: {formatUsage(vehicle.current_usage)}
                  </small>
                </div>
                <div className="d-flex flex-column align-items-end gap-1">
                  <Badge bg="secondary" pill>
                    {VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type}
                  </Badge>
                  {vehicle.race_number && (
                    <Badge bg="info" pill>
                      #{vehicle.race_number}
                    </Badge>
                  )}
                </div>
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Card>
  );
}
