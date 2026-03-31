import 'package:flutter_test/flutter_test.dart';
import '../../lib/models/team.dart';
import '../../lib/models/vehicle.dart';
import '../../lib/models/maintenance_item.dart';
import '../../lib/models/service_history.dart';
import '../../lib/models/usage_history.dart';

void main() {
  // ─── Team ───────────────────────────────────────────────────────────

  group('Team', () {
    final now = DateTime.utc(2026, 3, 15, 10, 30);
    final later = DateTime.utc(2026, 3, 16, 12, 0);

    Map<String, dynamic> sampleTeamJson() => {
          'id': 'team-1',
          'name': 'Racing Team Alpha',
          'owner_id': 'user-42',
          'member_ids': ['user-42', 'user-43', 'user-44'],
          'created_at': now.toIso8601String(),
          'updated_at': later.toIso8601String(),
        };

    test('fromJson parses all fields correctly', () {
      final team = Team.fromJson(sampleTeamJson());
      expect(team.id, 'team-1');
      expect(team.name, 'Racing Team Alpha');
      expect(team.ownerId, 'user-42');
      expect(team.memberIds, ['user-42', 'user-43', 'user-44']);
      expect(team.createdAt, now);
      expect(team.updatedAt, later);
    });

    test('toJson produces correct map', () {
      final team = Team.fromJson(sampleTeamJson());
      final json = team.toJson();
      expect(json['id'], 'team-1');
      expect(json['owner_id'], 'user-42');
      expect(json['member_ids'], ['user-42', 'user-43', 'user-44']);
      expect(json['created_at'], now.toIso8601String());
      expect(json['updated_at'], later.toIso8601String());
    });

    test('round-trip fromJson/toJson preserves data', () {
      final original = sampleTeamJson();
      final team = Team.fromJson(original);
      final roundTripped = team.toJson();
      expect(roundTripped, original);
    });

    test('fromJson with empty member_ids list', () {
      final json = sampleTeamJson()..['member_ids'] = <String>[];
      final team = Team.fromJson(json);
      expect(team.memberIds, isEmpty);
    });
  });

  // ─── Vehicle ────────────────────────────────────────────────────────

  group('Vehicle', () {
    final now = DateTime.utc(2026, 1, 1);

    Map<String, dynamic> fullVehicleJson() => {
          'id': 'v-1',
          'team_id': 'team-1',
          'name': 'Track Car',
          'type': 'car',
          'usage_unit': 'km',
          'current_usage': 12345.6,
          'make': 'Toyota',
          'model': 'GR86',
          'year': 2024,
          'vin': 'ABC123',
          'race_number': '42',
          'nickname': 'Speedy',
          'created_at': now.toIso8601String(),
          'updated_at': now.toIso8601String(),
        };

    test('fromJson parses all fields including nullable ones', () {
      final v = Vehicle.fromJson(fullVehicleJson());
      expect(v.id, 'v-1');
      expect(v.teamId, 'team-1');
      expect(v.name, 'Track Car');
      expect(v.type, VehicleType.car);
      expect(v.usageUnit, UsageUnit.km);
      expect(v.currentUsage, 12345.6);
      expect(v.make, 'Toyota');
      expect(v.model, 'GR86');
      expect(v.year, 2024);
      expect(v.vin, 'ABC123');
      expect(v.raceNumber, '42');
      expect(v.nickname, 'Speedy');
    });

    test('fromJson with null optional fields', () {
      final json = {
        'id': 'v-2',
        'team_id': 'team-1',
        'name': 'Bike',
        'type': 'bicycle',
        'usage_unit': 'km',
        'current_usage': 100,
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
      };
      final v = Vehicle.fromJson(json);
      expect(v.make, isNull);
      expect(v.model, isNull);
      expect(v.year, isNull);
      expect(v.vin, isNull);
      expect(v.raceNumber, isNull);
      expect(v.nickname, isNull);
      expect(v.type, VehicleType.bicycle);
    });

    test('fromJson defaults unknown type to car', () {
      final json = fullVehicleJson()..['type'] = 'spaceship';
      final v = Vehicle.fromJson(json);
      expect(v.type, VehicleType.car);
    });

    test('fromJson parses hours usage unit', () {
      final json = fullVehicleJson()..['usage_unit'] = 'hours';
      final v = Vehicle.fromJson(json);
      expect(v.usageUnit, UsageUnit.hours);
    });

    test('fromJson defaults non-hours usage unit to km', () {
      final json = fullVehicleJson()..['usage_unit'] = 'miles';
      final v = Vehicle.fromJson(json);
      expect(v.usageUnit, UsageUnit.km);
    });

    test('round-trip fromJson/toJson preserves data', () {
      final original = fullVehicleJson();
      final v = Vehicle.fromJson(original);
      final json = v.toJson();
      expect(json, original);
    });

    test('toJson omits null optional fields', () {
      final json = {
        'id': 'v-2',
        'team_id': 'team-1',
        'name': 'Bike',
        'type': 'bicycle',
        'usage_unit': 'km',
        'current_usage': 500.0,
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
      };
      final v = Vehicle.fromJson(json);
      final output = v.toJson();
      expect(output.containsKey('make'), isFalse);
      expect(output.containsKey('model'), isFalse);
      expect(output.containsKey('year'), isFalse);
      expect(output.containsKey('vin'), isFalse);
      expect(output.containsKey('race_number'), isFalse);
      expect(output.containsKey('nickname'), isFalse);
    });

    group('displayUsage', () {
      Vehicle makeVehicle({
        required double usage,
        UsageUnit unit = UsageUnit.km,
      }) =>
          Vehicle(
            id: 'v',
            teamId: 't',
            name: 'Test',
            type: VehicleType.car,
            usageUnit: unit,
            currentUsage: usage,
            createdAt: now,
            updatedAt: now,
          );

      test('formats km >= 1000 with k suffix', () {
        expect(makeVehicle(usage: 12345.6).displayUsage, '12.3k km');
      });

      test('formats km == 1000 with k suffix', () {
        expect(makeVehicle(usage: 1000.0).displayUsage, '1.0k km');
      });

      test('formats km < 1000 without k suffix', () {
        expect(makeVehicle(usage: 500.0).displayUsage, '500 km');
      });

      test('formats km == 0', () {
        expect(makeVehicle(usage: 0.0).displayUsage, '0 km');
      });

      test('formats hours without k suffix even if >= 1000', () {
        expect(
          makeVehicle(usage: 1500.0, unit: UsageUnit.hours).displayUsage,
          '1500 hrs',
        );
      });

      test('formats hours < 1000', () {
        expect(
          makeVehicle(usage: 150.0, unit: UsageUnit.hours).displayUsage,
          '150 hrs',
        );
      });
    });

    group('subtitle', () {
      Vehicle makeVehicle({String? make, String? model, int? year}) => Vehicle(
            id: 'v',
            teamId: 't',
            name: 'Test',
            type: VehicleType.motorcycle,
            usageUnit: UsageUnit.km,
            currentUsage: 0,
            make: make,
            model: model,
            year: year,
            createdAt: DateTime.utc(2026),
            updatedAt: DateTime.utc(2026),
          );

      test('returns make model year when all present', () {
        expect(
          makeVehicle(make: 'Honda', model: 'CBR600', year: 2023).subtitle,
          'Honda CBR600 2023',
        );
      });

      test('returns make model when year is null', () {
        expect(
          makeVehicle(make: 'Honda', model: 'CBR600').subtitle,
          'Honda CBR600',
        );
      });

      test('returns make only', () {
        expect(makeVehicle(make: 'Honda').subtitle, 'Honda');
      });

      test('returns model year when make is null', () {
        expect(
          makeVehicle(model: 'CBR600', year: 2023).subtitle,
          'CBR600 2023',
        );
      });

      test('falls back to type name when all null', () {
        expect(makeVehicle().subtitle, 'motorcycle');
      });

      test('falls back to type name when fields are empty strings', () {
        expect(makeVehicle(make: '', model: '').subtitle, 'motorcycle');
      });

      test('ignores year <= 0', () {
        expect(
          makeVehicle(make: 'Honda', year: 0).subtitle,
          'Honda',
        );
      });
    });
  });

  // ─── MaintenanceItem ───────────────────────────────────────────────

  group('MaintenanceItem', () {
    final now = DateTime.utc(2026, 2, 1);
    final lastService = DateTime.utc(2025, 12, 1);

    Map<String, dynamic> fullMaintenanceJson() => {
          'id': 'm-1',
          'vehicle_id': 'v-1',
          'name': 'Oil Change',
          'usage_interval': 5000.0,
          'time_interval_days': 180,
          'last_service_usage': 10000.0,
          'last_service_date': lastService.toIso8601String(),
          'created_at': now.toIso8601String(),
          'updated_at': now.toIso8601String(),
          'status': 'due_soon',
          'percentage': 75.5,
          'primary_reason': 'usage',
          'usage_remaining': 1250.0,
          'days_remaining': 45.0,
        };

    test('fromJson parses all fields', () {
      final item = MaintenanceItem.fromJson(fullMaintenanceJson());
      expect(item.id, 'm-1');
      expect(item.vehicleId, 'v-1');
      expect(item.name, 'Oil Change');
      expect(item.usageInterval, 5000.0);
      expect(item.timeIntervalDays, 180);
      expect(item.lastServiceUsage, 10000.0);
      expect(item.lastServiceDate, lastService);
      expect(item.status, MaintenanceStatus.dueSoon);
      expect(item.percentage, 75.5);
      expect(item.primaryReason, 'usage');
      expect(item.usageRemaining, 1250.0);
      expect(item.daysRemaining, 45.0);
    });

    test('fromJson with minimal fields uses defaults', () {
      final json = {
        'id': 'm-2',
        'vehicle_id': 'v-1',
        'name': 'Tire Check',
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
      };
      final item = MaintenanceItem.fromJson(json);
      expect(item.usageInterval, isNull);
      expect(item.timeIntervalDays, isNull);
      expect(item.lastServiceUsage, isNull);
      expect(item.lastServiceDate, isNull);
      expect(item.status, MaintenanceStatus.ok);
      expect(item.percentage, 0);
      expect(item.primaryReason, isNull);
      expect(item.usageRemaining, isNull);
      expect(item.daysRemaining, isNull);
    });

    test('round-trip fromJson/toJson preserves data', () {
      final original = fullMaintenanceJson();
      final item = MaintenanceItem.fromJson(original);
      final json = item.toJson();
      expect(json, original);
    });

    test('toJson omits null optional fields', () {
      final json = {
        'id': 'm-2',
        'vehicle_id': 'v-1',
        'name': 'Tire Check',
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
      };
      final item = MaintenanceItem.fromJson(json);
      final output = item.toJson();
      expect(output.containsKey('usage_interval'), isFalse);
      expect(output.containsKey('time_interval_days'), isFalse);
      expect(output.containsKey('last_service_usage'), isFalse);
      expect(output.containsKey('last_service_date'), isFalse);
      expect(output.containsKey('primary_reason'), isFalse);
      expect(output.containsKey('usage_remaining'), isFalse);
      expect(output.containsKey('days_remaining'), isFalse);
    });

    test('toCreateJson includes only create-relevant fields', () {
      final item = MaintenanceItem.fromJson(fullMaintenanceJson());
      final createJson = item.toCreateJson();
      expect(createJson['name'], 'Oil Change');
      expect(createJson['usage_interval'], 5000.0);
      expect(createJson['time_interval_days'], 180);
      expect(createJson['last_service_usage'], 10000.0);
      expect(createJson['last_service_date'], lastService.toIso8601String());
      // Should not contain id, vehicle_id, status, percentage, etc.
      expect(createJson.containsKey('id'), isFalse);
      expect(createJson.containsKey('vehicle_id'), isFalse);
      expect(createJson.containsKey('status'), isFalse);
      expect(createJson.containsKey('percentage'), isFalse);
      expect(createJson.containsKey('created_at'), isFalse);
    });

    test('toCreateJson omits null optional fields', () {
      final item = MaintenanceItem(
        id: 'm',
        vehicleId: 'v',
        name: 'Basic',
        createdAt: now,
        updatedAt: now,
      );
      final createJson = item.toCreateJson();
      expect(createJson, {'name': 'Basic'});
    });

    group('status parsing', () {
      MaintenanceItem withStatus(String? status) {
        final json = {
          'id': 'm',
          'vehicle_id': 'v',
          'name': 'Test',
          'created_at': now.toIso8601String(),
          'updated_at': now.toIso8601String(),
          'status': status,
        };
        return MaintenanceItem.fromJson(json);
      }

      test('parses "ok" status', () {
        // "ok" is not a case in the switch, so falls to default => ok
        expect(withStatus('ok').status, MaintenanceStatus.ok);
      });

      test('parses "due_soon" status', () {
        expect(withStatus('due_soon').status, MaintenanceStatus.dueSoon);
      });

      test('parses "due" status', () {
        expect(withStatus('due').status, MaintenanceStatus.due);
      });

      test('parses "overdue" status', () {
        expect(withStatus('overdue').status, MaintenanceStatus.overdue);
      });

      test('parses null status as ok', () {
        expect(withStatus(null).status, MaintenanceStatus.ok);
      });

      test('parses unknown string as ok', () {
        expect(withStatus('something_unknown').status, MaintenanceStatus.ok);
      });
    });

    test('toJson serialises dueSoon as due_soon', () {
      final json = fullMaintenanceJson()..['status'] = 'due_soon';
      final item = MaintenanceItem.fromJson(json);
      expect(item.toJson()['status'], 'due_soon');
    });

    test('toJson serialises other statuses by name', () {
      final json = fullMaintenanceJson()..['status'] = 'overdue';
      final item = MaintenanceItem.fromJson(json);
      expect(item.toJson()['status'], 'overdue');
    });
  });

  // ─── ServiceHistory ─────────────────────────────────────────────────

  group('ServiceHistory', () {
    final serviceDate = DateTime.utc(2026, 3, 1);
    final createdAt = DateTime.utc(2026, 3, 2);

    Map<String, dynamic> fullServiceJson() => {
          'id': 'sh-1',
          'vehicle_id': 'v-1',
          'type': 'service',
          'maintenance_item_id': 'm-1',
          'item_name': 'Oil Change',
          'service_usage': 15000.0,
          'service_date': serviceDate.toIso8601String(),
          'cost': 89.99,
          'provider': 'QuickLube',
          'logged_by': 'user-42',
          'created_at': createdAt.toIso8601String(),
        };

    test('fromJson parses service type', () {
      final sh = ServiceHistory.fromJson(fullServiceJson());
      expect(sh.id, 'sh-1');
      expect(sh.vehicleId, 'v-1');
      expect(sh.type, HistoryEntryType.service);
      expect(sh.maintenanceItemId, 'm-1');
      expect(sh.itemName, 'Oil Change');
      expect(sh.serviceUsage, 15000.0);
      expect(sh.serviceDate, serviceDate);
      expect(sh.cost, 89.99);
      expect(sh.provider, 'QuickLube');
      expect(sh.loggedBy, 'user-42');
      expect(sh.createdAt, createdAt);
    });

    test('fromJson parses repair type', () {
      final json = fullServiceJson()..['type'] = 'repair';
      final sh = ServiceHistory.fromJson(json);
      expect(sh.type, HistoryEntryType.repair);
    });

    test('fromJson defaults unknown type to service', () {
      final json = fullServiceJson()..['type'] = 'inspection';
      final sh = ServiceHistory.fromJson(json);
      expect(sh.type, HistoryEntryType.service);
    });

    test('fromJson with null optional fields', () {
      final json = {
        'id': 'sh-2',
        'vehicle_id': 'v-1',
        'type': 'service',
        'item_name': 'Brake Pad Swap',
        'service_date': serviceDate.toIso8601String(),
        'logged_by': 'user-1',
        'created_at': createdAt.toIso8601String(),
      };
      final sh = ServiceHistory.fromJson(json);
      expect(sh.maintenanceItemId, isNull);
      expect(sh.serviceUsage, isNull);
      expect(sh.cost, isNull);
      expect(sh.provider, isNull);
    });

    test('round-trip fromJson/toJson preserves data', () {
      final original = fullServiceJson();
      final sh = ServiceHistory.fromJson(original);
      final json = sh.toJson();
      expect(json, original);
    });

    test('toJson omits null optional fields', () {
      final sh = ServiceHistory(
        id: 'sh-2',
        vehicleId: 'v-1',
        type: HistoryEntryType.service,
        itemName: 'Check',
        serviceDate: serviceDate,
        loggedBy: 'user-1',
        createdAt: createdAt,
      );
      final json = sh.toJson();
      expect(json.containsKey('maintenance_item_id'), isFalse);
      expect(json.containsKey('service_usage'), isFalse);
      expect(json.containsKey('cost'), isFalse);
      expect(json.containsKey('provider'), isFalse);
    });

    test('toJson serialises repair type correctly', () {
      final sh = ServiceHistory(
        id: 'sh-3',
        vehicleId: 'v-1',
        type: HistoryEntryType.repair,
        itemName: 'Engine rebuild',
        serviceDate: serviceDate,
        loggedBy: 'user-1',
        createdAt: createdAt,
      );
      expect(sh.toJson()['type'], 'repair');
    });
  });

  // ─── UsageHistory ───────────────────────────────────────────────────

  group('UsageHistory', () {
    final date = DateTime.utc(2026, 3, 10);
    final createdAt = DateTime.utc(2026, 3, 10, 14, 0);

    test('fromJson parses all fields', () {
      final json = {
        'id': 'uh-1',
        'vehicle_id': 'v-1',
        'usage': 12500.5,
        'date': date.toIso8601String(),
        'usage_type': 'track_day',
        'location': 'Laguna Seca',
        'created_by': 'user-42',
        'created_at': createdAt.toIso8601String(),
        'version': 3,
      };
      final uh = UsageHistory.fromJson(json);
      expect(uh.id, 'uh-1');
      expect(uh.vehicleId, 'v-1');
      expect(uh.usage, 12500.5);
      expect(uh.date, date);
      expect(uh.usageType, 'track_day');
      expect(uh.location, 'Laguna Seca');
      expect(uh.createdBy, 'user-42');
      expect(uh.createdAt, createdAt);
      expect(uh.version, 3);
    });

    test('fromJson defaults version to 1 when absent', () {
      final json = {
        'id': 'uh-2',
        'vehicle_id': 'v-1',
        'usage': 500,
        'date': date.toIso8601String(),
        'created_by': 'user-1',
        'created_at': createdAt.toIso8601String(),
      };
      final uh = UsageHistory.fromJson(json);
      expect(uh.version, 1);
    });

    test('fromJson defaults version to 1 when null', () {
      final json = {
        'id': 'uh-3',
        'vehicle_id': 'v-1',
        'usage': 500,
        'date': date.toIso8601String(),
        'created_by': 'user-1',
        'created_at': createdAt.toIso8601String(),
        'version': null,
      };
      final uh = UsageHistory.fromJson(json);
      expect(uh.version, 1);
    });

    test('fromJson with null optional fields', () {
      final json = {
        'id': 'uh-4',
        'vehicle_id': 'v-1',
        'usage': 100,
        'date': date.toIso8601String(),
        'created_by': 'user-1',
        'created_at': createdAt.toIso8601String(),
        'version': 1,
      };
      final uh = UsageHistory.fromJson(json);
      expect(uh.usageType, isNull);
      expect(uh.location, isNull);
    });
  });

  // ─── LogUsageResponse ───────────────────────────────────────────────

  group('LogUsageResponse', () {
    test('fromJson without conflict', () {
      final json = {
        'entry_id': 'uh-1',
        'conflict': false,
      };
      final resp = LogUsageResponse.fromJson(json);
      expect(resp.entryId, 'uh-1');
      expect(resp.conflict, isFalse);
      expect(resp.conflictInfo, isNull);
    });

    test('fromJson defaults conflict to false when absent', () {
      final json = {
        'entry_id': 'uh-2',
      };
      final resp = LogUsageResponse.fromJson(json);
      expect(resp.conflict, isFalse);
      expect(resp.conflictInfo, isNull);
    });

    test('fromJson with conflict info', () {
      final json = {
        'entry_id': 'uh-3',
        'conflict': true,
        'conflict_info': {
          'new_usage': 5000.0,
          'current_usage': 6000.0,
          'highest_later_usage': 7000.0,
        },
      };
      final resp = LogUsageResponse.fromJson(json);
      expect(resp.entryId, 'uh-3');
      expect(resp.conflict, isTrue);
      expect(resp.conflictInfo, isNotNull);
      expect(resp.conflictInfo!.newUsage, 5000.0);
      expect(resp.conflictInfo!.currentUsage, 6000.0);
      expect(resp.conflictInfo!.highestLaterUsage, 7000.0);
    });

    test('fromJson with conflict true but no conflict_info', () {
      final json = {
        'entry_id': 'uh-4',
        'conflict': true,
      };
      final resp = LogUsageResponse.fromJson(json);
      expect(resp.conflict, isTrue);
      expect(resp.conflictInfo, isNull);
    });
  });

  // ─── UsageConflict ──────────────────────────────────────────────────

  group('UsageConflict', () {
    test('fromJson parses all fields', () {
      final json = {
        'new_usage': 3000.0,
        'current_usage': 4500.0,
        'highest_later_usage': 5200.0,
      };
      final conflict = UsageConflict.fromJson(json);
      expect(conflict.newUsage, 3000.0);
      expect(conflict.currentUsage, 4500.0);
      expect(conflict.highestLaterUsage, 5200.0);
    });

    test('fromJson handles int values (num coercion)', () {
      final json = {
        'new_usage': 3000,
        'current_usage': 4500,
        'highest_later_usage': 5200,
      };
      final conflict = UsageConflict.fromJson(json);
      expect(conflict.newUsage, 3000.0);
      expect(conflict.currentUsage, 4500.0);
      expect(conflict.highestLaterUsage, 5200.0);
    });
  });
}
