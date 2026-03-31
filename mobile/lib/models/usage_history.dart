class UsageHistory {
  final String id;
  final String vehicleId;
  final double usage;
  final DateTime date;
  final String? usageType;
  final String? location;
  final String createdBy;
  final DateTime createdAt;
  final int version;

  UsageHistory({
    required this.id,
    required this.vehicleId,
    required this.usage,
    required this.date,
    this.usageType,
    this.location,
    required this.createdBy,
    required this.createdAt,
    required this.version,
  });

  factory UsageHistory.fromJson(Map<String, dynamic> json) => UsageHistory(
        id: json['id'] as String,
        vehicleId: json['vehicle_id'] as String,
        usage: (json['usage'] as num).toDouble(),
        date: DateTime.parse(json['date'] as String),
        usageType: json['usage_type'] as String?,
        location: json['location'] as String?,
        createdBy: json['created_by'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
        version: json['version'] as int? ?? 1,
      );
}

class LogUsageResponse {
  final String entryId;
  final bool conflict;
  final UsageConflict? conflictInfo;

  LogUsageResponse({
    required this.entryId,
    required this.conflict,
    this.conflictInfo,
  });

  factory LogUsageResponse.fromJson(Map<String, dynamic> json) =>
      LogUsageResponse(
        entryId: json['entry_id'] as String,
        conflict: json['conflict'] as bool? ?? false,
        conflictInfo: json['conflict_info'] != null
            ? UsageConflict.fromJson(json['conflict_info'])
            : null,
      );
}

class UsageConflict {
  final double newUsage;
  final double currentUsage;
  final double highestLaterUsage;

  UsageConflict({
    required this.newUsage,
    required this.currentUsage,
    required this.highestLaterUsage,
  });

  factory UsageConflict.fromJson(Map<String, dynamic> json) => UsageConflict(
        newUsage: (json['new_usage'] as num).toDouble(),
        currentUsage: (json['current_usage'] as num).toDouble(),
        highestLaterUsage: (json['highest_later_usage'] as num).toDouble(),
      );
}
