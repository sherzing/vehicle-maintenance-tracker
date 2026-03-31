import 'package:flutter/foundation.dart';

import '../models/team.dart';
import '../services/api_client.dart';
import '../services/local_db.dart';

class TeamProvider extends ChangeNotifier {
  final ApiClient apiClient;
  final LocalDb localDb;

  List<Team> _teams = [];
  bool _loading = false;
  String? _error;

  TeamProvider({required this.apiClient, required this.localDb});

  List<Team> get teams => _teams;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> loadTeams() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      // Try cache first
      final cached = await localDb.getCache('teams');
      if (cached != null) {
        _teams = (cached as List).map((j) => Team.fromJson(j)).toList();
        notifyListeners();
      }

      // Fetch from API
      _teams = await apiClient.listTeams();
      await localDb.putCache('teams', _teams.map((t) => t.toJson()).toList());
    } catch (e) {
      _error = e.toString();
      // If API fails and we have no cached data, keep error visible
      if (_teams.isEmpty) {
        final cached = await localDb.getCache('teams');
        if (cached != null) {
          _teams = (cached as List).map((j) => Team.fromJson(j)).toList();
        }
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<Team?> createTeam(String name) async {
    try {
      final team = await apiClient.createTeam(name);
      _teams.add(team);
      await localDb.putCache('teams', _teams.map((t) => t.toJson()).toList());
      notifyListeners();
      return team;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> deleteTeam(String id) async {
    try {
      await apiClient.deleteTeam(id);
      _teams.removeWhere((t) => t.id == id);
      await localDb.putCache('teams', _teams.map((t) => t.toJson()).toList());
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
