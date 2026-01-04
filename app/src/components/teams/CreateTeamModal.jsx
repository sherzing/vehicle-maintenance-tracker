import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { createTeam } from '../../services/firebase/teams';

export default function CreateTeamModal({ show, onHide, onTeamCreated, userId }) {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    try {
      const teamId = await createTeam(userId, teamName.trim());
      setTeamName('');
      onTeamCreated(teamId);
      onHide();
    } catch (err) {
      console.error('Failed to create team:', err);
      setError(err.message || 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTeamName('');
      setError(null);
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Team</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Team Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Team'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
