import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../lib/models/maintenance_item.dart';
import '../../lib/models/vehicle.dart';
import '../../lib/widgets/status_badge.dart';
import '../../lib/widgets/vehicle_card.dart';
import '../../lib/widgets/maintenance_item_card.dart';

void main() {
  // ---------------------------------------------------------------------------
  // StatusBadge
  // ---------------------------------------------------------------------------
  group('StatusBadge', () {
    Widget buildBadge(MaintenanceStatus status) {
      return MaterialApp(
        home: Scaffold(body: StatusBadge(status: status)),
      );
    }

    testWidgets('renders "OK" for MaintenanceStatus.ok', (tester) async {
      await tester.pumpWidget(buildBadge(MaintenanceStatus.ok));
      expect(find.text('OK'), findsOneWidget);
    });

    testWidgets('renders "Due Soon" for MaintenanceStatus.dueSoon',
        (tester) async {
      await tester.pumpWidget(buildBadge(MaintenanceStatus.dueSoon));
      expect(find.text('Due Soon'), findsOneWidget);
    });

    testWidgets('renders "Due" for MaintenanceStatus.due', (tester) async {
      await tester.pumpWidget(buildBadge(MaintenanceStatus.due));
      expect(find.text('Due'), findsOneWidget);
    });

    testWidgets('renders "Overdue" for MaintenanceStatus.overdue',
        (tester) async {
      await tester.pumpWidget(buildBadge(MaintenanceStatus.overdue));
      expect(find.text('Overdue'), findsOneWidget);
    });
  });

  // ---------------------------------------------------------------------------
  // VehicleCard
  // ---------------------------------------------------------------------------
  group('VehicleCard', () {
    Vehicle makeVehicle({
      VehicleType type = VehicleType.car,
      String? make = 'Toyota',
      String? model = 'Camry',
      int? year = 2023,
    }) {
      return Vehicle(
        id: 'v1',
        teamId: 't1',
        name: 'Test Vehicle',
        type: type,
        usageUnit: UsageUnit.km,
        currentUsage: 5000,
        make: make,
        model: model,
        year: year,
        createdAt: DateTime(2024, 1, 1),
        updatedAt: DateTime(2024, 1, 1),
      );
    }

    Widget buildCard(Vehicle vehicle, {VoidCallback? onTap}) {
      return MaterialApp(
        home: Scaffold(body: VehicleCard(vehicle: vehicle, onTap: onTap)),
      );
    }

    testWidgets('renders vehicle year, make, and model', (tester) async {
      final vehicle = makeVehicle();
      await tester.pumpWidget(buildCard(vehicle));

      expect(find.text('2023 Toyota Camry'), findsOneWidget);
    });

    testWidgets('renders vehicle subtitle', (tester) async {
      final vehicle = makeVehicle();
      await tester.pumpWidget(buildCard(vehicle));

      // subtitle for this vehicle: "Toyota Camry 2023"
      expect(find.text(vehicle.subtitle), findsOneWidget);
    });

    testWidgets('shows chevron_right icon', (tester) async {
      await tester.pumpWidget(buildCard(makeVehicle()));
      expect(find.byIcon(Icons.chevron_right), findsOneWidget);
    });

    testWidgets('calls onTap when tapped', (tester) async {
      var tapped = false;
      await tester.pumpWidget(buildCard(makeVehicle(), onTap: () {
        tapped = true;
      }));

      await tester.tap(find.byType(InkWell));
      expect(tapped, isTrue);
    });

    testWidgets('shows directions_car icon for car type', (tester) async {
      await tester
          .pumpWidget(buildCard(makeVehicle(type: VehicleType.car)));
      expect(find.byIcon(Icons.directions_car), findsOneWidget);
    });

    testWidgets('shows two_wheeler icon for motorcycle type', (tester) async {
      await tester
          .pumpWidget(buildCard(makeVehicle(type: VehicleType.motorcycle)));
      expect(find.byIcon(Icons.two_wheeler), findsOneWidget);
    });

    testWidgets('shows commute icon for other/unknown type', (tester) async {
      await tester
          .pumpWidget(buildCard(makeVehicle(type: VehicleType.other)));
      expect(find.byIcon(Icons.commute), findsOneWidget);
    });
  });

  // ---------------------------------------------------------------------------
  // MaintenanceItemCard
  // ---------------------------------------------------------------------------
  group('MaintenanceItemCard', () {
    MaintenanceItem makeItem({
      String name = 'Oil Change',
      MaintenanceStatus status = MaintenanceStatus.ok,
      double percentage = 45,
      double? usageInterval,
      int? timeIntervalDays,
    }) {
      return MaintenanceItem(
        id: 'm1',
        vehicleId: 'v1',
        name: name,
        status: status,
        percentage: percentage,
        usageInterval: usageInterval,
        timeIntervalDays: timeIntervalDays,
        createdAt: DateTime(2024, 1, 1),
        updatedAt: DateTime(2024, 1, 1),
      );
    }

    Widget buildCard(MaintenanceItem item, {VoidCallback? onTap}) {
      return MaterialApp(
        home: Scaffold(
          body: MaintenanceItemCard(item: item, onTap: onTap),
        ),
      );
    }

    testWidgets('renders item name', (tester) async {
      await tester.pumpWidget(buildCard(makeItem(name: 'Oil Change')));
      expect(find.text('Oil Change'), findsOneWidget);
    });

    testWidgets('renders StatusBadge with item status', (tester) async {
      await tester.pumpWidget(
          buildCard(makeItem(status: MaintenanceStatus.overdue)));
      expect(find.byType(StatusBadge), findsOneWidget);
      expect(find.text('Overdue'), findsOneWidget);
    });

    testWidgets('renders percentage text', (tester) async {
      await tester.pumpWidget(buildCard(makeItem(percentage: 72)));
      expect(find.text('72% used'), findsOneWidget);
    });

    testWidgets('renders LinearProgressIndicator', (tester) async {
      await tester.pumpWidget(buildCard(makeItem(percentage: 50)));
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
    });

    testWidgets('shows usage interval info when provided', (tester) async {
      await tester.pumpWidget(
        buildCard(makeItem(usageInterval: 5000)),
      );
      expect(find.text('Every 5000 usage units'), findsOneWidget);
    });

    testWidgets('shows time interval info when provided', (tester) async {
      await tester.pumpWidget(
        buildCard(makeItem(timeIntervalDays: 90)),
      );
      expect(find.text('Every 90 days'), findsOneWidget);
    });

    testWidgets('shows both intervals when both provided', (tester) async {
      await tester.pumpWidget(
        buildCard(makeItem(usageInterval: 5000, timeIntervalDays: 180)),
      );
      expect(find.text('Every 5000 usage units'), findsOneWidget);
      expect(find.text('Every 180 days'), findsOneWidget);
    });

    testWidgets('hides interval section when no intervals set',
        (tester) async {
      await tester.pumpWidget(buildCard(makeItem()));
      expect(find.text('Every 5000 usage units'), findsNothing);
      expect(find.textContaining('days'), findsNothing);
    });

    testWidgets('calls onTap when tapped', (tester) async {
      var tapped = false;
      await tester.pumpWidget(buildCard(makeItem(), onTap: () {
        tapped = true;
      }));

      await tester.tap(find.byType(InkWell));
      expect(tapped, isTrue);
    });
  });
}
