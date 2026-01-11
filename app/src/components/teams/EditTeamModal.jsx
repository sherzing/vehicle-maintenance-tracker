import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, ListGroup, Badge } from 'react-bootstrap';
import { updateTeamName, addUserToTeam, removeUserFromTeam } from '../../services/firebase/teams';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase/config';

export default function EditTeamModal({ show, onHide, onTeamUpdated, team, currentUserId }) {
  const [teamName, setTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [members, setMembers] = useState([]);

  const isOwner = team?.owner_id === currentUserId;

  useEffect(() => {
    if (team) {
      setTeamName(team.name);
      loadMembers();
    }
  }, [team]);

  const loadMembers = async () => {
    if (!team?.member_ids || team.member_ids.length === 0) {
      setMembers([]);
      return;
    }

    try {
      // Fetch user details for all members
      const usersQuery = query(
        collection(db, 'users'),
        where('__name__', 'in', team.member_ids)
      );
      const snapshot = await getDocs(usersQuery);
      const memberData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers(memberData);
    } catch (err) {
      console.error('Failed to load members:', err);
      setMembers([]);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    setError(null);
    setSuccess(false);

    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    try {
      await updateTeamName(team.id, trimmedName);
      setSuccess(true);

      // Show success message briefly before calling callback
      setTimeout(() => {
        setSuccess(false);
        onTeamUpdated();
      }, 1000);
    } catch (err) {
      console.error('Failed to update team:', err);
      setError(err.message || 'Failed to update team. Please try again.');
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!isOwner) return;

    setError(null);
    const trimmedEmail = memberEmail.trim();

    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Find user by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', trimmedEmail)
      );
      const snapshot = await getDocs(usersQuery);

      if (snapshot.empty) {
        setError('User not found. Please make sure they have signed in at least once.');
        setLoading(false);
        return;
      }

      const userId = snapshot.docs[0].id;

      // Check if user is already a member
      if (team.member_ids.includes(userId)) {
        setError('This user is already a member of the team');
        setLoading(false);
        return;
      }

      await addUserToTeam(userId, team.id);
      setMemberEmail('');
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onTeamUpdated();
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to add member:', err);
      setError(err.message || 'Failed to add member. Please try again.');
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!isOwner) return;

    setError(null);
    setLoading(true);

    try {
      await removeUserFromTeam(userId, team.id);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onTeamUpdated();
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError(err.message || 'Failed to remove member. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTeamName(team?.name || '');
      setMemberEmail('');
      setError(null);
      setSuccess(false);
      onHide();
    }
  };

  if (!team) return null;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Edit Team</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {!isOwner && (
            <Alert variant="warning">
              Only the team owner can edit team settings.
            </Alert>
          )}

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Team updated successfully!</Alert>}

          <Form.Group className="mb-4">
            <Form.Label htmlFor="team-name-input">Team Name</Form.Label>
            <Form.Control
              id="team-name-input"
              type="text"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={loading || success || !isOwner}
              autoFocus
            />
          </Form.Group>

          <hr />

          <h6 className="mb-3">Team Members ({team.member_ids?.length || 0} members)</h6>

          {isOwner && (
            <Form.Group className="mb-3">
              <Form.Label>Add Member</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="email"
                  placeholder="Enter email address"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  disabled={loading || success || !isOwner}
                />
                <Button
                  variant="primary"
                  onClick={handleAddMember}
                  disabled={loading || success || !isOwner}
                >
                  Add Member
                </Button>
              </div>
              <Form.Text className="text-muted">
                Enter the email address of the person you want to add. They must have signed in at least once.
              </Form.Text>
            </Form.Group>
          )}

          <ListGroup>
            {members.map((member) => {
              const isMemberOwner = member.id === team.owner_id;
              return (
                <ListGroup.Item
                  key={member.id}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-semibold">{member.display_name || member.email}</div>
                    {member.display_name && (
                      <small className="text-muted">{member.email}</small>
                    )}
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    {isMemberOwner && (
                      <Badge bg="primary" pill>
                        Owner
                      </Badge>
                    )}
                    {isOwner && !isMemberOwner && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={loading || success}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading || success || !isOwner}
          >
            {loading ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
