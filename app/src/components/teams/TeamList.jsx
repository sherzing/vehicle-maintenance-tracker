import { Card, ListGroup, Badge, Button } from 'react-bootstrap';

export default function TeamList({ teams, currentTeamId, onTeamSelect, onCreateTeam, onEditTeam, userId }) {
  if (!teams || teams.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <p className="text-muted mb-3">You haven't joined any teams yet.</p>
          <Button variant="primary" onClick={onCreateTeam}>
            Create Your First Team
          </Button>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Your Teams</h5>
        <Button variant="primary" size="sm" onClick={onCreateTeam}>
          + New Team
        </Button>
      </Card.Header>
      <ListGroup variant="flush">
        {teams.map((team) => {
          const isOwner = team.owner_id === userId;
          const isSelected = team.id === currentTeamId;
          const memberCount = team.member_ids?.length || 0;

          return (
            <ListGroup.Item
              key={team.id}
              action
              active={isSelected}
              onClick={() => onTeamSelect(team.id)}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <div className="fw-semibold">{team.name}</div>
                <small className="text-muted">
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </small>
              </div>
              <div className="d-flex gap-2 align-items-center">
                {isOwner && (
                  <>
                    <Badge bg="secondary" pill>
                      Owner
                    </Badge>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTeam(team);
                      }}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Card>
  );
}
