import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/maintenance_provider.dart';

class LogServiceScreen extends StatefulWidget {
  final String teamId;
  final String vehicleId;
  const LogServiceScreen(
      {super.key, required this.teamId, required this.vehicleId});

  @override
  State<LogServiceScreen> createState() => _LogServiceScreenState();
}

class _LogServiceScreenState extends State<LogServiceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descCtrl = TextEditingController();
  final _costCtrl = TextEditingController();
  final _usageCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  DateTime _date = DateTime.now();
  bool _saving = false;

  @override
  void dispose() {
    _descCtrl.dispose();
    _costCtrl.dispose();
    _usageCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log Service')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _descCtrl,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'e.g. Oil change',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Date'),
              subtitle:
                  Text(_date.toLocal().toString().split(' ')[0]),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _date,
                  firstDate: DateTime(2000),
                  lastDate: DateTime.now(),
                );
                if (picked != null) setState(() => _date = picked);
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _usageCtrl,
              decoration: const InputDecoration(
                labelText: 'Usage at service (optional)',
                hintText: 'e.g. 50000',
              ),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _costCtrl,
              decoration: const InputDecoration(
                labelText: 'Cost (optional)',
                prefixText: '\$ ',
              ),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notesCtrl,
              decoration: const InputDecoration(labelText: 'Notes (optional)'),
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Log Service'),
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
      'description': _descCtrl.text.trim(),
      'date': _date.toUtc().toIso8601String(),
    };
    if (_usageCtrl.text.trim().isNotEmpty) {
      body['usage_at_service'] = double.parse(_usageCtrl.text.trim());
    }
    if (_costCtrl.text.trim().isNotEmpty) {
      body['cost'] = double.parse(_costCtrl.text.trim());
    }
    if (_notesCtrl.text.trim().isNotEmpty) {
      body['notes'] = _notesCtrl.text.trim();
    }

    final entry = await context
        .read<MaintenanceProvider>()
        .logService(widget.vehicleId, body);

    if (mounted) {
      setState(() => _saving = false);
      if (entry != null) {
        context.go(
            '/teams/${widget.teamId}/vehicles/${widget.vehicleId}');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(context.read<MaintenanceProvider>().error ??
                  'Failed to log service')),
        );
      }
    }
  }
}
