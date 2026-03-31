import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/team.dart';
import '../models/vehicle.dart';
import '../models/maintenance_item.dart';
import '../models/service_history.dart';
import '../models/usage_history.dart';
import 'auth_service.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final AuthService authService;
  final http.Client _http;

  ApiClient({required this.authService, http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  // --- Auth header ---

  Future<Map<String, String>> _headers() async {
    final token = await authService.getIdToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // --- HTTP helpers ---

  Future<dynamic> _get(String path) async {
    final resp = await _http
        .get(Uri.parse('${ApiConfig.apiUrl}$path'), headers: await _headers())
        .timeout(ApiConfig.timeout);
    return _handleResponse(resp);
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final resp = await _http
        .post(Uri.parse('${ApiConfig.apiUrl}$path'),
            headers: await _headers(), body: jsonEncode(body))
        .timeout(ApiConfig.timeout);
    return _handleResponse(resp);
  }

  Future<dynamic> _put(String path, Map<String, dynamic> body) async {
    final resp = await _http
        .put(Uri.parse('${ApiConfig.apiUrl}$path'),
            headers: await _headers(), body: jsonEncode(body))
        .timeout(ApiConfig.timeout);
    return _handleResponse(resp);
  }

  Future<void> _delete(String path) async {
    final resp = await _http
        .delete(Uri.parse('${ApiConfig.apiUrl}$path'), headers: await _headers())
        .timeout(ApiConfig.timeout);
    if (resp.statusCode != 204) {
      _handleResponse(resp);
    }
  }

  dynamic _handleResponse(http.Response resp) {
    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      if (resp.body.isEmpty) return null;
      return jsonDecode(resp.body);
    }
    final body = resp.body.isNotEmpty ? resp.body : 'Unknown error';
    throw ApiException(resp.statusCode, body);
  }

  // --- Teams ---

  Future<List<Team>> listTeams() async {
    final data = await _get('/teams') as List;
    return data.map((j) => Team.fromJson(j)).toList();
  }

  Future<Team> createTeam(String name) async {
    final data = await _post('/teams', {'name': name});
    return Team.fromJson(data);
  }

  Future<Team> getTeam(String id) async {
    final data = await _get('/teams/$id');
    return Team.fromJson(data);
  }

  Future<void> deleteTeam(String id) => _delete('/teams/$id');

  // --- Vehicles ---

  Future<List<Vehicle>> listVehicles(String teamId) async {
    final data = await _get('/teams/$teamId/vehicles') as List;
    return data.map((j) => Vehicle.fromJson(j)).toList();
  }

  Future<Vehicle> createVehicle(String teamId, Map<String, dynamic> body) async {
    final data = await _post('/teams/$teamId/vehicles', body);
    return Vehicle.fromJson(data);
  }

  Future<Vehicle> getVehicle(String id) async {
    final data = await _get('/vehicles/$id');
    return Vehicle.fromJson(data);
  }

  Future<Vehicle> updateVehicle(String id, Map<String, dynamic> body) async {
    final data = await _put('/vehicles/$id', body);
    return Vehicle.fromJson(data);
  }

  Future<void> deleteVehicle(String id) => _delete('/vehicles/$id');

  // --- Maintenance Items ---

  Future<List<MaintenanceItem>> listMaintenanceItems(String vehicleId) async {
    final data = await _get('/vehicles/$vehicleId/maintenance') as List;
    return data.map((j) => MaintenanceItem.fromJson(j)).toList();
  }

  Future<MaintenanceItem> createMaintenanceItem(
      String vehicleId, Map<String, dynamic> body) async {
    final data = await _post('/vehicles/$vehicleId/maintenance', body);
    return MaintenanceItem.fromJson(data);
  }

  Future<void> deleteMaintenanceItem(String id) => _delete('/maintenance/$id');

  // --- Service History ---

  Future<List<ServiceHistory>> listServiceHistory(String vehicleId) async {
    final data = await _get('/vehicles/$vehicleId/history') as List;
    return data.map((j) => ServiceHistory.fromJson(j)).toList();
  }

  Future<ServiceHistory> logService(
      String vehicleId, Map<String, dynamic> body) async {
    final data = await _post('/vehicles/$vehicleId/services', body);
    return ServiceHistory.fromJson(data);
  }

  Future<ServiceHistory> logRepair(
      String vehicleId, Map<String, dynamic> body) async {
    final data = await _post('/vehicles/$vehicleId/repairs', body);
    return ServiceHistory.fromJson(data);
  }

  // --- Usage History ---

  Future<List<UsageHistory>> listUsageHistory(String vehicleId) async {
    final data = await _get('/vehicles/$vehicleId/usage') as List;
    return data.map((j) => UsageHistory.fromJson(j)).toList();
  }

  Future<LogUsageResponse> logUsage(
      String vehicleId, Map<String, dynamic> body) async {
    final data = await _post('/vehicles/$vehicleId/usage', body);
    return LogUsageResponse.fromJson(data);
  }

  Future<void> resolveUsageConflict(
      String vehicleId, double chosenUsage) async {
    await _post('/vehicles/$vehicleId/usage/resolve-conflict',
        {'chosen_usage': chosenUsage});
  }

  // --- Export ---

  Future<Map<String, dynamic>> exportTeamData(String teamId) async {
    final data = await _get('/teams/$teamId/export');
    return data as Map<String, dynamic>;
  }
}
