import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { logUsageUpdate } from '../../services/firebase/usageHistory';

export default function LogUsageModal({ show, onHide, onUsageLogged, vehicle, user }) {
  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [usage, setUsage] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [usageType, setUsageType] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setShowWarning(false);

    const usageValue = parseFloat(usage);

    // Validate usage is a valid number
    if (!usage || isNaN(usageValue)) {
      setError('Please enter a valid usage value');
      return;
    }

    // Validate date is not in future
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for comparison
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      setError('Date cannot be in the future');
      return;
    }

    // Warn if usage is lower than current for today's date
    const currentUsage = vehicle?.current_usage || 0;
    const isToday = date === getTodayString();
    if (isToday && usageValue < currentUsage) {
      setShowWarning(true);
      // Don't return - allow user to proceed
    }

    setLoading(true);
    try {
      await logUsageUpdate(
        vehicle.id,
        usageValue,
        new Date(date),
        usageType.trim() || null,
        location.trim() || null,
        user.uid
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setUsage('');
        setDate(getTodayString());
        setUsageType('');
        setLocation('');
        setShowWarning(false);
        onUsageLogged();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to log usage:', err);
      setError(err.message || 'Failed to log usage. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !success) {
      setUsage('');
      setDate(getTodayString());
      setUsageType('');
      setLocation('');
      setError(null);
      setShowWarning(false);
      onHide();
    }
  };

  const usageLabel = vehicle?.usage_unit === 'hours' ? 'hours' : 'km';
  const currentUsage = vehicle?.current_usage || 0;

  // Calculate change
  const usageValue = parseFloat(usage);
  const changeAmount = !isNaN(usageValue) ? usageValue - currentUsage : 0;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Log Usage</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Usage logged successfully!</Alert>}

          {showWarning && (
            <Alert variant="warning">
              <strong>Lower Usage Detected:</strong> You're logging a usage value
              ({usageValue} {usageLabel}) that's lower than the current reading
              ({currentUsage} {usageLabel}) for today's date. This is allowed for
              corrections, but please verify this is correct.
            </Alert>
          )}

          {vehicle && (
            <div className="mb-3">
              <h6>{vehicle.name}</h6>
              <p className="text-muted mb-2">
                Current usage: <strong>{currentUsage.toLocaleString()} {usageLabel}</strong>
              </p>
              <small className="text-muted">
                Log odometer/hour meter readings with optional context. You can log past
                readings - the system will automatically track the most recent entry.
              </small>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label htmlFor="log-usage-date">Date *</Form.Label>
            <Form.Control
              id="log-usage-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading || success}
              max={getTodayString()}
              required
            />
            <Form.Text className="text-muted">
              Date of this usage reading (cannot be in the future)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="log-usage-value">Usage ({usageLabel}) *</Form.Label>
            <Form.Control
              id="log-usage-value"
              type="number"
              placeholder={`e.g., ${currentUsage + (vehicle?.usage_unit === 'hours' ? 10 : 1000)}`}
              value={usage}
              onChange={(e) => {
                setUsage(e.target.value);
                setShowWarning(false);
              }}
              disabled={loading || success}
              step="0.1"
              autoFocus
            />
            <Form.Text className="text-muted">
              Odometer or hour meter reading (can be any value for historical entries)
            </Form.Text>
          </Form.Group>

          {usage && !isNaN(usageValue) && (
            <Alert variant={changeAmount >= 0 ? 'info' : 'secondary'}>
              <small>
                <strong>Change from current:</strong> {changeAmount >= 0 ? '+' : ''}{changeAmount.toLocaleString()} {usageLabel}
              </small>
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label htmlFor="log-usage-type">Usage Type (Optional)</Form.Label>
            <Form.Control
              id="log-usage-type"
              type="text"
              placeholder='e.g., "track day", "commute", "road trip"'
              value={usageType}
              onChange={(e) => setUsageType(e.target.value)}
              disabled={loading || success}
            />
            <Form.Text className="text-muted">
              Categorize this usage update (optional, free text)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="log-usage-location">Location (Optional)</Form.Label>
            <Form.Control
              id="log-usage-location"
              type="text"
              placeholder='e.g., "Laguna Seca", "Home", "Road trip to Vegas"'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading || success}
            />
            <Form.Text className="text-muted">
              Where this reading was taken (optional, free text)
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? 'Logging...' : success ? 'Logged!' : 'Log Usage'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
