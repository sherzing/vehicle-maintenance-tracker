import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { updateUsageHistory, deleteUsageHistory, resolveUsageConflict } from '../../services/firebase/usageHistory';
import { rateLimiter } from '../../utils/rateLimiter';
import { handleError } from '../../utils/errorHandler';

export default function EditUsageModal({ show, onHide, onUsageUpdated, usageEntry, usageUnit = 'km', user }) {
  const [formData, setFormData] = useState({
    usage: '',
    date: '',
    usageType: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [customValue, setCustomValue] = useState('');

  useEffect(() => {
    if (usageEntry) {
      const date = usageEntry.date?.toDate ? usageEntry.date.toDate() : new Date(usageEntry.date);
      setFormData({
        usage: usageEntry.usage !== null && usageEntry.usage !== undefined ? usageEntry.usage : '',
        date: date.toISOString().split('T')[0],
        usageType: usageEntry.usage_type || '',
        location: usageEntry.location || '',
      });
    }
  }, [usageEntry]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Check rate limit (1 second between submissions, max 10 per minute)
    const rateLimitKey = `updateUsage-${usageEntry?.id || 'unknown'}`;
    const rateLimitCheck = rateLimiter.checkLimit(rateLimitKey, 1000, 10);
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.reason);
      return;
    }

    // Validate usage
    const usageValue = parseFloat(formData.usage);
    if (!formData.usage || isNaN(usageValue)) {
      setError('Please provide a valid usage value');
      return;
    }

    // Validate date
    if (!formData.date) {
      setError('Please provide a date');
      return;
    }

    // Validate date is not in future
    // Compare date strings directly to avoid timezone issues
    const todayString = new Date().toISOString().split('T')[0];
    if (formData.date > todayString) {
      setError('Date cannot be in the future');
      return;
    }

    setLoading(true);
    try {
      const date = new Date(formData.date);
      const usageType = formData.usageType ? formData.usageType.trim() : null;
      const location = formData.location ? formData.location.trim() : null;

      // Pass version for optimistic locking to prevent race conditions
      const result = await updateUsageHistory(usageEntry.id, usageValue, date, usageType, location, user?.uid, usageEntry.version);

      // Record successful operation for rate limiting
      rateLimiter.recordOperation(rateLimitKey);

      // Check if there's a conflict
      if (result.conflict) {
        setConflictInfo(result.conflictInfo);
        setShowConflictDialog(true);
        setLoading(false);
        return;
      }

      // No conflict - success
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onUsageUpdated();
        onHide();
      }, 1000);
    } catch (err) {
      setError(handleError(err, 'update'));
      setLoading(false);
    }
  };

  const handleConflictResolution = async (chosenValue) => {
    setLoading(true);
    setError(null);

    try {
      // Get vehicle ID from the usage entry
      const vehicleId = usageEntry.vehicle_id;
      await resolveUsageConflict(vehicleId, chosenValue);

      setShowConflictDialog(false);
      setConflictInfo(null);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        setCustomValue('');
        onUsageUpdated();
        onHide();
      }, 1000);
    } catch (err) {
      setError(handleError(err, 'update'));
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const usageLabel = usageUnit === 'hours' ? 'hours' : 'km';
    if (!confirm(`Are you sure you want to delete this usage entry (${usageEntry.usage} ${usageLabel})? This action cannot be undone.`)) {
      return;
    }

    // Check rate limit (1 second between operations, max 5 deletes per minute)
    const rateLimitKey = `deleteUsage-${usageEntry?.id || 'unknown'}`;
    const rateLimitCheck = rateLimiter.checkLimit(rateLimitKey, 1000, 5);
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.reason);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteUsageHistory(usageEntry.id);

      // Record successful operation for rate limiting
      rateLimiter.recordOperation(rateLimitKey);

      setTimeout(() => {
        setDeleting(false);
        onUsageUpdated();
        onHide();
      }, 500);
    } catch (err) {
      setError(handleError(err, 'delete'));
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!loading && !success && !deleting) {
      setError(null);
      setConflictInfo(null);
      setShowConflictDialog(false);
      setCustomValue('');
      onHide();
    }
  };

  const usageLabel = usageUnit === 'hours' ? 'hours' : 'km';

  if (!usageEntry) return null;

  return (
    <>
      <Modal show={show && !showConflictDialog} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Usage Entry</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Usage updated successfully!</Alert>}

          <div className="mb-3">
            <small className="text-muted">
              Update the usage entry details. The vehicle's current usage will be automatically recalculated based on the most recent date.
            </small>
          </div>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="edit-usage-date">Date *</Form.Label>
            <Form.Control
              id="edit-usage-date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              disabled={loading || success || deleting}
              max={new Date().toISOString().split('T')[0]}
              required
            />
            <Form.Text className="text-muted">
              Date of this usage reading (cannot be in the future)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="edit-usage-value">Usage ({usageLabel}) *</Form.Label>
            <Form.Control
              id="edit-usage-value"
              type="number"
              name="usage"
              placeholder={`e.g., 45000`}
              value={formData.usage}
              onChange={handleChange}
              disabled={loading || success || deleting}
              step="0.1"
              required
            />
            <Form.Text className="text-muted">
              The usage reading
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="edit-usage-type">Usage Type (Optional)</Form.Label>
            <Form.Control
              id="edit-usage-type"
              type="text"
              name="usageType"
              placeholder='e.g., "track day", "commute", "road trip"'
              value={formData.usageType}
              onChange={handleChange}
              disabled={loading || success || deleting}
            />
            <Form.Text className="text-muted">
              Categorize this usage update
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="edit-usage-location">Location (Optional)</Form.Label>
            <Form.Control
              id="edit-usage-location"
              type="text"
              name="location"
              placeholder='e.g., "Laguna Seca", "Home"'
              value={formData.location}
              onChange={handleChange}
              disabled={loading || success || deleting}
            />
            <Form.Text className="text-muted">
              Where this reading was taken
            </Form.Text>
          </Form.Group>

          <Alert variant="info" className="mb-0">
            <small>
              <strong>Note:</strong> The vehicle's current usage is always calculated from the most recent entry by date. Changing the date may affect which entry is considered current.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button
            variant="outline-danger"
            onClick={handleDelete}
            disabled={loading || success || deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Entry'}
          </Button>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading || success || deleting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading || success || deleting}>
              {loading ? 'Updating...' : success ? 'Updated!' : 'Update Usage'}
            </Button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>

      {/* Conflict Resolution Dialog */}
      <Modal show={showConflictDialog} onHide={() => setShowConflictDialog(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>⚠️ Usage Conflict Detected</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Usage updated successfully!</Alert>}

          <Alert variant="warning">
            <strong>Inconsistent Usage Data Detected</strong>
            <p className="mb-0 mt-2">
              You're updating this usage entry to <strong>{conflictInfo?.newUsage} {usageLabel}</strong> for
              a past date, but there are later entries with lower values. This is impossible since
              odometer/hour meters only go up.
            </p>
          </Alert>

          <div className="mb-3">
            <h6>Conflict Details:</h6>
            <ul>
              <li>Updated entry usage: <strong>{conflictInfo?.newUsage} {usageLabel}</strong></li>
              <li>Current vehicle usage: <strong>{conflictInfo?.currentUsage} {usageLabel}</strong></li>
              <li>Highest later entry: <strong>{conflictInfo?.highestLaterUsage} {usageLabel}</strong></li>
              <li>Number of conflicting later entries: <strong>{conflictInfo?.conflictingEntries?.length}</strong></li>
            </ul>
          </div>

          <div className="mb-3">
            <h6>Choose Current Usage Value:</h6>
            <p className="text-muted small">
              The usage history entry has been updated. Please select which value should be used
              as the vehicle's current usage for maintenance calculations:
            </p>

            <div className="d-grid gap-2">
              <Button
                variant="outline-primary"
                onClick={() => handleConflictResolution(conflictInfo?.newUsage)}
                disabled={loading}
              >
                Use Updated Entry Value: {conflictInfo?.newUsage} {usageLabel}
                <div className="small text-muted">This is the value you just updated</div>
              </Button>

              <Button
                variant="outline-primary"
                onClick={() => handleConflictResolution(conflictInfo?.highestLaterUsage)}
                disabled={loading}
              >
                Use Highest Later Value: {conflictInfo?.highestLaterUsage} {usageLabel}
                <div className="small text-muted">From a more recent entry (recommended for consistency)</div>
              </Button>

              <div>
                <Form.Group>
                  <Form.Label>Or enter custom value:</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="number"
                      placeholder="Enter custom usage"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      disabled={loading}
                      step="0.1"
                    />
                    <Button
                      variant="outline-primary"
                      onClick={() => handleConflictResolution(parseFloat(customValue))}
                      disabled={loading || !customValue || isNaN(parseFloat(customValue))}
                    >
                      Use Custom
                    </Button>
                  </div>
                </Form.Group>
              </div>
            </div>
          </div>

          <Alert variant="info" className="mb-0">
            <small>
              <strong>Tip:</strong> Review your usage history entries to identify and correct
              any data entry errors. You can edit or delete entries from the service history view.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConflictDialog(false)} disabled={loading}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
