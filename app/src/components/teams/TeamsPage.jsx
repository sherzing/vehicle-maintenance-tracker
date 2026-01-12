import { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Spinner, Button } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTeams } from '../../services/firebase/teams';
import TeamList from './TeamList';
import CreateTeamModal from './CreateTeamModal';
import EditTeamModal from './EditTeamModal';
import ExportImportModal from './ExportImportModal';

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [showExportImportModal, setShowExportImportModal] = useState(false);

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

      // Get selected team from localStorage or use first team
      const storedTeamId = localStorage.getItem('selectedTeamId');
      if (storedTeamId && userTeams.some(t => t.id === storedTeamId)) {
        setSelectedTeamId(storedTeamId);
      } else if (userTeams.length > 0) {
        const firstTeamId = userTeams[0].id;
        setSelectedTeamId(firstTeamId);
        localStorage.setItem('selectedTeamId', firstTeamId);
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
    localStorage.setItem('selectedTeamId', teamId);
  };

  const handleTeamSelect = (teamId) => {
    setSelectedTeamId(teamId);
    localStorage.setItem('selectedTeamId', teamId);
  };

  const handleEditTeam = (team) => {
    setTeamToEdit(team);
    setShowEditModal(true);
  };

  const handleTeamUpdated = async () => {
    await loadTeams();
    setShowEditModal(false);
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

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Teams</h2>
          <p className="text-muted">
            Manage your teams and collaborate with others on vehicle maintenance.
          </p>
        </Col>
        <Col xs="auto">
          {selectedTeam && (
            <Button
              variant="outline-secondary"
              onClick={() => setShowExportImportModal(true)}
            >
              📥 Export / Import
            </Button>
          )}
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
            onTeamSelect={handleTeamSelect}
            onCreateTeam={() => setShowCreateModal(true)}
            onEditTeam={handleEditTeam}
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

      <EditTeamModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onTeamUpdated={handleTeamUpdated}
        team={teamToEdit}
        currentUserId={user.uid}
      />

      <ExportImportModal
        show={showExportImportModal}
        onHide={() => setShowExportImportModal(false)}
        team={selectedTeam}
        onImportComplete={loadTeams}
      />
    </Container>
  );
}
