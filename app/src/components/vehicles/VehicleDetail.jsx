import { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Button } from 'react-bootstrap';
import { getVehicle } from '../../services/firebase/vehicles';
import { getVehicleMaintenanceItems, deleteMaintenanceItem } from '../../services/firebase/maintenanceItems';
import MaintenanceItemList from '../maintenance/MaintenanceItemList';
import CreateMaintenanceItemModal from '../maintenance/CreateMaintenanceItemModal';
import LogServiceModal from '../maintenance/LogServiceModal';
import UpdateUsageModal from './UpdateUsageModal';

const VEHICLE_TYPE_LABELS = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  bicycle: 'Bicycle',
  other: 'Other',
};

export default function VehicleDetail({ vehicleId }) {
  const [vehicle, setVehicle] = useState(null);
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogServiceModal, setShowLogServiceModal] = useState(false);
  const [showUpdateUsageModal, setShowUpdateUsageModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (vehicleId) {
      loadVehicleAndItems();
    }
  }, [vehicleId]);

  const loadVehicleAndItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vehicleData, items] = await Promise.all([
        getVehicle(vehicleId),
        getVehicleMaintenanceItems(vehicleId),
      ]);
      setVehicle(vehicleData);
      setMaintenanceItems(items);
    } catch (err) {
      console.error('Failed to load vehicle details:', err);
      setError('Failed to load vehicle details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this maintenance item?')) {
      return;
    }

    try {
      await deleteMaintenanceItem(itemId);
      await loadVehicleAndItems();
    } catch (err) {
      console.error('Failed to delete maintenance item:', err);
      setError('Failed to delete maintenance item. Please try again.');
    }
  };

  const handleItemCreated = async () => {
    await loadVehicleAndItems();
  };

  const handleLogService = (item) => {
    setSelectedItem(item);
    setShowLogServiceModal(true);
  };

  const handleServiceLogged = async () => {
    await loadVehicleAndItems();
  };

  const handleUsageUpdated = async () => {
    await loadVehicleAndItems();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!vehicle) {
    return <Alert variant="info">Select a vehicle to view details</Alert>;
  }

  const getVehicleLabel = () => {
    const parts = [];
    if (vehicle.year) parts.push(vehicle.year);
    if (vehicle.make) parts.push(vehicle.make);
    if (vehicle.model) parts.push(vehicle.model);
    return parts.length > 0 ? parts.join(' ') : VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type;
  };

  const formatUsage = (usage, unit = 'km') => {
    if (usage === null || usage === undefined) {
      return unit === 'hours' ? '0 hours' : '0 km';
    }
    const unitLabel = unit === 'hours' ? 'hours' : 'km';
    return `${usage.toLocaleString()} ${unitLabel}`;
  };

  return (
    <div>
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h4>{vehicle.name}</h4>
              <p className="text-muted mb-2">{getVehicleLabel()}</p>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowUpdateUsageModal(true)}
            >
              Update Usage
            </Button>
          </div>
          <div className="d-flex gap-3 mb-2">
            <div>
              <strong>Type:</strong> {VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type}
            </div>
            {vehicle.race_number && (
              <div>
                <strong>Race #:</strong> {vehicle.race_number}
              </div>
            )}
          </div>
          <div>
            <strong>Current Usage:</strong> {formatUsage(vehicle.current_usage, vehicle.usage_unit)}
          </div>
        </Card.Body>
      </Card>

      <MaintenanceItemList
        items={maintenanceItems}
        onCreateItem={() => setShowCreateModal(true)}
        onDeleteItem={handleDeleteItem}
        onLogService={handleLogService}
        usageUnit={vehicle.usage_unit}
        currentUsage={vehicle.current_usage || 0}
      />

      <CreateMaintenanceItemModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onItemCreated={handleItemCreated}
        vehicleId={vehicleId}
        usageUnit={vehicle.usage_unit}
      />

      <LogServiceModal
        show={showLogServiceModal}
        onHide={() => setShowLogServiceModal(false)}
        onServiceLogged={handleServiceLogged}
        item={selectedItem}
        currentUsage={vehicle.current_usage || 0}
        usageUnit={vehicle.usage_unit}
      />

      <UpdateUsageModal
        show={showUpdateUsageModal}
        onHide={() => setShowUpdateUsageModal(false)}
        onUsageUpdated={handleUsageUpdated}
        vehicle={vehicle}
      />
    </div>
  );
}
