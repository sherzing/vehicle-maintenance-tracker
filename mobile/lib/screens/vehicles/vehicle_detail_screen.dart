import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/service_history.dart';
import '../../providers/vehicle_provider.dart';
import '../../providers/maintenance_provider.dart';
import '../../widgets/maintenance_item_card.dart';

class VehicleDetailScreen extends StatefulWidget {
  final String teamId;
  final String vehicleId;

  const VehicleDetailScreen({
    super.key,
    required this.teamId,
    required this.vehicleId,
  });

  @override
  State<VehicleDetailScreen> createState() => _VehicleDetailScreenState();
}

class _VehicleDetailScreenState extends State<VehicleDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VehicleProvider>().loadVehicle(widget.vehicleId);
      context.read<MaintenanceProvider>().loadMaintenance(widget.vehicleId);
      context.read<MaintenanceProvider>().loadHistory(widget.vehicleId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vehicleProvider = context.watch<VehicleProvider>();
    final maintenanceProvider = context.watch<MaintenanceProvider>();
    final vehicle = vehicleProvider.selected;

    return Scaffold(
      appBar: AppBar(
        title: Text(vehicle != null ? vehicle.name : 'Vehicle'),
        actions: [
          if (vehicle != null)
            PopupMenuButton(
              itemBuilder: (ctx) => [
                const PopupMenuItem(
                  value: 'log_usage',
                  child: ListTile(
                    leading: Icon(Icons.speed),
                    title: Text('Log Usage'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'log_service',
                  child: ListTile(
                    leading: Icon(Icons.build),
                    title: Text('Log Service'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: ListTile(
                    leading: Icon(Icons.delete, color: Colors.red),
                    title: Text('Delete', style: TextStyle(color: Colors.red)),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
              onSelected: (value) {
                switch (value) {
                  case 'log_usage':
                    context.go(
                        '/teams/${widget.teamId}/vehicles/${widget.vehicleId}/log-usage');
                    break;
                  case 'log_service':
                    context.go(
                        '/teams/${widget.teamId}/vehicles/${widget.vehicleId}/log-service');
                    break;
                  case 'delete':
                    _confirmDelete(context);
                    break;
                }
              },
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Maintenance'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: vehicleProvider.loading && vehicle == null
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _OverviewTab(vehicle: vehicle),
                _MaintenanceTab(
                  provider: maintenanceProvider,
                  vehicleId: widget.vehicleId,
                ),
                _HistoryTab(provider: maintenanceProvider),
              ],
            ),
    );
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Vehicle'),
        content: const Text(
            'This will delete the vehicle and all its maintenance data.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final ok =
          await context.read<VehicleProvider>().deleteVehicle(widget.vehicleId);
      if (ok && context.mounted) {
        context.go('/teams/${widget.teamId}/vehicles');
      }
    }
  }
}

class _OverviewTab extends StatelessWidget {
  final dynamic vehicle;
  const _OverviewTab({required this.vehicle});

  @override
  Widget build(BuildContext context) {
    if (vehicle == null) {
      return const Center(child: Text('Vehicle not found'));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Vehicle Info',
                    style: Theme.of(context).textTheme.titleMedium),
                const Divider(),
                _InfoRow('Name', vehicle.name),
                _InfoRow('Type', vehicle.type.name),
                if (vehicle.make != null) _InfoRow('Make', vehicle.make!),
                if (vehicle.model != null) _InfoRow('Model', vehicle.model!),
                if (vehicle.year != null) _InfoRow('Year', vehicle.year.toString()),
                if (vehicle.vin != null) _InfoRow('VIN', vehicle.vin!),
                if (vehicle.nickname != null)
                  _InfoRow('Nickname', vehicle.nickname!),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Usage',
                    style: Theme.of(context).textTheme.titleMedium),
                const Divider(),
                _InfoRow('Current', vehicle.displayUsage),
                _InfoRow('Unit', vehicle.usageUnit.name),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _MaintenanceTab extends StatelessWidget {
  final MaintenanceProvider provider;
  final String vehicleId;

  const _MaintenanceTab({required this.provider, required this.vehicleId});

  @override
  Widget build(BuildContext context) {
    if (provider.loading && provider.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.items.isEmpty) {
      return const Center(child: Text('No maintenance items'));
    }

    return RefreshIndicator(
      onRefresh: () => provider.loadMaintenance(vehicleId),
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: provider.items.length,
        itemBuilder: (context, index) {
          final item = provider.items[index];
          return MaintenanceItemCard(item: item);
        },
      ),
    );
  }
}

class _HistoryTab extends StatelessWidget {
  final MaintenanceProvider provider;
  const _HistoryTab({required this.provider});

  @override
  Widget build(BuildContext context) {
    if (provider.loading && provider.history.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.history.isEmpty) {
      return const Center(child: Text('No service history'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: provider.history.length,
      itemBuilder: (context, index) {
        final entry = provider.history[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(
              entry.type == HistoryEntryType.service
                  ? Icons.build
                  : Icons.warning,
              color: entry.type == HistoryEntryType.service
                  ? Colors.blue
                  : Colors.orange,
            ),
            title: Text(entry.itemName),
            subtitle: Text(
              '${entry.serviceDate.toLocal().toString().split(' ')[0]}'
              '${entry.cost != null ? ' - \$${entry.cost!.toStringAsFixed(2)}' : ''}',
            ),
            trailing: entry.serviceUsage != null
                ? Text('${entry.serviceUsage!.toStringAsFixed(0)}')
                : null,
          ),
        );
      },
    );
  }
}
