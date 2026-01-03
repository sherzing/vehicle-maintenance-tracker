/**
 * Calculate remaining usage until service is due
 * @param {number} lastServicedUsage - Usage when last serviced
 * @param {number} interval - Service interval
 * @param {number} currentUsage - Current usage
 * @returns {number} Remaining usage until service due
 */
export function calculateRemainingUsage(lastServicedUsage, interval, currentUsage) {
  if (lastServicedUsage === null || lastServicedUsage === undefined) {
    return -1; // Overdue (never serviced)
  }
  return (lastServicedUsage + interval) - currentUsage;
}

/**
 * Calculate remaining time in months until service is due
 * @param {Date} lastServicedDate - Date when last serviced
 * @param {number} intervalMonths - Service interval in months
 * @param {Date} currentDate - Current date (defaults to now)
 * @returns {number} Remaining months until service due
 */
export function calculateRemainingTime(lastServicedDate, intervalMonths, currentDate = new Date()) {
  if (!lastServicedDate) {
    return -1; // Overdue (never serviced)
  }

  const dueDate = new Date(lastServicedDate);
  dueDate.setMonth(dueDate.getMonth() + intervalMonths);

  const monthsDiff = (dueDate - currentDate) / (1000 * 60 * 60 * 24 * 30.44); // Average month
  return monthsDiff;
}

/**
 * Determine service status based on remaining usage/time
 * @param {number} remaining - Remaining usage or time
 * @param {number} interval - Total interval
 * @returns {'overdue'|'warning'|'good'} Status
 */
export function getServiceStatus(remaining, interval) {
  const WARNING_THRESHOLD = 0.10; // 10%

  if (remaining <= 0) {
    return 'overdue';
  }

  if (remaining < (interval * WARNING_THRESHOLD)) {
    return 'warning';
  }

  return 'good';
}

/**
 * Get the overall status for a maintenance item (whichever is more urgent)
 * @param {Object} item - Maintenance item with intervals and last serviced info
 * @param {number} currentUsage - Current vehicle usage
 * @param {Date} currentDate - Current date
 * @returns {Object} Status object with color, remaining usage, and remaining time
 */
export function getMaintenanceItemStatus(item, currentUsage, currentDate = new Date()) {
  const remainingUsage = calculateRemainingUsage(
    item.last_serviced_usage,
    item.primary_interval,
    currentUsage
  );

  const usageStatus = getServiceStatus(remainingUsage, item.primary_interval);

  // If no time interval set, return usage-based status only
  if (!item.secondary_interval) {
    return {
      status: usageStatus,
      remainingUsage,
      remainingTime: null,
    };
  }

  const remainingTime = calculateRemainingTime(
    item.last_serviced_date,
    item.secondary_interval,
    currentDate
  );

  const timeStatus = getServiceStatus(
    remainingTime,
    item.secondary_interval
  );

  // Return whichever is more urgent (overdue > warning > good)
  const statusPriority = { overdue: 3, warning: 2, good: 1 };
  const finalStatus = statusPriority[usageStatus] >= statusPriority[timeStatus]
    ? usageStatus
    : timeStatus;

  return {
    status: finalStatus,
    remainingUsage,
    remainingTime,
  };
}

/**
 * Get status color for UI display
 * @param {'overdue'|'warning'|'good'} status
 * @returns {string} Bootstrap color variant
 */
export function getStatusColor(status) {
  const colors = {
    overdue: 'danger',
    warning: 'warning',
    good: 'success',
  };
  return colors[status] || 'secondary';
}
