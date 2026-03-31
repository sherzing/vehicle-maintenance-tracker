import 'package:flutter_test/flutter_test.dart';

import 'package:vmt_mobile/models/team.dart';
import 'package:vmt_mobile/models/vehicle.dart';
import 'package:vmt_mobile/models/maintenance_item.dart';
import 'package:vmt_mobile/models/service_history.dart';
import 'package:vmt_mobile/models/usage_history.dart';
import 'package:vmt_mobile/services/api_client.dart';
import 'package:vmt_mobile/services/local_db.dart';
import 'package:vmt_mobile/providers/team_provider.dart';
import 'package:vmt_mobile/providers/vehicle_provider.dart';
import 'package:vmt_mobile/providers/maintenance_provider.dart';

// ---------------------------------------------------------------------------
// Fake implementations using Dart's `Fake` class.
// `Fake` provides a noSuchMethod that throws on un-overridden members,
// while `implements` gives us the correct type so providers accept them.
// ---------------------------------------------------------------------------

class FakeApiClient extends Fake implements ApiClient {
  // Configurable return values
  List<Team> teamsToReturn = [];
  Team? teamToReturn;
  List<Vehicle> vehiclesToReturn = [];
  Vehicle? vehicleToReturn;
  List<MaintenanceItem> maintenanceItemsToReturn = [];
  MaintenanceItem? maintenanceItemToReturn;
  List<ServiceHistory> serviceHistoryToReturn = [];
  ServiceHistory? serviceHistoryEntryToReturn;
  LogUsageResponse? logUsageResponseToReturn;

  // Error simulation
  Exception? errorToThrow;

  // Call tracking
  final List<String> calls = [];

  void reset() {
    teamsToReturn = [];
    teamToReturn = null;
    vehiclesToReturn = [];
    vehicleToReturn = null;
    maintenanceItemsToReturn = [];
    maintenanceItemToReturn = null;
    serviceHistoryToReturn = [];
    serviceHistoryEntryToReturn = null;
    logUsageResponseToReturn = null;
    errorToThrow = null;
    calls.clear();
  }

  void _checkError() {
    if (errorToThrow != null) throw errorToThrow!;
  }

  // --- Teams ---

  @override
  Future<List<Team>> listTeams() async {
    calls.add('listTeams');
    _checkError();
    return teamsToReturn;
  }

  @override
  Future<Team> createTeam(String name) async {
    calls.add('createTeam:$name');
    _checkError();
    return teamToReturn!;
  }

  @override
  Future<void> deleteTeam(String id) async {
    calls.add('deleteTeam:$id');
    _checkError();
  }

  // --- Vehicles ---

  @override
  Future<List<Vehicle>> listVehicles(String teamId) async {
    calls.add('listVehicles:$teamId');
    _checkError();
    return vehiclesToReturn;
  }

  @override
  Future<Vehicle> createVehicle(
      String teamId, Map<String, dynamic> body) async {
    calls.add('createVehicle:$teamId');
    _checkError();
    return vehicleToReturn!;
  }

  @override
  Future<Vehicle> getVehicle(String id) async {
    calls.add('getVehicle:$id');
    _checkError();
    return vehicleToReturn!;
  }

  @override
  Future<Vehicle> updateVehicle(String id, Map<String, dynamic> body) async {
    calls.add('updateVehicle:$id');
    _checkError();
    return vehicleToReturn!;
  }

  @override
  Future<void> deleteVehicle(String id) async {
    calls.add('deleteVehicle:$id');
    _checkError();
  }

  // --- Usage ---

  @override
  Future<LogUsageResponse> logUsage(
      String vehicleId, Map<String, dynamic> body) async {
    calls.add('logUsage:$vehicleId');
    _checkError();
    return logUsageResponseToReturn!;
  }

  // --- Maintenance ---

  @override
  Future<List<MaintenanceItem>> listMaintenanceItems(String vehicleId) async {
    calls.add('listMaintenanceItems:$vehicleId');
    _checkError();
    return maintenanceItemsToReturn;
  }

  @override
  Future<MaintenanceItem> createMaintenanceItem(
      String vehicleId, Map<String, dynamic> body) async {
    calls.add('createMaintenanceItem:$vehicleId');
    _checkError();
    return maintenanceItemToReturn!;
  }

