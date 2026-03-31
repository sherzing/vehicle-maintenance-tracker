import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'services/auth_service.dart';
import 'services/api_client.dart';
import 'services/local_db.dart';
import 'services/sync_service.dart';
import 'providers/auth_provider.dart';
import 'providers/team_provider.dart';
import 'providers/vehicle_provider.dart';
import 'providers/maintenance_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  final authService = AuthService();
  final apiClient = ApiClient(authService: authService);
  final localDb = LocalDb();
  await localDb.init();
  // ignore: unused_local_variable
  final syncService = SyncService(apiClient: apiClient, localDb: localDb);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
            create: (_) => AuthProvider(authService: authService)),
        ChangeNotifierProvider(
            create: (_) => TeamProvider(apiClient: apiClient, localDb: localDb)),
        ChangeNotifierProvider(
            create: (_) =>
                VehicleProvider(apiClient: apiClient, localDb: localDb)),
        ChangeNotifierProvider(
            create: (_) =>
                MaintenanceProvider(apiClient: apiClient, localDb: localDb)),
        Provider.value(value: syncService),
      ],
      child: const VmtApp(),
    ),
  );
}
