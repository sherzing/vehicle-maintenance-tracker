import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'screens/login/login_screen.dart';
import 'screens/teams/team_list_screen.dart';
import 'screens/vehicles/vehicle_list_screen.dart';
import 'screens/vehicles/vehicle_detail_screen.dart';
import 'screens/vehicles/add_vehicle_screen.dart';
import 'screens/vehicles/log_usage_screen.dart';
import 'screens/maintenance/log_service_screen.dart';

class VmtApp extends StatelessWidget {
  const VmtApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        return MaterialApp.router(
          title: 'Vehicle Maintenance Tracker',
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: ThemeMode.system,
          routerConfig: _buildRouter(auth),
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }

  GoRouter _buildRouter(AuthProvider auth) {
    return GoRouter(
      redirect: (context, state) {
        final loggedIn = auth.isLoggedIn;
        final loggingIn = state.matchedLocation == '/login';

        if (!loggedIn && !loggingIn) return '/login';
        if (loggedIn && loggingIn) return '/teams';
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/teams',
          builder: (context, state) => const TeamListScreen(),
        ),
        GoRoute(
          path: '/teams/:teamId/vehicles',
          builder: (context, state) => VehicleListScreen(
            teamId: state.pathParameters['teamId']!,
          ),
        ),
        GoRoute(
          path: '/teams/:teamId/vehicles/add',
          builder: (context, state) => AddVehicleScreen(
            teamId: state.pathParameters['teamId']!,
          ),
        ),
        GoRoute(
          path: '/teams/:teamId/vehicles/:vehicleId',
          builder: (context, state) => VehicleDetailScreen(
            teamId: state.pathParameters['teamId']!,
            vehicleId: state.pathParameters['vehicleId']!,
          ),
        ),
        GoRoute(
          path: '/teams/:teamId/vehicles/:vehicleId/log-usage',
          builder: (context, state) => LogUsageScreen(
            teamId: state.pathParameters['teamId']!,
            vehicleId: state.pathParameters['vehicleId']!,
          ),
        ),
        GoRoute(
          path: '/teams/:teamId/vehicles/:vehicleId/log-service',
          builder: (context, state) => LogServiceScreen(
            teamId: state.pathParameters['teamId']!,
            vehicleId: state.pathParameters['vehicleId']!,
          ),
        ),
      ],
    );
  }
}
