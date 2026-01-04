import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <h1>Dashboard</h1>
          <p className="text-muted">Welcome, {user?.displayName || user?.email}!</p>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Vehicles</Card.Title>
              <Card.Text className="display-4">0</Card.Text>
              <Card.Text className="text-muted">No vehicles yet</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Maintenance Items</Card.Title>
              <Card.Text className="display-4">0</Card.Text>
              <Card.Text className="text-muted">No items tracked</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Overdue Services</Card.Title>
              <Card.Text className="display-4 text-danger">0</Card.Text>
              <Card.Text className="text-muted">All caught up!</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                <li>Add your vehicles (cars and motorcycles)</li>
                <li>Define maintenance schedules with usage and time intervals</li>
                <li>Track service history and get alerts when maintenance is due</li>
              </ul>
              <Card.Text className="text-muted">
                Features coming soon in the next milestones!
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
