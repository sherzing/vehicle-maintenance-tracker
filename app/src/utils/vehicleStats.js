/**
 * Utility functions for vehicle statistics and display
 */

/**
 * Calculate days in service since vehicle creation
 * @param {Date|Timestamp} createdAt - Vehicle creation timestamp
 * @returns {number} Days in service
 */
export function calculateDaysInService(createdAt) {
  if (!createdAt) return 0;

  const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return days;
}

/**
 * Format date for display (e.g., "Jan 2024")
 * @param {Date|Timestamp} timestamp - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format timeline date into { day, monthYear } for service history
 * @param {Date|Timestamp} timestamp - Service date
 * @returns {object} { day: string, monthYear: string }
 */
export function formatTimelineDate(timestamp) {
  if (!timestamp) {
    return { day: '--', monthYear: 'Unknown' };
  }

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const day = date.getDate();
  const monthYear = date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });

  return {
    day: String(day),
    monthYear
  };
}

/**
 * Calculate total maintenance cost from service history
 * @param {Array} serviceHistory - Array of service history entries
 * @param {number} months - Number of months to look back (default: 12)
 * @returns {number|null} Total cost or null if no data
 */
export function calculateTotalCost(serviceHistory, months = 12) {
  if (!serviceHistory || serviceHistory.length === 0) {
    return null;
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  const total = serviceHistory
    .filter(entry => {
      const entryDate = entry.service_date?.toDate
        ? entry.service_date.toDate()
        : new Date(entry.service_date);
      return entryDate >= cutoffDate && entry.cost != null;
    })
    .reduce((sum, entry) => sum + (Number(entry.cost) || 0), 0);

  return total > 0 ? total : null;
}

/**
 * Calculate next service due based on maintenance items
 * @param {Array} maintenanceItems - Array of maintenance items with status info
 * @param {number} currentUsage - Current vehicle usage
 * @param {string} usageUnit - Usage unit (km or hours)
 * @returns {object|null} Next service info or null
 */
export function calculateNextServiceDue(maintenanceItems, currentUsage, usageUnit) {
  if (!maintenanceItems || maintenanceItems.length === 0) {
    return null;
  }

  // Find item with highest percentage (closest to due)
  let nextItem = null;
  let highestPercentage = -1; // Start at -1 to ensure we pick at least one item

  maintenanceItems.forEach(item => {
    // Calculate usage-based due date
    if (item.usage_interval) {
      const lastServiceUsage = item.last_service_usage || 0;
      const usageSinceService = currentUsage - lastServiceUsage;
      const percentage = usageSinceService / item.usage_interval;

      if (percentage > highestPercentage) {
        highestPercentage = percentage;
        const dueUsage = lastServiceUsage + item.usage_interval;
        const remaining = Math.max(0, dueUsage - currentUsage);

        nextItem = {
          name: item.name,
          dueUsage: dueUsage,
          remaining: remaining > 0
            ? `in ${Math.round(remaining).toLocaleString()} ${usageUnit}`
            : 'Due now'
        };
      }
    }
  });

  return nextItem;
}
