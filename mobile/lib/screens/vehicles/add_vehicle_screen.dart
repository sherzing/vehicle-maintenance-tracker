import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/vehicle_provider.dart';

class AddVehicleScreen extends StatefulWidget {
  final String teamId;
  const AddVehicleScreen({super.key, required this.teamId});

  @override
  State<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends State<AddVehicleScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _makeCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  final _yearCtrl = TextEditingController();
  final _vinCtrl = TextEditingController();
  String _type = 'car';
  String _usageUnit = 'km';
  bool _saving = false;

  static const _types = ['car', 'motorcycle', 'bicycle', 'other'];
  static const _units = ['km', 'hours'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _makeCtrl.dispose();
    _modelCtrl.dispose();
    _yearCtrl.dispose();
    _vinCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Vehicle')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Name',
                hintText: 'e.g. Family SUV',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Type'),
              items: _types
                  .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                  .toList(),
              onChanged: (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _usageUnit,
              decoration: const InputDecoration(labelText: 'Usage Unit'),
              items: _units
                  .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                  .toList(),
              onChanged: (v) => setState(() => _usageUnit = v!),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _makeCtrl,
              decoration:
                  const InputDecoration(labelText: 'Make (optional)'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _modelCtrl,
              decoration:
                  const InputDecoration(labelText: 'Model (optional)'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _yearCtrl,
              decoration:
                  const InputDecoration(labelText: 'Year (optional)'),
              keyboardType: TextInputType.number,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return null;
                final year = int.tryParse(v);
                if (year == null || year < 1900 || year > 2100) {
                  return 'Enter a valid year';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _vinCtrl,
              decoration: const InputDecoration(
                labelText: 'VIN (optional)',
                hintText: '17 characters',
              ),
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Add Vehicle'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);

    final body = <String, dynamic>{
      'name': _nameCtrl.text.trim(),
      'type': _type,
      'usage_unit': _usageUnit,
    };
    if (_makeCtrl.text.trim().isNotEmpty) {
      body['make'] = _makeCtrl.text.trim();
    }
    if (_modelCtrl.text.trim().isNotEmpty) {
      body['model'] = _modelCtrl.text.trim();
    }
    if (_yearCtrl.text.trim().isNotEmpty) {
      body['year'] = int.parse(_yearCtrl.text.trim());
    }
    if (_vinCtrl.text.trim().isNotEmpty) {
      body['vin'] = _vinCtrl.text.trim();
    }

    final vehicle = await context
        .read<VehicleProvider>()
        .createVehicle(widget.teamId, body);

    if (mounted) {
      setState(() => _saving = false);
      if (vehicle != null) {
        context.go('/teams/${widget.teamId}/vehicles/${vehicle.id}');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                context.read<VehicleProvider>().error ?? 'Failed to create'),
          ),
        );
      }
    }
  }
}
