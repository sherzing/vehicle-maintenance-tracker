import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/vehicle.dart';
import '../../providers/vehicle_provider.dart';
import '../../widgets/vehicle_card.dart';

class VehicleListScreen extends StatefulWidget {
  final String teamId;

  const VehicleListScreen({super.key, required this.teamId});

  @override
  State<VehicleListScreen> createState() => _VehicleListScreenState();
}

class _VehicleListScreenState extends State<VehicleListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VehicleProvider>().loadVehicles(widget.teamId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<VehicleProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Vehicles'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => provider.loadVehicles(widget.teamId),
          ),
        ],
      ),
      body: _buildBody(provider),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/teams/${widget.teamId}/vehicles/add'),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildBody(VehicleProvider provider) {
    if (provider.loading && provider.vehicles.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null && provider.vehicles.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Error: ${provider.error}'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => provider.loadVehicles(widget.teamId),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (provider.vehicles.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.directions_car_outlined,
                size: 64,
                color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('No vehicles yet',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Text('Add a vehicle to start tracking maintenance'),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.loadVehicles(widget.teamId),
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: provider.vehicles.length,
        itemBuilder: (context, index) {
          final vehicle = provider.vehicles[index];
          return VehicleCard(
            vehicle: vehicle,
            onTap: () => context.go(
                '/teams/${widget.teamId}/vehicles/${vehicle.id}'),
          );
        },
      ),
    );
  }
}