  @override
  Future<void> deleteMaintenanceItem(String id) async {
    calls.add('deleteMaintenanceItem:$id');
    _checkError();
  }

  // --- Service History ---

  @override
  Future<List<ServiceHistory>> listServiceHistory(String vehicleId) async {
    calls.add('listServiceHistory:$vehicleId');
    _checkError();
    return serviceHistoryToReturn;
  }

  @override
  Future<ServiceHistory> logService(
      String vehicleId, Map<String, dynamic> body) async {
    calls.add('logService:$vehicleId');
    _checkError();
    return serviceHistoryEntryToReturn!;
  }

  @override
  Future<ServiceHistory> logRepair(
      String vehicleId, Map<String, dynamic> body) async {
    calls.add('logRepair:$vehicleId');
    _checkError();
    return serviceHistoryEntryToReturn!;
  }
}

class FakeLocalDb extends Fake implements LocalDb {
  final Map<String, dynamic> _cache = {};

  @override
  Future<void> putCache(String key, dynamic data) async {
    _cache[key] = data;
  }

  @override
  Future<dynamic> getCache(String key) async {
    return _cache[key];
  }

  void clearAll() => _cache.clear();
}

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

final _now = DateTime(2026, 3, 31);

Team makeTeam({String id = 't1', String name = 'Team Alpha'}) => Team(
      id: id,
      name: name,
      ownerId: 'owner1',
      memberIds: const ['owner1'],
      createdAt: _now,
      updatedAt: _now,
    );

Vehicle makeVehicle({
  String id = 'v1',
  String teamId = 't1',
  String name = 'Race Car',
  double currentUsage = 1500,
}) =>
    Vehicle(
      id: id,
      teamId: teamId,
      name: name,
      type: VehicleType.car,
      usageUnit: UsageUnit.km,
      currentUsage: currentUsage,
      createdAt: _now,
      updatedAt: _now,
    );

MaintenanceItem makeMaintenanceItem({
  String id = 'm1',
  String vehicleId = 'v1',
  String name = 'Oil Change',
  MaintenanceStatus status = MaintenanceStatus.ok,
  double percentage = 0.3,
}) =>
    MaintenanceItem(
      id: id,
      vehicleId: vehicleId,
      name: name,
      usageInterval: 5000,
      createdAt: _now,
      updatedAt: _now,
      status: status,
      percentage: percentage,
    );

ServiceHistory makeServiceHistory({
  String id = 'sh1',
  String vehicleId = 'v1',
  HistoryEntryType type = HistoryEntryType.service,
  String itemName = 'Oil Change',
}) =>
    ServiceHistory(
      id: id,
      vehicleId: vehicleId,
      type: type,
      itemName: itemName,
      serviceDate: _now,
      loggedBy: 'user1',
      createdAt: _now,
    );

