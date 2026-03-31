// Screen widget tests for the Vehicle Maintenance Tracker.
//
// Note: LoginScreen tests are omitted because AuthProvider depends on
// FirebaseAuth which cannot be instantiated in pure unit tests.
// LoginScreen is simple enough (3 states: idle, loading, error) that
// the manual QA + provider unit tests provide adequate coverage.
//
// All other screens use our own providers (Team/Vehicle/Maintenance)
// which can be constructed with fake ApiClient and LocalDb.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import '../../lib/models/team.dart';
import '../../lib/models/vehicle.dart';
import '../../lib/models/maintenance_item.dart';
import '../../lib/models/service_history.dart';
import '../../lib/models/usage_history.dart';
import '../../lib/services/api_client.dart';
import '../../lib/services/local_db.dart';
import '../../lib/providers/team_provider.dart';
import '../../lib/providers/vehicle_provider.dart';
import '../../lib/providers/maintenance_provider.dart';
import '../../lib/screens/teams/team_list_screen.dart';
import '../../lib/screens/vehicles/vehicle_list_screen.dart';
import '../../lib/screens/vehicles/vehicle_detail_screen.dart';
import '../../lib/screens/vehicles/add_vehicle_screen.dart';
import '../../lib/screens/vehicles/log_usage_screen.dart';
import '../../lib/screens/maintenance/log_service_screen.dart';
import '../../lib/widgets/vehicle_card.dart';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeApiClient extends Fake implements ApiClient {
  List<Team> teamsResult = [];
  List<Vehicle> vehiclesResult = [];
  List<MaintenanceItem> maintenanceResult = [];
  List<ServiceHistory> historyResult = [];
  Vehicle? vehicleResult;
  Team? teamResult;
  LogUsageResponse? usageResponse;
  Exception? errorToThrow;

  @override
  Future<List<Team>> listTeams() async {
    if (errorToThrow != null) throw errorToThrow!;
    return teamsResult;
  }

  @override
  Future<Team> createTeam(String name) async {
    if (errorToThrow != null) throw errorToThrow!;
    return teamResult ?? _sampleTeam(name: name);
  }

  @override
  Future<void> deleteTeam(String id) async {
    if (errorToThrow != null) throw errorToThrow!;
  }

  @override
  Future<List<Vehicle>> listVehicles(String teamId) async {
    if (errorToThrow != null) throw errorToThrow!;
    return vehiclesResult;
  }

  @override
  Future<Vehicle> createVehicle(
      String teamId, Map<String, dynamic> body) async {
    if (errorToThrow != null) throw errorToThrow!;
    return vehicleResult ?? _sampleVehicle();
  }

  @override
  Future<Vehicle> getVehicle(String id) async {
    if (errorToThrow != null) throw errorToThrow!;
    return vehicleResult ?? _sampleVehicle();
  }

  @override
  Future<Vehicle> updateVehicle(String id, Map<String, dynamic> body) async {
    if (errorToThrow != null) throw errorToThrow!;
    return vehicleResult ?? _sampleVehicle();
  }

  @override
  Future<void> deleteVehicle(String id) async {
    if (errorToThrow != null) throw errorToThrow!;
  }

  @override
  Future<List<MaintenanceItem>> listMaintenanceItems(
      String vehicleId) async {
    if (errorToThrow != null) throw errorToThrow!;
    return maintenanceResult;
  }

  @override
  Future<MaintenanceItem> createMaintenanceItem(
      String vehicleId, Map<String, dynamic> body) async {
    if (errorToThrow != null) throw errorToThrow!;
    return _sampleMaintenanceItem();
  }

  @override
  Future<void> deleteMaintenanceItem(String id) async {
    if (errorToThrow != null) throw errorToThrow!;
  }

  @override
  Future<List<ServiceHistory>> listServiceHistory(String vehicleId) async {
    if (errorToThrow != null) throw errorToThrow!;
    return historyResult;
  }

  @override
  Future<ServiceHistory> logService(
      String vehicleId, Map<String, dynamic> body) async {
    if (errorToThrow != null) throw errorToThrow!;
    return _sampleServiceHistory();
  }

  @override
  Future<ServiceHistory> logRepair(
      String vehicleId, Map<String, dynamic> body) async {
    if (errorToThrow != null) throw errorToThrow!;
    return _sampleServiceHistory(type: HistoryEntryType.repair);
  }

  @override
  Future<LogUsageResponse> logUsage(
      String vehicleId, Map<String, dynamic> body) async {
    if (errorToThrow != null) throw errorToThrow!;
    return usageResponse ??
        LogUsageResponse(entryId: 'u1', conflict: false);
  }
}

