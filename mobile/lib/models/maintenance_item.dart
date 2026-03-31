enum MaintenanceStatus { ok, dueSoon, due, overdue }

class MaintenanceItem {
  final String id;
  final String vehicleId;
  final String name;
  final double? usageInterval;
  final int? timeIntervalDays;
  final double? lastServiceUsage;
  final DateTime? lastServiceDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Calculated fields (from API list response)
  final MaintenanceStatus status;
  final double percentage;
  final String? primaryReason;
  final double? usageRemaining;
  final double? daysRemaining;

  MaintenanceItem({
    required this.id,
    required this.vehicleId,
    required this.name,
    this.usageInterval,
    this.timeIntervalDays,
    this.lastServiceUsage,
    this.lastServiceDate,
    required this.createdAt,
    required this.updatedAt,
    this.status = MaintenanceStatus.ok,
    this.percentage = 0,
    this.primaryReason,
    this.usageRemaining,
    this.daysRemaining,
  });

  factory MaintenanceItem.fromJson(Map<String, dynamic> json) {
    return MaintenanceItem(
      id: json['id'] as String,
      vehicleId: json['vehicle_id'] as String,
      name: json['name'] as String,
      usageInterval: (json['usage_interval'] as num?)?.toDouble(),
      timeIntervalDays: json['time_interval_days'] as int?,
      lastServiceUsage: (json['last_service_usage'] as num?)?.toDouble(),
      lastServiceDate: json['last_service_date'] != null
          ? DateTime.parse(json['last_service_date'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      status: _parseStatus(json['status'] as String?),
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
      primaryReason: json['primary_reason'] as String?,
      usageRemaining: (json['usage_remaining'] as num?)?.toDouble(),
      daysRemaining: (json['days_remaining'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'vehicle_id': vehicleId,
        'name': name,
        if (usageInterval != null) 'usage_interval': usageInterval,
        if (timeIntervalDays != null) 'time_interval_days': timeIntervalDays,
        if (lastServiceUsage != null) 'last_service_usage': lastServiceUsage,
        if (lastServiceDate != null)
          'last_service_date': lastServiceDate!.toIso8601String(),
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'status': status.name == 'dueSoon' ? 'due_soon' : status.name,
        'percentage': percentage,
        if (primaryReason != null) 'primary_reason': primaryReason,
        if (usageRemaining != null) 'usage_remaining': usageRemaining,
        if (daysRemaining != null) 'days_remaining': daysRemaining,
      };

  Map<String, dynamic> toCreateJson() => {
        'name': name,
        if (usageInterval != null) 'usage_interval': usageInterval,
        if (timeIntervalDays != null) 'time_interval_days': timeIntervalDays,
        if (lastServiceUsage != null) 'last_service_usage': lastServiceUsage,
        if (lastServiceDate != null)
          'last_service_date': lastServiceDate!.toIso8601String(),
      };

  static MaintenanceStatus _parseStatus(String? s) {
    switch (s) {
      case 'due_soon':
        return MaintenanceStatus.dueSoon;
      case 'due':
        return MaintenanceStatus.due;
      case 'overdue':
        return MaintenanceStatus.overdue;
      default:
        return MaintenanceStatus.ok;
    }
  }
}
