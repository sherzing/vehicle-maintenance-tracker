import { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Spinner, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTeams } from '../../services/firebase/teams';
import { getTeamVehicles } from '../../services/firebase/vehicles';
import VehicleList from './VehicleList';
import CreateVehicleModal from './CreateVehicleModal';

export default function VehiclesPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTeams();
  }, [user]);

  useEffect(() => {
    if (selectedTeamId) {
      loadVehicles();
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const userTeams = await getUserTeams(user.uid);
      setTeams(userTeams);

      // Auto-select first team if none selected
      if (userTeams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(userTeams[0].id);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    if (!selectedTeamId) return;

    setLoading(true);
    setError(null);
    try {
      const teamVehicles = await getTeamVehicles(selectedTeamId);
      setVehicles(teamVehicles);

      // Auto-select first vehicle if none selected
      if (teamVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(teamVehicles[0].id);
      }
    } catch (err) {
      console.error('Failed to load vehicles:', err);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleCreated = async () => {
    await loadVehicles();
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  if (loading && teams.length === 0) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (teams.length === 0) {
    return (
      <Container className="mt-4">
        <Alert variant="info">
          You need to create or join a team before adding vehicles.
          <Alert.Link href="/teams"> Go to Teams</Alert.Link>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Vehicles</h2>
              <p className="text-muted">
                Manage vehicles and track their maintenance.
              </p>
            </div>
            {teams.length > 1 && (
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary">
                  Team: {selectedTeam?.name || 'Select Team'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {teams.map(team => (
                    <Dropdown.Item
                      key={team.id}
                      active={team.id === selectedTeamId}
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      {team.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Row>
        <Col md={6} lg={4}>
          <VehicleList
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onVehicleSelect={setSelectedVehicleId}
            onCreateVehicle={() => setShowCreateModal(true)}
          />
        </Col>
      </Row>

      {selectedTeamId && (
        <CreateVehicleModal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          onVehicleCreated={handleVehicleCreated}
          teamId={selectedTeamId}
        />
      )}
    </Container>
  );
}
