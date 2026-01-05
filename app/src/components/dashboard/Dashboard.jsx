import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Badge, ListGroup, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTeams } from '../../services/firebase/teams';
import { getTeamVehicles } from '../../services/firebase/vehicles';
import { getVehicleMaintenanceItems } from '../../services/firebase/maintenanceItems';
import { getMaintenanceStatus, getStatusBadgeVariant, getStatusText } from '../../utils/maintenanceStatus';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceStats, setMaintenanceStats] = useState({
    totalVehicles: 0,
    totalItems: 0,
    overdueCount: 0,
    dueSoonCount: 0,
  });
  const [vehicleStatusList, setVehicleStatusList] = useState([]);

  useEffect(() => {
    if (user?.uid) {
      loadDashboardData();
    }
  }, [user?.uid]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Load all teams for the user
      const teams = await getUserTeams(user.uid);

      if (teams.length === 0) {
        setLoading(false);
        return;
      }

      // Load all vehicles from all teams
      const vehiclePromises = teams.map(team => getTeamVehicles(team.id));
      const vehicleArrays = await Promise.all(vehiclePromises);
      const allVehicles = vehicleArrays.flat();

      setVehicles(allVehicles);

      // Load maintenance items for each vehicle
      const vehicleData = await Promise.all(
        allVehicles.map(async (vehicle) => {
          const items = await getVehicleMaintenanceItems(vehicle.id);
          return { vehicle, items };
        })
      );

      // Calculate statistics
      let totalItems = 0;
      let overdueCount = 0;
      let dueSoonCount = 0;
      const statusList = [];

      vehicleData.forEach(({ vehicle, items }) => {
        totalItems += items.length;

        // Calculate status for each maintenance item
        const itemStatuses = items.map(item => {
          const status = getMaintenanceStatus(item, vehicle.current_usage || 0, vehicle.usage_unit || 'km');
          if (status.status === 'overdue') overdueCount++;
          if (status.status === 'due_soon') dueSoonCount++;
          return { item, status };
        });

        // Determine overall vehicle status (worst status wins)
        let vehicleStatus = 'ok';
        if (itemStatuses.some(is => is.status.status === 'overdue')) {
          vehicleStatus = 'overdue';
        } else if (itemStatuses.some(is => is.status.status === 'due_soon')) {
          vehicleStatus = 'due_soon';
        }

        statusList.push({
          vehicle,
          status: vehicleStatus,
          itemCount: items.length,
          overdueItems: itemStatuses.filter(is => is.status.status === 'overdue').length,
          dueSoonItems: itemStatuses.filter(is => is.status.status === 'due_soon').length,
        });
      });

      // Sort by status priority (overdue first, then due soon, then ok)
      statusList.sort((a, b) => {
        const statusOrder = { overdue: 0, due_soon: 1, ok: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setMaintenanceStats({
        totalVehicles: allVehicles.length,
        totalItems,
        overdueCount,
        dueSoonCount,
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

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  const hasTeams = vehicles.length > 0 || !loading;

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1>Dashboard</h1>
              <p className="text-muted mb-0">Welcome, {user?.displayName || user?.email}!</p>
            </div>
            <Button
              variant="outline-primary"
              onClick={loadDashboardData}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Reload'}
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Row className="mt-4">
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Vehicles</Card.Title>
              <Card.Text className="display-4">{maintenanceStats.totalVehicles}</Card.Text>
              <Card.Text className="text-muted">
                {maintenanceStats.totalVehicles === 0 ? 'No vehicles yet' : 'Total vehicles'}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Maintenance Items</Card.Title>
              <Card.Text className="display-4">{maintenanceStats.totalItems}</Card.Text>
              <Card.Text className="text-muted">
                {maintenanceStats.totalItems === 0 ? 'No items tracked' : 'Total maintenance items'}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Service Status</Card.Title>
              <div className="d-flex gap-3 align-items-center">
                {maintenanceStats.overdueCount > 0 && (
                  <div>
                    <div className="display-4 text-danger">{maintenanceStats.overdueCount}</div>
                    <small className="text-muted">Overdue</small>
                  </div>
                )}
                {maintenanceStats.dueSoonCount > 0 && (
                  <div>
                    <div className="display-4 text-warning">{maintenanceStats.dueSoonCount}</div>
                    <small className="text-muted">Due Soon</small>
                  </div>
                )}
                {maintenanceStats.overdueCount === 0 && maintenanceStats.dueSoonCount === 0 && maintenanceStats.totalItems > 0 && (
                  <div>
                    <div className="display-4 text-success">✓</div>
                    <small className="text-muted">All caught up!</small>
                  </div>
                )}
                {maintenanceStats.totalItems === 0 && (
                  <small className="text-muted">No maintenance items yet</small>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {!loading && vehicleStatusList.length === 0 && maintenanceStats.totalVehicles === 0 && (
        <Row className="mt-4">
          <Col>
            <Alert variant="info">
              No vehicles found. Try clicking the <strong>Reload</strong> button above, or{' '}
              <a href="/teams">create a team</a> and <a href="/vehicles">add a vehicle</a> to get started.
            </Alert>
          </Col>
        </Row>
      )}

      {vehicleStatusList.length > 0 ? (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Your Vehicles</h5>
              </Card.Header>
              <ListGroup variant="flush">
                {vehicleStatusList.map(({ vehicle, status, itemCount, overdueItems, dueSoonItems }) => {
                  const statusVariant = getStatusBadgeVariant(status);
                  const statusText = getStatusText(status);

                  return (
                    <ListGroup.Item
                      key={vehicle.id}
                      action
                      onClick={() => handleVehicleClick(vehicle.id)}
                      className="cursor-pointer"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <strong>{vehicle.name}</strong>
                            <Badge bg={statusVariant}>{statusText}</Badge>
                          </div>
                          <small className="text-muted">
                            {itemCount} maintenance item{itemCount !== 1 ? 's' : ''}
                            {overdueItems > 0 && (
                              <span className="text-danger ms-2">
                                • {overdueItems} overdue
                              </span>
                            )}
                            {dueSoonItems > 0 && (
                              <span className="text-warning ms-2">
                                • {dueSoonItems} due soon
                              </span>
                            )}
                          </small>
                        </div>
                        <div className="text-muted">
                          <small>Click to view →</small>
                        </div>
                      </div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Body>
                <Card.Title>Getting Started</Card.Title>
                <Card.Text>
                  Welcome to Vehicle Maintenance Tracker! Here&apos;s what you can do:
                </Card.Text>
                <ul>
                  <li>Create or join a team to manage vehicles with others</li>
                  <li>Add your vehicles (cars, motorcycles, bicycles, etc.)</li>
                  <li>Define maintenance schedules with usage and time intervals</li>
                  <li>Track service history and get alerts when maintenance is due</li>
                </ul>
                <Card.Text>
                  <a href="/teams">Go to Teams</a> to get started, or{' '}
                  <a href="/vehicles">add a vehicle</a> now.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}
