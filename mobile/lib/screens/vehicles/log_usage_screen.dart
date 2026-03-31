import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/vehicle_provider.dart';

class LogUsageScreen extends StatefulWidget {
  final String teamId;
  final String vehicleId;
  const LogUsageScreen(
      {super.key, required this.teamId, required this.vehicleId});

  @override
  State<LogUsageScreen> createState() => _LogUsageScreenState();
}

class _LogUsageScreenState extends State<LogUsageScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usageCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _usageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vehicle = context.watch<VehicleProvider>().selected;

    return Scaffold(
      appBar: AppBar(title: const Text('Log Usage')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (vehicle != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Current: ${vehicle.displayUsage}',
                          style: Theme.of(context).textTheme.titleMedium),
                      Text('Unit: ${vehicle.usageUnit}'),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _usageCtrl,
              decoration: InputDecoration(
                labelText:
                    'New ${vehicle?.usageUnit ?? "usage"} reading',
                suffixText: vehicle?.usageUnit ?? '',
              ),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Required';
                if (double.tryParse(v) == null) return 'Enter a valid number';
                return null;
              },
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Log Usage'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);

    final body = {
      'usage': double.parse(_usageCtrl.text.trim()),
      'date': DateTime.now().toUtc().toIso8601String(),
    };

    final resp = await context
        .read<VehicleProvider>()
        .logUsage(widget.vehicleId, body);

    if (mounted) {
      setState(() => _saving = false);
      if (resp != null) {
        if (resp.conflictInfo != null) {
          _showConflictDialog(resp.conflictInfo!.currentUsage, resp.conflictInfo!.newUsage);
        } else {
          context.go(
              '/teams/${widget.teamId}/vehicles/${widget.vehicleId}');
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(context.read<VehicleProvider>().error ??
                  'Failed to log usage')),
        );
      }
    }
  }

  void _showConflictDialog(double serverUsage, double clientUsage) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Usage Conflict'),
        content: Text(
          'The server has $serverUsage but you entered $clientUsage. '
          'Which value should be kept?',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _resolveConflict(serverUsage);
            },
            child: Text('Keep server ($serverUsage)'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              _resolveConflict(clientUsage);
            },
            child: Text('Use mine ($clientUsage)'),
          ),
        ],
      ),
    );
  }

  Future<void> _resolveConflict(double chosenUsage) async {
    // TODO: call resolveUsageConflict API
    if (mounted) {
      context.go('/teams/${widget.teamId}/vehicles/${widget.vehicleId}');
    }
  }
}
