import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTeams } from '../../services/firebase/teams';
import { getTeamVehicles } from '../../services/firebase/vehicles';
import { getVehicleMaintenanceItems } from '../../services/firebase/maintenanceItems';
import { getMaintenanceStatus, getStatusText } from '../../utils/maintenanceStatus';
import { calculateNextServiceDue } from '../../utils/vehicleStats';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [vehicleStatusList, setVehicleStatusList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (user?.uid) {
      loadTeams();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (selectedTeamId) {
      loadDashboardData();
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    try {
      const userTeams = await getUserTeams(user.uid);
      setTeams(userTeams);

      // Get selected team from localStorage or use first team
      const storedTeamId = localStorage.getItem('selectedTeamId');
      if (storedTeamId && userTeams.some(t => t.id === storedTeamId)) {
        setSelectedTeamId(storedTeamId);
      } else if (userTeams.length > 0) {
        setSelectedTeamId(userTeams[0].id);
        localStorage.setItem('selectedTeamId', userTeams[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError('Failed to load teams. Please try again.');
      setLoading(false);
    }
  };

  const handleTeamChange = (e) => {
    const teamId = e.target.value;
    setSelectedTeamId(teamId);
    localStorage.setItem('selectedTeamId', teamId);
  };

  const loadDashboardData = async () => {
    if (!user || !selectedTeamId) return;

    setLoading(true);
    setError(null);

    try {
      // Load vehicles for the selected team
      const allVehicles = await getTeamVehicles(selectedTeamId);

      // Load maintenance items for each vehicle
      const vehicleData = await Promise.all(
        allVehicles.map(async (vehicle) => {
          const items = await getVehicleMaintenanceItems(vehicle.id);
          return { vehicle, items };
        })
      );

      // Calculate statistics for each vehicle
      const statusList = [];

      vehicleData.forEach(({ vehicle, items }) => {
        // Calculate status for each maintenance item
        const itemStatuses = items.map(item => {
          const status = getMaintenanceStatus(item, vehicle.current_usage || 0, vehicle.usage_unit || 'km');
          return { item, status };
        });

        // Determine overall vehicle status (worst status wins)
        let vehicleStatus = 'ok';
        if (itemStatuses.some(is => is.status.status === 'overdue')) {
          vehicleStatus = 'overdue';
        } else if (itemStatuses.some(is => is.status.status === 'due_soon')) {
          vehicleStatus = 'due_soon';
        }

        // Calculate next service due using utility function
        const nextServiceInfo = calculateNextServiceDue(
          items,
          vehicle.current_usage || 0,
          vehicle.usage_unit || 'km'
        );

        statusList.push({
          vehicle,
          status: vehicleStatus,
          itemCount: items.length,
          nextServiceInfo,
        });
      });

      // Sort by status priority (overdue first, then due soon, then ok)
      statusList.sort((a, b) => {
        const statusOrder = { overdue: 0, due_soon: 1, ok: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setVehicleStatusList(statusList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleClick = (vehicleId) => {
    navigate(`/vehicles?vehicleId=${vehicleId}`);
  };

  const getFilteredVehicles = () => {
    switch (filterStatus) {
      case 'overdue':
        return vehicleStatusList.filter(v => v.status === 'overdue');
      case 'due_soon':
        return vehicleStatusList.filter(v => v.status === 'due_soon');
      case 'good':
        return vehicleStatusList.filter(v => v.status === 'ok');
      case 'all':
      default:
        return vehicleStatusList;
    }
  };

  const filteredVehicles = getFilteredVehicles();

  if (loading && !selectedTeamId) {
    return (
      <div className="minimalist-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="minimalist-container">
      {/* Page Header */}
      <div className="minimalist-page-header">
        <h1 className="minimalist-page-title">Dashboard</h1>
        <p className="minimalist-page-subtitle">Welcome, {user?.displayName || user?.email}!</p>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Team Selector */}
      {teams.length > 0 && (
        <div className="minimalist-team-selector">
          <label htmlFor="team-select">Select Team</label>
          <select
            id="team-select"
            className="minimalist-team-select"
            value={selectedTeamId || ''}
            onChange={handleTeamChange}
          >
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {teams.length === 0 && !loading && (
        <Alert variant="info">
          No teams found. <a href="/teams">Create a team</a> to get started.
        </Alert>
      )}

      {selectedTeamId && vehicleStatusList.length === 0 && !loading && (
        <Alert variant="info">
          No vehicles found in this team. <a href="/vehicles">Add a vehicle</a> to get started.
        </Alert>
      )}

      {selectedTeamId && vehicleStatusList.length > 0 && (
        <>
          {/* Filters */}
          <div className="minimalist-filters">
            <button
              className={`minimalist-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All Vehicles ({vehicleStatusList.length})
            </button>
            <button
              className={`minimalist-filter-btn ${filterStatus === 'overdue' ? 'active' : ''}`}
              onClick={() => setFilterStatus('overdue')}
            >
              Overdue ({vehicleStatusList.filter(v => v.status === 'overdue').length})
            </button>
            <button
              className={`minimalist-filter-btn ${filterStatus === 'due_soon' ? 'active' : ''}`}
              onClick={() => setFilterStatus('due_soon')}
            >
              Due Soon ({vehicleStatusList.filter(v => v.status === 'due_soon').length})
            </button>
            <button
              className={`minimalist-filter-btn ${filterStatus === 'good' ? 'active' : ''}`}
              onClick={() => setFilterStatus('good')}
            >
              Good Standing ({vehicleStatusList.filter(v => v.status === 'ok').length})
            </button>
          </div>

          {/* Vehicle Cards Grid */}
          {filteredVehicles.length === 0 ? (
            <div className="minimalist-empty-state">
              <div className="minimalist-empty-state-icon">🚗</div>
              <p className="minimalist-empty-state-text">
                {filterStatus === 'overdue' && 'No vehicles with overdue maintenance'}
                {filterStatus === 'due_soon' && 'No vehicles with maintenance due soon'}
                {filterStatus === 'good' && 'No vehicles in good standing'}
              </p>
            </div>
          ) : (
            <div className="minimalist-vehicles-grid">
              {filteredVehicles.map(({ vehicle, status, itemCount, nextServiceInfo }) => {
                const statusText = getStatusText(status);
                const usageLabel = vehicle.usage_unit === 'hours' ? 'hours' : 'km';
                const currentUsage = vehicle.current_usage || 0;

                return (
                  <div
                    key={vehicle.id}
                    className="minimalist-vehicle-card"
                    onClick={() => handleVehicleClick(vehicle.id)}
                  >
                    {/* Vehicle Header */}
                    <div className="minimalist-vehicle-header">
                      <div>
                        <div className="minimalist-vehicle-name">{vehicle.name}</div>
                        <div className="minimalist-vehicle-model">{vehicle.make} {vehicle.model}</div>
                      </div>
                      <span className={`minimalist-status-badge status-${status}`}>
                        {statusText}
                      </span>
                    </div>

                    {/* Vehicle Stats */}
                    <div className="minimalist-vehicle-stats">
                      <div className="minimalist-stat">
                        <div className="minimalist-stat-label">Current Usage</div>
                        <div className="minimalist-stat-value">
                          {currentUsage.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>{usageLabel}</span>
                        </div>
                      </div>
                      <div className="minimalist-stat">
                        <div className="minimalist-stat-label">Maintenance Items</div>
                        <div className="minimalist-stat-value">{itemCount}</div>
                      </div>
                    </div>

                    {/* Next Service */}
                    {nextServiceInfo && (
                      <div className={`minimalist-next-service status-${status}`}>
                        <div className="minimalist-next-service-title">Next Service</div>
                        <div className="minimalist-next-service-item">{nextServiceInfo.name}</div>
                        <div className="minimalist-next-service-due">{nextServiceInfo.remaining}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