LogUsageResponse makeLogUsageResponse({
  String entryId = 'u1',
  bool conflict = false,
}) =>
    LogUsageResponse(entryId: entryId, conflict: conflict);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late FakeApiClient fakeApi;
  late FakeLocalDb fakeDb;

  setUp(() {
    fakeApi = FakeApiClient();
    fakeDb = FakeLocalDb();
  });

  // =========================================================================
  // TeamProvider
  // =========================================================================
  group('TeamProvider', () {
    late TeamProvider provider;

    setUp(() {
      provider = TeamProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    test('initial state', () {
      expect(provider.teams, isEmpty);
      expect(provider.loading, isFalse);
      expect(provider.error, isNull);
    });

    test('loadTeams succeeds and populates teams', () async {
      final teams = [makeTeam(), makeTeam(id: 't2', name: 'Team Bravo')];
      fakeApi.teamsToReturn = teams;

      await provider.loadTeams();

      expect(provider.teams, hasLength(2));
      expect(provider.teams[0].name, 'Team Alpha');
      expect(provider.teams[1].name, 'Team Bravo');
      expect(provider.loading, isFalse);
      expect(provider.error, isNull);
    });

    test('loadTeams sets loading during fetch', () async {
      bool wasLoading = false;
      provider.addListener(() {
        if (provider.loading) wasLoading = true;
      });

      fakeApi.teamsToReturn = [makeTeam()];
      await provider.loadTeams();

      expect(wasLoading, isTrue);
      expect(provider.loading, isFalse);
    });

    test('loadTeams caches results in LocalDb', () async {
      fakeApi.teamsToReturn = [makeTeam()];
      await provider.loadTeams();

      final cached = await fakeDb.getCache('teams');
      expect(cached, isList);
      expect((cached as List).length, 1);
      expect(cached[0]['name'], 'Team Alpha');
    });

    test('loadTeams uses cache before API response', () async {
      // Pre-populate cache
      await fakeDb.putCache('teams', [makeTeam(name: 'Cached Team').toJson()]);

      final states = <List<String>>[];
      provider.addListener(() {
        states.add(provider.teams.map((t) => t.name).toList());
      });

      fakeApi.teamsToReturn = [makeTeam(name: 'Fresh Team')];
      await provider.loadTeams();

      // Should have seen the cached value then the fresh value
      expect(states.any((s) => s.contains('Cached Team')), isTrue);
      expect(provider.teams[0].name, 'Fresh Team');
    });

    test('loadTeams sets error on failure', () async {
      fakeApi.errorToThrow = Exception('network down');

      await provider.loadTeams();

      expect(provider.error, contains('network down'));
      expect(provider.loading, isFalse);
    });

    test('loadTeams falls back to cache on failure', () async {
      await fakeDb.putCache('teams', [makeTeam(name: 'Cached').toJson()]);
      fakeApi.errorToThrow = Exception('network down');

      await provider.loadTeams();

      expect(provider.error, contains('network down'));
      expect(provider.teams, hasLength(1));
      expect(provider.teams[0].name, 'Cached');
    });

    test('createTeam adds team to list and caches', () async {
      final newTeam = makeTeam(id: 't3', name: 'New Team');
      fakeApi.teamToReturn = newTeam;

      final result = await provider.createTeam('New Team');

      expect(result, isNotNull);
      expect(result!.id, 't3');
      expect(provider.teams, hasLength(1));
      expect(provider.teams[0].name, 'New Team');
      expect(fakeApi.calls, contains('createTeam:New Team'));

      final cached = await fakeDb.getCache('teams');
      expect((cached as List).length, 1);
    });

    test('createTeam returns null and sets error on failure', () async {
      fakeApi.errorToThrow = Exception('forbidden');

      final result = await provider.createTeam('Fail');

      expect(result, isNull);
      expect(provider.error, contains('forbidden'));
    });

    test('deleteTeam removes team from list', () async {
      // Pre-populate
      fakeApi.teamsToReturn = [
        makeTeam(id: 't1'),
        makeTeam(id: 't2', name: 'B'),
      ];
      await provider.loadTeams();
      expect(provider.teams, hasLength(2));

      fakeApi.errorToThrow = null;
      final result = await provider.deleteTeam('t1');

      expect(result, isTrue);
      expect(provider.teams, hasLength(1));
      expect(provider.teams[0].id, 't2');
    });

    test('deleteTeam returns false and sets error on failure', () async {
      fakeApi.teamsToReturn = [makeTeam()];
      await provider.loadTeams();
      fakeApi.errorToThrow = Exception('not allowed');

      final result = await provider.deleteTeam('t1');

      expect(result, isFalse);
      expect(provider.error, contains('not allowed'));
    });

    test('clearError resets error', () async {
      fakeApi.errorToThrow = Exception('oops');
      await provider.loadTeams();
      expect(provider.error, isNotNull);

      provider.clearError();

      expect(provider.error, isNull);
    });
  });

  // =========================================================================
  // VehicleProvider
  // =========================================================================
  group('VehicleProvider', () {
    late VehicleProvider provider;

    setUp(() {
      provider = VehicleProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    test('initial state', () {
      expect(provider.vehicles, isEmpty);
      expect(provider.selected, isNull);
      expect(provider.loading, isFalse);
      expect(provider.error, isNull);
      expect(provider.teamId, isNull);
    });

    test('loadVehicles succeeds and sets teamId', () async {
      fakeApi.vehiclesToReturn = [
        makeVehicle(id: 'v1'),
        makeVehicle(id: 'v2', name: 'Bike'),
      ];

      await provider.loadVehicles('t1');

      expect(provider.vehicles, hasLength(2));
      expect(provider.teamId, 't1');
      expect(provider.loading, isFalse);
      expect(provider.error, isNull);
    });

    test('loadVehicles sets loading during fetch', () async {
      bool wasLoading = false;
      provider.addListener(() {
        if (provider.loading) wasLoading = true;
      });

      fakeApi.vehiclesToReturn = [makeVehicle()];
      await provider.loadVehicles('t1');

      expect(wasLoading, isTrue);
    });

    test('loadVehicles caches results', () async {
      fakeApi.vehiclesToReturn = [makeVehicle()];
      await provider.loadVehicles('t1');

      final cached = await fakeDb.getCache('vehicles_t1');
      expect(cached, isList);
      expect((cached as List).length, 1);
    });

    test('loadVehicles uses cache before API', () async {
      await fakeDb.putCache(
          'vehicles_t1', [makeVehicle(name: 'Cached Car').toJson()]);

      final names = <String>[];
      provider.addListener(() {
        if (provider.vehicles.isNotEmpty) {
          names.add(provider.vehicles[0].name);
        }
      });

      fakeApi.vehiclesToReturn = [makeVehicle(name: 'Fresh Car')];
      await provider.loadVehicles('t1');

      expect(names.contains('Cached Car'), isTrue);
      expect(provider.vehicles[0].name, 'Fresh Car');
    });

    test('loadVehicles sets error on failure', () async {
      fakeApi.errorToThrow = Exception('timeout');

      await provider.loadVehicles('t1');

      expect(provider.error, contains('timeout'));
      expect(provider.loading, isFalse);
    });

    test('loadVehicles falls back to cache on failure', () async {
      await fakeDb.putCache(
          'vehicles_t1', [makeVehicle(name: 'Cached').toJson()]);
      fakeApi.errorToThrow = Exception('timeout');

      await provider.loadVehicles('t1');

      expect(provider.vehicles, hasLength(1));
      expect(provider.vehicles[0].name, 'Cached');
    });

    test('loadVehicle sets selected vehicle', () async {
      final vehicle = makeVehicle(id: 'v1', name: 'Selected Car');
      fakeApi.vehicleToReturn = vehicle;

      await provider.loadVehicle('v1');

      expect(provider.selected, isNotNull);
      expect(provider.selected!.name, 'Selected Car');
      expect(provider.loading, isFalse);
    });

    test('createVehicle adds vehicle to list and caches', () async {
      final newVehicle = makeVehicle(id: 'v3', name: 'New Car');
      fakeApi.vehicleToReturn = newVehicle;

      final result =
          await provider.createVehicle('t1', {'name': 'New Car'});

      expect(result, isNotNull);
      expect(result!.id, 'v3');
      expect(provider.vehicles, hasLength(1));
    });

    test('createVehicle returns null on failure', () async {
      fakeApi.errorToThrow = Exception('bad request');

      final result =
          await provider.createVehicle('t1', {'name': 'Fail'});

      expect(result, isNull);
      expect(provider.error, contains('bad request'));
    });

    test('updateVehicle updates vehicle in list and sets selected', () async {
      // Pre-populate
      fakeApi.vehiclesToReturn = [makeVehicle(id: 'v1', name: 'Old Name')];
      await provider.loadVehicles('t1');

      final updated = makeVehicle(id: 'v1', name: 'New Name');
      fakeApi.vehicleToReturn = updated;

      final result = await provider.updateVehicle('v1', {'name': 'New Name'});

      expect(result, isNotNull);
      expect(result!.name, 'New Name');
      expect(provider.vehicles[0].name, 'New Name');
      expect(provider.selected!.name, 'New Name');
    });

    test('deleteVehicle removes vehicle from list', () async {
      fakeApi.vehiclesToReturn = [
        makeVehicle(id: 'v1'),
        makeVehicle(id: 'v2', name: 'B'),
      ];
      await provider.loadVehicles('t1');

      fakeApi.errorToThrow = null;
      final result = await provider.deleteVehicle('v1');

      expect(result, isTrue);
      expect(provider.vehicles, hasLength(1));
      expect(provider.vehicles[0].id, 'v2');
    });

    test('deleteVehicle clears selected if it was selected', () async {
      fakeApi.vehiclesToReturn = [makeVehicle(id: 'v1')];
      await provider.loadVehicles('t1');

      // Select the vehicle
      fakeApi.vehicleToReturn = makeVehicle(id: 'v1');
      await provider.loadVehicle('v1');
      expect(provider.selected, isNotNull);

      fakeApi.errorToThrow = null;
      await provider.deleteVehicle('v1');

      expect(provider.selected, isNull);
    });

    test('deleteVehicle returns false on failure', () async {
      fakeApi.vehiclesToReturn = [makeVehicle()];
      await provider.loadVehicles('t1');
      fakeApi.errorToThrow = Exception('server error');

      final result = await provider.deleteVehicle('v1');

      expect(result, isFalse);
      expect(provider.error, contains('server error'));
    });

    test('logUsage succeeds and refreshes vehicle', () async {
      fakeApi.logUsageResponseToReturn = makeLogUsageResponse();
      fakeApi.vehicleToReturn = makeVehicle(id: 'v1', currentUsage: 2000);

      final result =
          await provider.logUsage('v1', {'usage': 2000, 'date': '2026-03-31'});

      expect(result, isNotNull);
      expect(result!.entryId, 'u1');
      expect(result.conflict, isFalse);
      // Should have called getVehicle to refresh
      expect(fakeApi.calls, contains('getVehicle:v1'));
    });

    test('logUsage returns response with conflict flag', () async {
      fakeApi.logUsageResponseToReturn =
          makeLogUsageResponse(conflict: true);
      fakeApi.vehicleToReturn = makeVehicle(id: 'v1');

      final result =
          await provider.logUsage('v1', {'usage': 500, 'date': '2026-03-31'});

      expect(result, isNotNull);
      expect(result!.conflict, isTrue);
    });

    test('logUsage returns null on failure', () async {
      fakeApi.errorToThrow = Exception('conflict');

      final result =
          await provider.logUsage('v1', {'usage': 100, 'date': '2026-03-31'});

      expect(result, isNull);
      expect(provider.error, contains('conflict'));
    });

    test('clearError resets error', () async {
      fakeApi.errorToThrow = Exception('err');
      await provider.loadVehicles('t1');
      expect(provider.error, isNotNull);

      provider.clearError();

      expect(provider.error, isNull);
    });
  });

  // =========================================================================
  // MaintenanceProvider
  // =========================================================================
  group('MaintenanceProvider', () {
    late MaintenanceProvider provider;

    setUp(() {
      provider = MaintenanceProvider(apiClient: fakeApi, localDb: fakeDb);
    });

    test('initial state', () {
      expect(provider.items, isEmpty);
      expect(provider.history, isEmpty);
      expect(provider.loading, isFalse);
      expect(provider.error, isNull);
      expect(provider.overdueCount, 0);
      expect(provider.dueSoonCount, 0);
    });

    test('loadMaintenance succeeds', () async {
      fakeApi.maintenanceItemsToReturn = [
        makeMaintenanceItem(id: 'm1', name: 'Oil Change'),
        makeMaintenanceItem(id: 'm2', name: 'Tire Rotation'),
      ];

      await provider.loadMaintenance('v1');

      expect(provider.items, hasLength(2));
      expect(provider.loading, isFalse);
      expect(provider.error, isNull);
    });

    test('loadMaintenance sets loading during fetch', () async {
      bool wasLoading = false;
      provider.addListener(() {
        if (provider.loading) wasLoading = true;
      });

      fakeApi.maintenanceItemsToReturn = [makeMaintenanceItem()];
      await provider.loadMaintenance('v1');

      expect(wasLoading, isTrue);
    });

    test('loadMaintenance caches results', () async {
      fakeApi.maintenanceItemsToReturn = [makeMaintenanceItem()];
      await provider.loadMaintenance('v1');

      final cached = await fakeDb.getCache('maintenance_v1');
      expect(cached, isList);
      expect((cached as List).length, 1);
    });

    test('loadMaintenance uses cache before API', () async {
      await fakeDb.putCache('maintenance_v1',
          [makeMaintenanceItem(name: 'Cached Item').toJson()]);

      final names = <String>[];
      provider.addListener(() {
        if (provider.items.isNotEmpty) {
          names.add(provider.items[0].name);
        }
      });

      fakeApi.maintenanceItemsToReturn = [
        makeMaintenanceItem(name: 'Fresh Item'),
      ];
      await provider.loadMaintenance('v1');

      expect(names.contains('Cached Item'), isTrue);
      expect(provider.items[0].name, 'Fresh Item');
    });

    test('loadMaintenance sets error on failure', () async {
      fakeApi.errorToThrow = Exception('server error');

      await provider.loadMaintenance('v1');

      expect(provider.error, contains('server error'));
      expect(provider.loading, isFalse);
    });

    test('loadMaintenance falls back to cache on failure', () async {
      await fakeDb.putCache('maintenance_v1',
          [makeMaintenanceItem(name: 'Cached').toJson()]);
      fakeApi.errorToThrow = Exception('network');

      await provider.loadMaintenance('v1');

      expect(provider.items, hasLength(1));
      expect(provider.items[0].name, 'Cached');
    });

    test('loadHistory succeeds', () async {
      fakeApi.serviceHistoryToReturn = [
        makeServiceHistory(id: 'sh1'),
        makeServiceHistory(id: 'sh2', itemName: 'Brake Pads'),
      ];

      await provider.loadHistory('v1');

      expect(provider.history, hasLength(2));
      expect(provider.loading, isFalse);
      expect(provider.error, isNull);
    });

    test('loadHistory caches results', () async {
      fakeApi.serviceHistoryToReturn = [makeServiceHistory()];
      await provider.loadHistory('v1');

      final cached = await fakeDb.getCache('history_v1');
      expect(cached, isList);
      expect((cached as List).length, 1);
    });

    test('loadHistory uses cache before API', () async {
      await fakeDb.putCache(
          'history_v1', [makeServiceHistory(itemName: 'Cached').toJson()]);

      final names = <String>[];
      provider.addListener(() {
        if (provider.history.isNotEmpty) {
          names.add(provider.history[0].itemName);
        }
      });

      fakeApi.serviceHistoryToReturn = [
        makeServiceHistory(itemName: 'Fresh'),
      ];
      await provider.loadHistory('v1');

      expect(names.contains('Cached'), isTrue);
      expect(provider.history[0].itemName, 'Fresh');
    });

    test('loadHistory sets error on failure', () async {
      fakeApi.errorToThrow = Exception('fail');

      await provider.loadHistory('v1');

      expect(provider.error, contains('fail'));
    });

    test('createMaintenanceItem adds item to list', () async {
      final item = makeMaintenanceItem(id: 'm5', name: 'Air Filter');
      fakeApi.maintenanceItemToReturn = item;

      final result = await provider.createMaintenanceItem('v1', {
        'name': 'Air Filter',
        'usage_interval': 10000,
      });

      expect(result, isNotNull);
      expect(result!.id, 'm5');
      expect(provider.items, hasLength(1));
      expect(provider.items[0].name, 'Air Filter');
    });

    test('createMaintenanceItem caches updated list', () async {
      fakeApi.maintenanceItemToReturn =
          makeMaintenanceItem(id: 'm5', name: 'Air Filter');

      await provider.createMaintenanceItem('v1', {'name': 'Air Filter'});

      final cached = await fakeDb.getCache('maintenance_v1');
      expect((cached as List).length, 1);
    });

    test('createMaintenanceItem returns null on failure', () async {
      fakeApi.errorToThrow = Exception('validation');

      final result = await provider.createMaintenanceItem('v1', {'name': ''});

      expect(result, isNull);
      expect(provider.error, contains('validation'));
    });

    test('deleteMaintenanceItem removes item from list', () async {
      fakeApi.maintenanceItemsToReturn = [
        makeMaintenanceItem(id: 'm1'),
        makeMaintenanceItem(id: 'm2', name: 'Tire Rotation'),
      ];
      await provider.loadMaintenance('v1');
      expect(provider.items, hasLength(2));

      fakeApi.errorToThrow = null;
      final result = await provider.deleteMaintenanceItem('m1');

      expect(result, isTrue);
      expect(provider.items, hasLength(1));
      expect(provider.items[0].id, 'm2');
    });

    test('deleteMaintenanceItem returns false on failure', () async {
      fakeApi.maintenanceItemsToReturn = [makeMaintenanceItem()];
      await provider.loadMaintenance('v1');
      fakeApi.errorToThrow = Exception('not found');

      final result = await provider.deleteMaintenanceItem('m1');

      expect(result, isFalse);
      expect(provider.error, contains('not found'));
    });

    test('logService adds entry to history and refreshes maintenance',
        () async {
      final entry =
          makeServiceHistory(id: 'sh5', itemName: 'Oil Change Service');
      fakeApi.serviceHistoryEntryToReturn = entry;
      // loadMaintenance will be called internally after logService
      fakeApi.maintenanceItemsToReturn = [makeMaintenanceItem()];

      final result = await provider.logService('v1', {
        'maintenance_item_id': 'm1',
        'service_usage': 5000,
        'service_date': '2026-03-31',
      });

      expect(result, isNotNull);
      expect(result!.itemName, 'Oil Change Service');
      expect(provider.history, hasLength(1));
      expect(provider.history[0].id, 'sh5');
      // logService calls loadMaintenance internally
      expect(fakeApi.calls, contains('listMaintenanceItems:v1'));
    });

    test('logService inserts at beginning of history', () async {
      // Pre-populate history
      fakeApi.serviceHistoryToReturn = [
        makeServiceHistory(id: 'sh1', itemName: 'Old Entry'),
      ];
      await provider.loadHistory('v1');

      fakeApi.serviceHistoryEntryToReturn =
          makeServiceHistory(id: 'sh2', itemName: 'New Entry');
      fakeApi.maintenanceItemsToReturn = [];

      await provider.logService('v1', {});

      expect(provider.history[0].itemName, 'New Entry');
      expect(provider.history[1].itemName, 'Old Entry');
    });

    test('logService returns null on failure', () async {
      fakeApi.errorToThrow = Exception('oops');

      final result = await provider.logService('v1', {});

      expect(result, isNull);
      expect(provider.error, contains('oops'));
    });

    test('logRepair adds entry to history', () async {
      final entry = makeServiceHistory(
        id: 'sh6',
        itemName: 'Crash Repair',
        type: HistoryEntryType.repair,
      );
      fakeApi.serviceHistoryEntryToReturn = entry;

      final result = await provider.logRepair('v1', {
        'item_name': 'Crash Repair',
        'cost': 500,
      });

      expect(result, isNotNull);
      expect(result!.id, 'sh6');
      expect(provider.history, hasLength(1));
    });

    test('logRepair returns null on failure', () async {
      fakeApi.errorToThrow = Exception('err');

      final result = await provider.logRepair('v1', {});

      expect(result, isNull);
      expect(provider.error, contains('err'));
    });

    test('overdueCount returns count of overdue items', () async {
      fakeApi.maintenanceItemsToReturn = [
        makeMaintenanceItem(
            id: 'm1', name: 'A', status: MaintenanceStatus.overdue),
        makeMaintenanceItem(
            id: 'm2', name: 'B', status: MaintenanceStatus.ok),
        makeMaintenanceItem(
            id: 'm3', name: 'C', status: MaintenanceStatus.overdue),
      ];

      await provider.loadMaintenance('v1');

      expect(provider.overdueCount, 2);
    });

    test('dueSoonCount returns count of dueSoon items', () async {
      fakeApi.maintenanceItemsToReturn = [
        makeMaintenanceItem(
            id: 'm1', name: 'A', status: MaintenanceStatus.dueSoon),
        makeMaintenanceItem(
            id: 'm2', name: 'B', status: MaintenanceStatus.ok),
        makeMaintenanceItem(
            id: 'm3', name: 'C', status: MaintenanceStatus.dueSoon),
        makeMaintenanceItem(
            id: 'm4', name: 'D', status: MaintenanceStatus.overdue),
      ];

      await provider.loadMaintenance('v1');

      expect(provider.dueSoonCount, 2);
      expect(provider.overdueCount, 1);
    });

    test('clearError resets error', () async {
      fakeApi.errorToThrow = Exception('err');
      await provider.loadMaintenance('v1');
      expect(provider.error, isNotNull);

      provider.clearError();

      expect(provider.error, isNull);
    });
  });
}
