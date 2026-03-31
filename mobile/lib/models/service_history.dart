enum HistoryEntryType { service, repair }

class ServiceHistory {
  final String id;
  final String vehicleId;
  final HistoryEntryType type;
  final String? maintenanceItemId;
  final String itemName;
  final double? serviceUsage;
  final DateTime serviceDate;
  final double? cost;
  final String? provider;
  final String loggedBy;
  final DateTime createdAt;

  ServiceHistory({
    required this.id,
    required this.vehicleId,
    required this.type,
    this.maintenanceItemId,
    required this.itemName,
    this.serviceUsage,
    required this.serviceDate,
    this.cost,
    this.provider,
    required this.loggedBy,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'vehicle_id': vehicleId,
        'type': type == HistoryEntryType.repair ? 'repair' : 'service',
        if (maintenanceItemId != null) 'maintenance_item_id': maintenanceItemId,
        'item_name': itemName,
        if (serviceUsage != null) 'service_usage': serviceUsage,
        'service_date': serviceDate.toIso8601String(),
        if (cost != null) 'cost': cost,
        if (provider != null) 'provider': provider,
        'logged_by': loggedBy,
        'created_at': createdAt.toIso8601String(),
      };

  factory ServiceHistory.fromJson(Map<String, dynamic> json) => ServiceHistory(
        id: json['id'] as String,
        vehicleId: json['vehicle_id'] as String,
        type: json['type'] == 'repair'
            ? HistoryEntryType.repair
            : HistoryEntryType.service,
        maintenanceItemId: json['maintenance_item_id'] as String?,
        itemName: json['item_name'] as String,
        serviceUsage: (json['service_usage'] as num?)?.toDouble(),
        serviceDate: DateTime.parse(json['service_date'] as String),
        cost: (json['cost'] as num?)?.toDouble(),
        provider: json['provider'] as String?,
        loggedBy: json['logged_by'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}
