/**
 * Calculate the status of a maintenance item based on usage and time intervals
 */

const WARNING_THRESHOLD_LARGE = 0.9; // 90% - show warning when this close to due (for large intervals)
const WARNING_THRESHOLD_SMALL = 0.8; // 80% - show warning earlier for small intervals (20% remaining)

// Thresholds for determining "small" intervals
const SMALL_INTERVAL_KM = 1500; // km
const SMALL_INTERVAL_HOURS = 20; // hours

/**
 * Calculate usage-based status
 * @param {number} currentUsage - Current vehicle usage
 * @param {number} lastServiceUsage - Usage when last serviced
 * @param {number} usageInterval - Interval between services
 * @param {string} usageUnit - Unit of measurement ('km' or 'hours')
 * @returns {object} { percentage, isDue, isDueSoon }
 */
function calculateUsageStatus(currentUsage, lastServiceUsage, usageInterval, usageUnit = 'km') {
  if (!usageInterval || usageInterval === 0) {
    return null;
  }

  const lastService = lastServiceUsage || 0;
  const usageSinceService = currentUsage - lastService;
  const percentage = usageSinceService / usageInterval;

  // Determine threshold based on interval size
  const isSmallInterval = usageUnit === 'hours'
    ? usageInterval <= SMALL_INTERVAL_HOURS
    : usageInterval <= SMALL_INTERVAL_KM;

  const warningThreshold = isSmallInterval ? WARNING_THRESHOLD_SMALL : WARNING_THRESHOLD_LARGE;

  return {
    percentage,
    isDue: percentage >= 1,
    isDueSoon: percentage >= warningThreshold && percentage < 1,
    remaining: Math.max(0, usageInterval - usageSinceService),
  };
}

const SMALL_INTERVAL_DAYS = 30; // days

/**
 * Calculate time-based status
 * @param {Date|Timestamp} lastServiceDate - Date when last serviced
 * @param {number} timeIntervalDays - Days between services
 * @returns {object} { percentage, isDue, isDueSoon }
 */
function calculateTimeStatus(lastServiceDate, timeIntervalDays) {
  if (!timeIntervalDays || timeIntervalDays === 0) {
    return null;
  }

  const now = new Date();
  const lastService = lastServiceDate
    ? (lastServiceDate.toDate ? lastServiceDate.toDate() : new Date(lastServiceDate))
    : new Date(0); // If never serviced, use epoch (very old date)

  const daysSinceService = (now - lastService) / (1000 * 60 * 60 * 24);
  const percentage = daysSinceService / timeIntervalDays;

  // Use earlier warning for small time intervals too
  const isSmallInterval = timeIntervalDays <= SMALL_INTERVAL_DAYS;
  const warningThreshold = isSmallInterval ? WARNING_THRESHOLD_SMALL : WARNING_THRESHOLD_LARGE;

  return {
    percentage,
    isDue: percentage >= 1,
    isDueSoon: percentage >= warningThreshold && percentage < 1,
    remaining: Math.max(0, timeIntervalDays - daysSinceService),
  };
}

/**
 * Get the overall maintenance status for an item
 * @param {object} item - Maintenance item with intervals and last service info
 * @param {number} currentUsage - Current vehicle usage
 * @param {string} usageUnit - Unit of measurement ('km' or 'hours')
 * @returns {object} Status information
 */
export function getMaintenanceStatus(item, currentUsage, usageUnit = 'km') {
  const usageStatus = calculateUsageStatus(
    currentUsage || 0,
    item.last_service_usage,
    item.usage_interval,
    usageUnit
  );

  const timeStatus = calculateTimeStatus(
    item.last_service_date,
    item.time_interval_days
  );

  // Determine overall status based on whichever comes first
  let overallStatus = 'ok';
  let primaryReason = null;
  let percentage = 0;

  if (usageStatus && timeStatus) {
    // Both intervals exist - use whichever is closer to due
    const maxPercentage = Math.max(usageStatus.percentage, timeStatus.percentage);
    percentage = maxPercentage;

    if (usageStatus.isDue || timeStatus.isDue) {
      overallStatus = 'overdue';
      primaryReason = usageStatus.percentage > timeStatus.percentage ? 'usage' : 'time';
    } else if (usageStatus.isDueSoon || timeStatus.isDueSoon) {
      overallStatus = 'due_soon';
      primaryReason = usageStatus.percentage > timeStatus.percentage ? 'usage' : 'time';
    }
  } else if (usageStatus) {
    // Only usage interval
    percentage = usageStatus.percentage;
    if (usageStatus.isDue) {
      overallStatus = 'overdue';
      primaryReason = 'usage';
    } else if (usageStatus.isDueSoon) {
      overallStatus = 'due_soon';
      primaryReason = 'usage';
    }
  } else if (timeStatus) {
    // Only time interval
    percentage = timeStatus.percentage;
    if (timeStatus.isDue) {
      overallStatus = 'overdue';
      primaryReason = 'time';
    } else if (timeStatus.isDueSoon) {
      overallStatus = 'due_soon';
      primaryReason = 'time';
    }
  }

  return {
    status: overallStatus,
    percentage: Math.min(percentage, 1), // Cap at 100%
    primaryReason,
    usageStatus,
    timeStatus,
  };
}

/**
 * Get badge variant based on status
 */
export function getStatusBadgeVariant(status) {
  switch (status) {
    case 'overdue':
      return 'danger';
    case 'due_soon':
      return 'warning';
    case 'ok':
      return 'success';
    default:
      return 'secondary';
  }
}

/**
 * Get human-readable status text
 */
export function getStatusText(status) {
  switch (status) {
    case 'overdue':
      return 'Overdue';
    case 'due_soon':
      return 'Due Soon';
    case 'ok':
      return 'OK';
    default:
      return 'Unknown';
  }
}

/**
 * Format remaining usage/time for display
 */
export function formatRemaining(statusInfo, usageUnit = 'km') {
  if (!statusInfo) return null;

  const parts = [];

  if (statusInfo.usageStatus && statusInfo.usageStatus.remaining > 0) {
    const unit = usageUnit === 'hours' ? 'hours' : 'km';
    parts.push(`${Math.round(statusInfo.usageStatus.remaining)} ${unit}`);
  }

  if (statusInfo.timeStatus && statusInfo.timeStatus.remaining > 0) {
    const days = Math.round(statusInfo.timeStatus.remaining);
    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(' or ') : null;
}
