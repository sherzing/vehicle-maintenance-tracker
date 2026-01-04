import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { createTeam } from '../../services/firebase/teams';

export default function CreateTeamModal({ show, onHide, onTeamCreated, userId }) {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    try {
      const teamId = await createTeam(userId, teamName.trim());
      setSuccess(true);
      setTeamName('');

      // Show success message for 1 second before closing
      setTimeout(() => {
        setSuccess(false);
        onTeamCreated(teamId);
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to create team:', err);
      setError(err.message || 'Failed to create team. Please try again.');
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
          {success && <Alert variant="success">Team created successfully!</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Team Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={loading || success}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? 'Creating...' : success ? 'Created!' : 'Create Team'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
