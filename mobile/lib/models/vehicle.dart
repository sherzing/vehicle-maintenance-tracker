enum VehicleType { car, motorcycle, bicycle, other }

enum UsageUnit { km, hours }

class Vehicle {
  final String id;
  final String teamId;
  final String name;
  final VehicleType type;
  final UsageUnit usageUnit;
  final double currentUsage;
  final String? make;
  final String? model;
  final int? year;
  final String? vin;
  final String? raceNumber;
  final String? nickname;
  final DateTime createdAt;
  final DateTime updatedAt;

  Vehicle({
    required this.id,
    required this.teamId,
    required this.name,
    required this.type,
    required this.usageUnit,
    required this.currentUsage,
    this.make,
    this.model,
    this.year,
    this.vin,
    this.raceNumber,
    this.nickname,
    required this.createdAt,
    required this.updatedAt,
  });

  String get displayUsage {
    final unit = usageUnit == UsageUnit.km ? 'km' : 'hrs';
    if (currentUsage >= 1000 && usageUnit == UsageUnit.km) {
      return '${(currentUsage / 1000).toStringAsFixed(1)}k $unit';
    }
    return '${currentUsage.toStringAsFixed(0)} $unit';
  }

  String get subtitle {
    final parts = <String>[];
    if (make != null && make!.isNotEmpty) parts.add(make!);
    if (model != null && model!.isNotEmpty) parts.add(model!);
    if (year != null && year! > 0) parts.add(year.toString());
    return parts.isEmpty ? type.name : parts.join(' ');
  }

  factory Vehicle.fromJson(Map<String, dynamic> json) => Vehicle(
        id: json['id'] as String,
        teamId: json['team_id'] as String,
        name: json['name'] as String,
        type: VehicleType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => VehicleType.car,
        ),
        usageUnit: json['usage_unit'] == 'hours' ? UsageUnit.hours : UsageUnit.km,
        currentUsage: (json['current_usage'] as num).toDouble(),
        make: json['make'] as String?,
        model: json['model'] as String?,
        year: json['year'] as int?,
        vin: json['vin'] as String?,
        raceNumber: json['race_number'] as String?,
        nickname: json['nickname'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'team_id': teamId,
        'name': name,
        'type': type.name,
        'usage_unit': usageUnit == UsageUnit.hours ? 'hours' : 'km',
        'current_usage': currentUsage,
        if (make != null) 'make': make,
        if (model != null) 'model': model,
        if (year != null) 'year': year,
        if (vin != null) 'vin': vin,
        if (raceNumber != null) 'race_number': raceNumber,
        if (nickname != null) 'nickname': nickname,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };
}
