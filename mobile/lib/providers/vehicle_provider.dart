import 'package:flutter/foundation.dart';

import '../models/vehicle.dart';
import '../models/usage_history.dart';
import '../services/api_client.dart';
import '../services/local_db.dart';

class VehicleProvider extends ChangeNotifier {
  final ApiClient apiClient;
  final LocalDb localDb;

  List<Vehicle> _vehicles = [];
  Vehicle? _selected;
  bool _loading = false;
  String? _error;
  String? _teamId;

  VehicleProvider({required this.apiClient, required this.localDb});

  List<Vehicle> get vehicles => _vehicles;
  Vehicle? get selected => _selected;
  bool get loading => _loading;
  String? get error => _error;
  String? get teamId => _teamId;

  Future<void> loadVehicles(String teamId) async {
    _teamId = teamId;
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final cacheKey = 'vehicles_$teamId';
      final cached = await localDb.getCache(cacheKey);
      if (cached != null) {
        _vehicles = (cached as List).map((j) => Vehicle.fromJson(j)).toList();
        notifyListeners();
      }

      _vehicles = await apiClient.listVehicles(teamId);
      await localDb.putCache(cacheKey, _vehicles.map((v) => v.toJson()).toList());
    } catch (e) {
      _error = e.toString();
      if (_vehicles.isEmpty) {
        final cached = await localDb.getCache('vehicles_$teamId');
        if (cached != null) {
          _vehicles = (cached as List).map((j) => Vehicle.fromJson(j)).toList();
        }
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadVehicle(String id) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _selected = await apiClient.getVehicle(id);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<Vehicle?> createVehicle(String teamId, Map<String, dynamic> body) async {
    try {
      final vehicle = await apiClient.createVehicle(teamId, body);
      _vehicles.add(vehicle);
      await localDb.putCache(
          'vehicles_$teamId', _vehicles.map((v) => v.toJson()).toList());
      notifyListeners();
      return vehicle;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<Vehicle?> updateVehicle(String id, Map<String, dynamic> body) async {
    try {
      final vehicle = await apiClient.updateVehicle(id, body);
      final idx = _vehicles.indexWhere((v) => v.id == id);
      if (idx >= 0) _vehicles[idx] = vehicle;
      _selected = vehicle;
      if (_teamId != null) {
        await localDb.putCache(
            'vehicles_$_teamId', _vehicles.map((v) => v.toJson()).toList());
      }
      notifyListeners();
      return vehicle;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> deleteVehicle(String id) async {
    try {
      await apiClient.deleteVehicle(id);
      _vehicles.removeWhere((v) => v.id == id);
      if (_selected?.id == id) _selected = null;
      if (_teamId != null) {
        await localDb.putCache(
            'vehicles_$_teamId', _vehicles.map((v) => v.toJson()).toList());
      }
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<LogUsageResponse?> logUsage(
      String vehicleId, Map<String, dynamic> body) async {
    try {
      final resp = await apiClient.logUsage(vehicleId, body);
      // Refresh vehicle to get updated usage
      await loadVehicle(vehicleId);
      return resp;
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
