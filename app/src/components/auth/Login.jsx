import { useState } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { signInWithGoogle, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Vehicle Maintenance Tracker</h2>
            <p className="text-center text-muted mb-4">
              Sign in to manage your vehicles and maintenance schedules
            </p>

            {error && <Alert variant="danger">{error}</Alert>}

            <Button
              variant="primary"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-100"
              size="lg"
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Signing in...
                </>
              ) : (
                <>
                  <i className="bi bi-google me-2"></i>
                  Sign in with Google
                </>
              )}
            </Button>

            <div className="text-center mt-3">
              <small className="text-muted">
                By signing in, you agree to our terms of service
              </small>
            </div>
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
}