class FakeLocalDb extends Fake implements LocalDb {
  final Map<String, dynamic> _cache = {};

  @override
  Future<dynamic> getCache(String key) async => _cache[key];

  @override
  Future<void> putCache(String key, dynamic data) async {
    _cache[key] = data;
  }
}

// ---------------------------------------------------------------------------
// Sample data factories
// ---------------------------------------------------------------------------

Team _sampleTeam({String id = 't1', String name = 'Test Team'}) => Team(
      id: id,
      name: name,
      ownerId: 'user1',
      memberIds: ['user1'],
      createdAt: DateTime(2025, 1, 1),
      updatedAt: DateTime(2025, 1, 1),
    );

Vehicle _sampleVehicle({
  String id = 'v1',
  String name = 'My Car',
  VehicleType type = VehicleType.car,
}) =>
    Vehicle(
      id: id,
      teamId: 't1',
      name: name,
      type: type,
      usageUnit: UsageUnit.km,
      currentUsage: 50000,
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      createdAt: DateTime(2025, 1, 1),
      updatedAt: DateTime(2025, 1, 1),
    );

MaintenanceItem _sampleMaintenanceItem({
  String id = 'm1',
  MaintenanceStatus status = MaintenanceStatus.ok,
  double percentage = 45,
}) =>
    MaintenanceItem(
      id: id,
      vehicleId: 'v1',
      name: 'Oil Change',
      usageInterval: 5000,
      timeIntervalDays: 180,
      createdAt: DateTime(2025, 1, 1),
      updatedAt: DateTime(2025, 1, 1),
      status: status,
      percentage: percentage,
    );

ServiceHistory _sampleServiceHistory({
  String id = 'sh1',
  HistoryEntryType type = HistoryEntryType.service,
}) =>
    ServiceHistory(
      id: id,
      vehicleId: 'v1',
      type: type,
      itemName: 'Oil Change',
      serviceUsage: 50000,
      serviceDate: DateTime(2025, 6, 15),
      cost: 75.0,
      loggedBy: 'user1',
      createdAt: DateTime(2025, 6, 15),
    );

// ---------------------------------------------------------------------------
// Helper: wrap widget with required providers
// ---------------------------------------------------------------------------

