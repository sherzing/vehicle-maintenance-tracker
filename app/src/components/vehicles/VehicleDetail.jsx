import { useState, useEffect } from 'react';
import { Spinner, Alert, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { getVehicle } from '../../services/firebase/vehicles';
import { getVehicleMaintenanceItems, getVehicleServiceHistory } from '../../services/firebase/maintenanceItems';
import { getMaintenanceStatus, getStatusText, formatRemaining } from '../../utils/maintenanceStatus';
import { calculateDaysInService, formatTimelineDate, calculateTotalCost, calculateNextServiceDue } from '../../utils/vehicleStats';
import CreateMaintenanceItemModal from '../maintenance/CreateMaintenanceItemModal';
import EditMaintenanceItemModal from '../maintenance/EditMaintenanceItemModal';
import LogServiceModal from '../maintenance/LogServiceModal';
import LogRepairModal from '../maintenance/LogRepairModal';
import LogUsageModal from './LogUsageModal';
import EditVehicleModal from './EditVehicleModal';
import EditServiceModal from '../maintenance/EditServiceModal';
import ResetVehicleHistoryModal from './ResetVehicleHistoryModal';

export default function VehicleDetail({ vehicleId }) {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogServiceModal, setShowLogServiceModal] = useState(false);
  const [showLogRepairModal, setShowLogRepairModal] = useState(false);
  const [showLogUsageModal, setShowLogUsageModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showResetHistoryModal, setShowResetHistoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    if (vehicleId) {
      loadVehicleData();
    }
  }, [vehicleId]);

  const loadVehicleData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vehicleData, items, history] = await Promise.all([
        getVehicle(vehicleId),
        getVehicleMaintenanceItems(vehicleId),
        getVehicleServiceHistory(vehicleId),
      ]);
      setVehicle(vehicleData);
      setMaintenanceItems(items);
      setServiceHistory(history);
    } catch (err) {
      console.error('Failed to load vehicle details:', err);
      setError('Failed to load vehicle details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleItemCreated = async () => {
    await loadVehicleData();
  };

  const handleItemUpdated = async () => {
    await loadVehicleData();
  };

  const handleLogService = (item) => {
    setSelectedItem(item);
    setShowLogServiceModal(true);
  };

  const handleServiceLogged = async () => {
    await loadVehicleData();
  };

  const handleUsageLogged = async () => {
    await loadVehicleData();
  };

  const handleVehicleUpdated = async () => {
    await loadVehicleData();
  };

  const handleEditService = (service) => {
    setSelectedService(service);
    setShowEditServiceModal(true);
  };

  const handleServiceUpdated = async () => {
    await loadVehicleData();
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

  const usageLabel = vehicle.usage_unit === 'hours' ? 'hours' : 'km';
  const currentUsage = vehicle.current_usage || 0;

  // Calculate stats for hero section
  const daysInService = calculateDaysInService(vehicle.created_at);
  const nextServiceInfo = calculateNextServiceDue(maintenanceItems, currentUsage, usageLabel);
  const totalCost = calculateTotalCost(serviceHistory, 12); // Last 12 months

  return (
    <div className="minimalist-container">
      {/* Vehicle Hero Section */}
      <div className="minimalist-vehicle-hero">
        <div className="minimalist-vehicle-hero-header">
          <div>
            <h1 className="minimalist-vehicle-title">{vehicle.name}</h1>
            <p className="minimalist-vehicle-subtitle">
              {vehicle.year && `${vehicle.year} `}
              {vehicle.make} {vehicle.model}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="minimalist-btn-secondary"
              onClick={() => setShowLogRepairModal(true)}
            >
              Log Repair
            </button>
            <button
              className="minimalist-btn-secondary"
              onClick={() => setShowEditVehicleModal(true)}
            >
              Edit Vehicle
            </button>
            <button
              className="minimalist-btn-secondary"
              onClick={() => setShowLogUsageModal(true)}
            >
              Log Usage
            </button>
            <Dropdown>
              <Dropdown.Toggle
                variant="outline-secondary"
                id="vehicle-settings-dropdown"
                size="sm"
              >
                ⚙️ Settings
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item
                  onClick={() => setShowResetHistoryModal(true)}
                  className="text-danger"
                >
                  Reset History
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="minimalist-vehicle-stats">
          <div>
            <div className="minimalist-stat-label">Current Mileage</div>
            <div className="minimalist-stat-value">
              {currentUsage.toLocaleString()}
              <span className="minimalist-stat-subtext">{usageLabel}</span>
            </div>
          </div>
          <div>
            <div className="minimalist-stat-label">Next Service Due</div>
            {nextServiceInfo ? (
              <>
                <div className="minimalist-stat-value" style={{ fontSize: '1.25rem' }}>
                  {nextServiceInfo.name}
                </div>
                <div className="minimalist-stat-subtext">{nextServiceInfo.remaining}</div>
              </>
            ) : (
              <div className="minimalist-stat-value" style={{ fontSize: '1.25rem' }}>
                All up to date
              </div>
            )}
          </div>
          <div>
            <div className="minimalist-stat-label">Days in Service</div>
            <div className="minimalist-stat-value">{daysInService}</div>
          </div>
          <div>
            <div className="minimalist-stat-label">Total Maintenance</div>
            {totalCost !== null ? (
              <>
                <div className="minimalist-stat-value">${totalCost.toFixed(2)}</div>
                <div className="minimalist-stat-subtext">Last 12 months</div>
              </>
            ) : (
              <div className="minimalist-stat-value" style={{ fontSize: '1.25rem' }}>
                No data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance Schedule Section */}
      <div className="minimalist-section-card">
        <div className="minimalist-section-header">
          <h2 className="minimalist-section-title">Maintenance Schedule</h2>
          <button
            className="minimalist-btn-secondary"
            onClick={() => setShowCreateModal(true)}
          >
            + Add Item
          </button>
        </div>

        {maintenanceItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
            <p>No maintenance items for this vehicle yet.</p>
            <button
              className="minimalist-btn-secondary"
              onClick={() => setShowCreateModal(true)}
              style={{ marginTop: '1rem' }}
            >
              Add First Maintenance Item
            </button>
          </div>
        ) : (
          <div>
            {maintenanceItems.map((item) => {
              const statusInfo = getMaintenanceStatus(item, currentUsage, usageLabel);
              const statusLabel = getStatusText(statusInfo.status);
              const remaining = formatRemaining(statusInfo, usageLabel);
              const percentage = Math.min(statusInfo.percentage * 100, 100);

              return (
                <div key={item.id} className="minimalist-maintenance-item">
                  <div className="minimalist-item-header">
                    <div>
                      <div className="minimalist-item-title">{item.name}</div>
                      <div className="minimalist-item-subtitle">
                        {item.usage_interval && `Every ${item.usage_interval.toLocaleString()} ${usageLabel}`}
                        {item.usage_interval && item.time_interval_days && ' or '}
                        {item.time_interval_days && `Every ${item.time_interval_days} days`}
                      </div>
                    </div>
                    <span className={`minimalist-item-status status-${statusInfo.status}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="minimalist-progress-container">
                    <div className="minimalist-progress-bar">
                      <div
                        className={`minimalist-progress-fill status-${statusInfo.status}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="minimalist-progress-text">
                      <span>
                        {item.last_service_usage !== null && item.last_service_usage !== undefined
                          ? `Last: ${item.last_service_usage.toLocaleString()} ${usageLabel}`
                          : 'Never serviced'}
                      </span>
                      <span>{remaining}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button
                      className="minimalist-btn-secondary"
                      onClick={() => handleLogService(item)}
                      style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                    >
                      Log Service
                    </button>
                    <button
                      className="minimalist-btn-secondary"
                      onClick={() => handleEditItem(item)}
                      style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Service History Section */}
      <div className="minimalist-section-card">
        <div className="minimalist-section-header">
          <h2 className="minimalist-section-title">Service History</h2>
          <span
            style={{
              fontSize: '0.875rem',
              color: 'var(--gray-500)',
              fontWeight: '500',
            }}
          >
            {serviceHistory.length} service{serviceHistory.length !== 1 ? 's' : ''}
          </span>
        </div>

        {serviceHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
            <p>No service history yet. Log services to build your maintenance record.</p>
          </div>
        ) : (
          <div>
            {serviceHistory.map((entry) => {
              const dateInfo = formatTimelineDate(entry.service_date);
              const entryType = entry.type || 'service'; // Default to 'service' for backward compatibility
              const icon = entryType === 'repair' ? '🔧' : '📋';
              const typeLabel = entryType === 'repair' ? 'Repair' : 'Service';

              return (
                <div key={entry.id} className="minimalist-history-item">
                  {/* Date Column */}
                  <div className="minimalist-history-date">
                    <div className="minimalist-history-date-day">{dateInfo.day}</div>
                    <div className="minimalist-history-date-month">{dateInfo.monthYear}</div>
                  </div>

                  {/* Content Column */}
                  <div className="minimalist-history-content">
                    <div className="minimalist-history-title">
                      <span style={{ marginRight: '0.5rem' }}>{icon}</span>
                      {entry.item_name}
                    </div>
                    {entry.provider && (
                      <div className="minimalist-history-description">{entry.provider}</div>
                    )}
                    <div className="minimalist-history-meta">
                      {entry.service_usage !== null && entry.service_usage !== undefined && (
                        <div className="minimalist-history-meta-item">
                          📍 {entry.service_usage.toLocaleString()} {usageLabel}
                        </div>
                      )}
                      {entry.cost !== null && entry.cost !== undefined && (
                        <div className="minimalist-history-meta-item">
                          💰 ${entry.cost.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <button
                      className="minimalist-btn-secondary"
                      onClick={() => handleEditService(entry)}
                      style={{ fontSize: '0.813rem', padding: '0.25rem 0.625rem', marginTop: '0.5rem' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateMaintenanceItemModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onItemCreated={handleItemCreated}
        vehicleId={vehicleId}
        usageUnit={vehicle.usage_unit}
      />

      <EditMaintenanceItemModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onItemUpdated={handleItemUpdated}
        item={selectedItem}
        usageUnit={vehicle.usage_unit}
      />

      <LogServiceModal
        show={showLogServiceModal}
        onHide={() => setShowLogServiceModal(false)}
        onServiceLogged={handleServiceLogged}
        item={selectedItem}
        currentUsage={currentUsage}
        usageUnit={vehicle.usage_unit}
      />

      <LogUsageModal
        show={showLogUsageModal}
        onHide={() => setShowLogUsageModal(false)}
        onUsageLogged={handleUsageLogged}
        vehicle={vehicle}
        user={user}
      />

      <EditVehicleModal
        show={showEditVehicleModal}
        onHide={() => setShowEditVehicleModal(false)}
        onVehicleUpdated={handleVehicleUpdated}
        vehicle={vehicle}
      />

      <LogRepairModal
        show={showLogRepairModal}
        onHide={() => setShowLogRepairModal(false)}
        onRepairLogged={handleServiceLogged}
        vehicle={vehicle}
      />

      <EditServiceModal
        show={showEditServiceModal}
        onHide={() => setShowEditServiceModal(false)}
        onServiceUpdated={handleServiceUpdated}
        service={selectedService}
        usageUnit={vehicle.usage_unit}
      />

      <ResetVehicleHistoryModal
        show={showResetHistoryModal}
        onHide={() => setShowResetHistoryModal(false)}
        onComplete={loadVehicleData}
        vehicle={vehicle}
      />
    </div>
  );
}
