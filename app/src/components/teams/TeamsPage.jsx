import { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTeams } from '../../services/firebase/teams';
import TeamList from './TeamList';
import CreateTeamModal from './CreateTeamModal';

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTeams();
  }, [user]);

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

  const handleTeamCreated = async (teamId) => {
    await loadTeams();
    setSelectedTeamId(teamId);
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

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Teams</h2>
          <p className="text-muted">
            Manage your teams and collaborate with others on vehicle maintenance.
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Row>
        <Col md={6} lg={4}>
          <TeamList
            teams={teams}
            currentTeamId={selectedTeamId}
            onTeamSelect={setSelectedTeamId}
            onCreateTeam={() => setShowCreateModal(true)}
            userId={user.uid}
          />
        </Col>
      </Row>

      <CreateTeamModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onTeamCreated={handleTeamCreated}
        userId={user.uid}
      />
    </Container>
  );
}