Widget _wrap(
  Widget child, {
  TeamProvider? teamProvider,
  VehicleProvider? vehicleProvider,
  MaintenanceProvider? maintenanceProvider,
}) {
  return MultiProvider(
    providers: [
      if (teamProvider != null)
        ChangeNotifierProvider<TeamProvider>.value(value: teamProvider),
      if (vehicleProvider != null)
        ChangeNotifierProvider<VehicleProvider>.value(value: vehicleProvider),
      if (maintenanceProvider != null)
        ChangeNotifierProvider<MaintenanceProvider>.value(
            value: maintenanceProvider),
    ],
    child: MaterialApp(home: child),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // =========================================================================
  // TeamListScreen
  // =========================================================================
  group('TeamListScreen', () {
    late FakeApiClient fakeApi;
    late FakeLocalDb fakeDb;
    late TeamProvider teamProvider;

    setUp(() {
      fakeApi = FakeApiClient();
      fakeDb = FakeLocalDb();
      teamProvider = TeamProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    testWidgets('shows empty state when no teams', (tester) async {
      fakeApi.teamsResult = [];
      await tester.pumpWidget(_wrap(
        const TeamListScreen(),
        teamProvider: teamProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.text('No teams yet'), findsOneWidget);
      expect(find.text('Create a team to get started'), findsOneWidget);
    });

    testWidgets('shows teams after loading', (tester) async {
      fakeApi.teamsResult = [
        _sampleTeam(id: 't1', name: 'Alpha Team'),
        _sampleTeam(id: 't2', name: 'Beta Team'),
      ];
      await tester.pumpWidget(_wrap(
        const TeamListScreen(),
        teamProvider: teamProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Alpha Team'), findsOneWidget);
      expect(find.text('Beta Team'), findsOneWidget);
      expect(find.text('1 member(s)'), findsNWidgets(2));
    });

    testWidgets('shows error state on API failure', (tester) async {
      fakeApi.errorToThrow = Exception('Server down');
      await tester.pumpWidget(_wrap(
        const TeamListScreen(),
        teamProvider: teamProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('Server down'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows create team dialog on FAB tap', (tester) async {
      fakeApi.teamsResult = [];
      await tester.pumpWidget(_wrap(
        const TeamListScreen(),
        teamProvider: teamProvider,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();

      expect(find.text('Create Team'), findsOneWidget);
      expect(find.text('Team name'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
    });

    testWidgets('creating team adds it to the list', (tester) async {
      fakeApi.teamsResult = [];
      fakeApi.teamResult = _sampleTeam(id: 't99', name: 'New Team');
      await tester.pumpWidget(_wrap(
        const TeamListScreen(),
        teamProvider: teamProvider,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'New Team');
      await tester.tap(find.text('Create'));
      await tester.pumpAndSettle();

      expect(find.text('New Team'), findsOneWidget);
    });

    testWidgets('shows loading indicator initially', (tester) async {
      // Use a delayed response to see loading state
      fakeApi.teamsResult = [];
      await tester.pumpWidget(_wrap(
        const TeamListScreen(),
        teamProvider: teamProvider,
      ));
      // Don't settle — check loading state
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows delete confirmation dialog on long press',
        (tester) async {
      fakeApi.teamsResult = [
        _sampleTeam(id: 't1', name: 'Alpha Team'),
      ];
      await tester.pumpWidget(_wrap(
        const TeamListScreen(),
        teamProvider: teamProvider,
      ));
      await tester.pumpAndSettle();

      await tester.longPress(find.text('Alpha Team'));
      await tester.pumpAndSettle();

      expect(find.text('Delete Team'), findsOneWidget);
      expect(find.textContaining('Alpha Team'), findsWidgets);
    });
  });

  // =========================================================================
  // VehicleListScreen
  // =========================================================================
  group('VehicleListScreen', () {
    late FakeApiClient fakeApi;
    late FakeLocalDb fakeDb;
    late VehicleProvider vehicleProvider;

    setUp(() {
      fakeApi = FakeApiClient();
      fakeDb = FakeLocalDb();
      vehicleProvider =
          VehicleProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    testWidgets('shows empty state when no vehicles', (tester) async {
      fakeApi.vehiclesResult = [];
      await tester.pumpWidget(_wrap(
        const VehicleListScreen(teamId: 't1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.text('No vehicles yet'), findsOneWidget);
      expect(
          find.text('Add a vehicle to start tracking maintenance'),
          findsOneWidget);
    });

    testWidgets('shows vehicle cards after loading', (tester) async {
      fakeApi.vehiclesResult = [
        _sampleVehicle(id: 'v1', name: 'Family SUV'),
        _sampleVehicle(id: 'v2', name: 'Work Truck'),
      ];
      await tester.pumpWidget(_wrap(
        const VehicleListScreen(teamId: 't1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.byType(VehicleCard), findsNWidgets(2));
    });

    testWidgets('shows error on API failure', (tester) async {
      fakeApi.errorToThrow = Exception('Network error');
      await tester.pumpWidget(_wrap(
        const VehicleListScreen(teamId: 't1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('Network error'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('has FAB for adding vehicles', (tester) async {
      fakeApi.vehiclesResult = [];
      await tester.pumpWidget(_wrap(
        const VehicleListScreen(teamId: 't1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.byType(FloatingActionButton), findsOneWidget);
    });
  });

  // =========================================================================
  // VehicleDetailScreen
  // =========================================================================
  group('VehicleDetailScreen', () {
    late FakeApiClient fakeApi;
    late FakeLocalDb fakeDb;
    late VehicleProvider vehicleProvider;
    late MaintenanceProvider maintenanceProvider;

    setUp(() {
      fakeApi = FakeApiClient();
      fakeDb = FakeLocalDb();
      vehicleProvider =
          VehicleProvider(apiClient: fakeApi, localDb: fakeDb);
      maintenanceProvider =
          MaintenanceProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    testWidgets('shows vehicle name and tabs', (tester) async {
      fakeApi.vehicleResult = _sampleVehicle(name: 'Test Car');
      fakeApi.maintenanceResult = [];
      fakeApi.historyResult = [];

      await tester.pumpWidget(_wrap(
        const VehicleDetailScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Test Car'), findsOneWidget);
      expect(find.text('Overview'), findsOneWidget);
      expect(find.text('Maintenance'), findsOneWidget);
      expect(find.text('History'), findsOneWidget);
    });

    testWidgets('overview tab shows vehicle details', (tester) async {
      fakeApi.vehicleResult = _sampleVehicle();
      fakeApi.maintenanceResult = [];
      fakeApi.historyResult = [];

      await tester.pumpWidget(_wrap(
        const VehicleDetailScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Vehicle Info'), findsOneWidget);
      expect(find.text('Toyota'), findsOneWidget);
      expect(find.text('Camry'), findsOneWidget);
      expect(find.text('2022'), findsOneWidget);
      expect(find.text('Usage'), findsOneWidget);
    });

    testWidgets('maintenance tab shows items', (tester) async {
      fakeApi.vehicleResult = _sampleVehicle();
      fakeApi.maintenanceResult = [
        _sampleMaintenanceItem(id: 'm1'),
        _sampleMaintenanceItem(id: 'm2'),
      ];
      fakeApi.historyResult = [];

      await tester.pumpWidget(_wrap(
        const VehicleDetailScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Maintenance'));
      await tester.pumpAndSettle();

      expect(find.text('Oil Change'), findsNWidgets(2));
    });

    testWidgets('history tab shows service entries', (tester) async {
      fakeApi.vehicleResult = _sampleVehicle();
      fakeApi.maintenanceResult = [];
      fakeApi.historyResult = [_sampleServiceHistory()];

      await tester.pumpWidget(_wrap(
        const VehicleDetailScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.text('Oil Change'), findsOneWidget);
      expect(find.textContaining('75.00'), findsOneWidget);
    });

    testWidgets('shows popup menu with actions', (tester) async {
      fakeApi.vehicleResult = _sampleVehicle();
      fakeApi.maintenanceResult = [];
      fakeApi.historyResult = [];

      await tester.pumpWidget(_wrap(
        const VehicleDetailScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();

      expect(find.text('Log Usage'), findsOneWidget);
      expect(find.text('Log Service'), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);
    });

    testWidgets('shows empty state for maintenance and history',
        (tester) async {
      fakeApi.vehicleResult = _sampleVehicle();
      fakeApi.maintenanceResult = [];
      fakeApi.historyResult = [];

      await tester.pumpWidget(_wrap(
        const VehicleDetailScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Maintenance'));
      await tester.pumpAndSettle();
      expect(find.text('No maintenance items'), findsOneWidget);

      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();
      expect(find.text('No service history'), findsOneWidget);
    });
  });

  // =========================================================================
  // AddVehicleScreen
  // =========================================================================
  group('AddVehicleScreen', () {
    late FakeApiClient fakeApi;
    late FakeLocalDb fakeDb;
    late VehicleProvider vehicleProvider;

    setUp(() {
      fakeApi = FakeApiClient();
      fakeDb = FakeLocalDb();
      vehicleProvider =
          VehicleProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    testWidgets('shows all form fields', (tester) async {
      await tester.pumpWidget(_wrap(
        const AddVehicleScreen(teamId: 't1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Add Vehicle'), findsOneWidget);
      expect(find.text('Name'), findsOneWidget);
      expect(find.text('Type'), findsOneWidget);
      expect(find.text('Usage Unit'), findsOneWidget);
      expect(find.text('Make (optional)'), findsOneWidget);
      expect(find.text('Model (optional)'), findsOneWidget);
      expect(find.text('Year (optional)'), findsOneWidget);
      expect(find.text('VIN (optional)'), findsOneWidget);
    });

    testWidgets('validates required name field', (tester) async {
      await tester.pumpWidget(_wrap(
        const AddVehicleScreen(teamId: 't1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      // Scroll to and tap submit button
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Add Vehicle'));
      await tester.tap(find.widgetWithText(FilledButton, 'Add Vehicle'));
      await tester.pumpAndSettle();

      expect(find.text('Required'), findsOneWidget);
    });

    testWidgets('validates year range', (tester) async {
      await tester.pumpWidget(_wrap(
        const AddVehicleScreen(teamId: 't1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      // Fill name so it doesn't also fail
      await tester.enterText(
          find.widgetWithText(TextFormField, 'Name'), 'Test');

      // Enter invalid year
      final yearField = find.widgetWithText(TextFormField, 'Year (optional)');
      await tester.ensureVisible(yearField);
      await tester.enterText(yearField, '1800');

      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Add Vehicle'));
      await tester.tap(find.widgetWithText(FilledButton, 'Add Vehicle'));
      await tester.pumpAndSettle();

      expect(find.text('Enter a valid year'), findsOneWidget);
    });

    testWidgets('accepts valid year', (tester) async {
      await tester.pumpWidget(_wrap(
        const AddVehicleScreen(teamId: 't1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      final yearField = find.widgetWithText(TextFormField, 'Year (optional)');
      await tester.ensureVisible(yearField);
      await tester.enterText(yearField, '2023');

      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Add Vehicle'));
      await tester.tap(find.widgetWithText(FilledButton, 'Add Vehicle'));
      await tester.pumpAndSettle();

      expect(find.text('Enter a valid year'), findsNothing);
    });
  });

  // =========================================================================
  // LogUsageScreen
  // =========================================================================
  group('LogUsageScreen', () {
    late FakeApiClient fakeApi;
    late FakeLocalDb fakeDb;
    late VehicleProvider vehicleProvider;

    setUp(() {
      fakeApi = FakeApiClient();
      fakeDb = FakeLocalDb();
      vehicleProvider =
          VehicleProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    testWidgets('shows current usage info', (tester) async {
      fakeApi.vehicleResult = _sampleVehicle();
      await vehicleProvider.loadVehicle('v1');

      await tester.pumpWidget(_wrap(
        const LogUsageScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Log Usage'), findsOneWidget);
      expect(find.textContaining('Current:'), findsOneWidget);
      expect(find.textContaining('km'), findsWidgets);
    });

    testWidgets('validates required usage field', (tester) async {
      fakeApi.vehicleResult = _sampleVehicle();
      await vehicleProvider.loadVehicle('v1');

      await tester.pumpWidget(_wrap(
        const LogUsageScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Log Usage'));
      await tester.pumpAndSettle();

      expect(find.text('Required'), findsOneWidget);
    });

    testWidgets('validates numeric input', (tester) async {
      fakeApi.vehicleResult = _sampleVehicle();
      await vehicleProvider.loadVehicle('v1');

      await tester.pumpWidget(_wrap(
        const LogUsageScreen(teamId: 't1', vehicleId: 'v1'),
        vehicleProvider: vehicleProvider,
      ));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).last, 'abc');
      await tester.tap(find.widgetWithText(FilledButton, 'Log Usage'));
      await tester.pumpAndSettle();

      expect(find.text('Enter a valid number'), findsOneWidget);
    });
  });

  // =========================================================================
  // LogServiceScreen
  // =========================================================================
  group('LogServiceScreen', () {
    late FakeApiClient fakeApi;
    late FakeLocalDb fakeDb;
    late MaintenanceProvider maintenanceProvider;

    setUp(() {
      fakeApi = FakeApiClient();
      fakeDb = FakeLocalDb();
      maintenanceProvider =
          MaintenanceProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    testWidgets('shows all form fields', (tester) async {
      await tester.pumpWidget(_wrap(
        const LogServiceScreen(teamId: 't1', vehicleId: 'v1'),
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Log Service'), findsOneWidget);
      expect(find.text('Description'), findsOneWidget);
      expect(find.text('Date'), findsOneWidget);
      expect(find.text('Usage at service (optional)'), findsOneWidget);
      expect(find.text('Cost (optional)'), findsOneWidget);
      expect(find.text('Notes (optional)'), findsOneWidget);
    });

    testWidgets('validates required description', (tester) async {
      await tester.pumpWidget(_wrap(
        const LogServiceScreen(teamId: 't1', vehicleId: 'v1'),
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      // Scroll to and tap the Log Service button
      await tester
          .ensureVisible(find.widgetWithText(FilledButton, 'Log Service'));
      await tester.tap(find.widgetWithText(FilledButton, 'Log Service'));
      await tester.pumpAndSettle();

      expect(find.text('Required'), findsOneWidget);
    });

    testWidgets('shows today date by default', (tester) async {
      await tester.pumpWidget(_wrap(
        const LogServiceScreen(teamId: 't1', vehicleId: 'v1'),
        maintenanceProvider: maintenanceProvider,
      ));
      await tester.pumpAndSettle();

      // Should show today's date
      final today = DateTime.now().toLocal().toString().split(' ')[0];
      expect(find.text(today), findsOneWidget);
    });
  });
}
