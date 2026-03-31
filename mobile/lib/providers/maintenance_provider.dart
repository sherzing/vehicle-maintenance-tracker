import 'package:flutter/foundation.dart';

import '../models/maintenance_item.dart';
import '../models/service_history.dart';
import '../services/api_client.dart';
import '../services/local_db.dart';

class MaintenanceProvider extends ChangeNotifier {
  final ApiClient apiClient;
  final LocalDb localDb;

  List<MaintenanceItem> _items = [];
  List<ServiceHistory> _history = [];
  bool _loading = false;
  String? _error;
  String? _vehicleId;

  MaintenanceProvider({required this.apiClient, required this.localDb});

  List<MaintenanceItem> get items => _items;
  List<ServiceHistory> get history => _history;
  bool get loading => _loading;
  String? get error => _error;

  int get overdueCount =>
      _items.where((i) => i.status == MaintenanceStatus.overdue).length;
  int get dueSoonCount =>
      _items.where((i) => i.status == MaintenanceStatus.dueSoon).length;

  Future<void> loadMaintenance(String vehicleId) async {
    _vehicleId = vehicleId;
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final cacheKey = 'maintenance_$vehicleId';
      final cached = await localDb.getCache(cacheKey);
      if (cached != null) {
        _items = (cached as List).map((j) => MaintenanceItem.fromJson(j)).toList();
        notifyListeners();
      }

      _items = await apiClient.listMaintenanceItems(vehicleId);
      await localDb.putCache(cacheKey, _items.map((i) => i.toJson()).toList());
    } catch (e) {
      _error = e.toString();
      if (_items.isEmpty) {
        final cached = await localDb.getCache('maintenance_$vehicleId');
        if (cached != null) {
          _items =
              (cached as List).map((j) => MaintenanceItem.fromJson(j)).toList();
        }
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadHistory(String vehicleId) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final cacheKey = 'history_$vehicleId';
      final cached = await localDb.getCache(cacheKey);
      if (cached != null) {
        _history =
            (cached as List).map((j) => ServiceHistory.fromJson(j)).toList();
        notifyListeners();
      }

      _history = await apiClient.listServiceHistory(vehicleId);
      await localDb.putCache(
          cacheKey, _history.map((h) => h.toJson()).toList());
    } catch (e) {
      _error = e.toString();
      if (_history.isEmpty) {
        final cached = await localDb.getCache('history_$vehicleId');
        if (cached != null) {
          _history =
              (cached as List).map((j) => ServiceHistory.fromJson(j)).toList();
        }
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<MaintenanceItem?> createMaintenanceItem(
      String vehicleId, Map<String, dynamic> body) async {
    try {
      final item = await apiClient.createMaintenanceItem(vehicleId, body);
      _items.add(item);
      await localDb.putCache(
          'maintenance_$vehicleId', _items.map((i) => i.toJson()).toList());
      notifyListeners();
      return item;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> deleteMaintenanceItem(String id) async {
    try {
      await apiClient.deleteMaintenanceItem(id);
      _items.removeWhere((i) => i.id == id);
      if (_vehicleId != null) {
        await localDb.putCache(
            'maintenance_$_vehicleId', _items.map((i) => i.toJson()).toList());
      }
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<ServiceHistory?> logService(
      String vehicleId, Map<String, dynamic> body) async {
    try {
      final entry = await apiClient.logService(vehicleId, body);
      _history.insert(0, entry);
      await localDb.putCache(
          'history_$vehicleId', _history.map((h) => h.toJson()).toList());
      // Refresh maintenance items (statuses may have changed)
      await loadMaintenance(vehicleId);
      notifyListeners();
      return entry;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<ServiceHistory?> logRepair(
      String vehicleId, Map<String, dynamic> body) async {
    try {
      final entry = await apiClient.logRepair(vehicleId, body);
      _history.insert(0, entry);
      await localDb.putCache(
          'history_$vehicleId', _history.map((h) => h.toJson()).toList());
      notifyListeners();
      return entry;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
