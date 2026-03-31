import 'package:flutter/material.dart';

import '../models/maintenance_item.dart';

class StatusBadge extends StatelessWidget {
  final MaintenanceStatus status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, label) = _resolve(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  (Color, String) _resolve(MaintenanceStatus status) {
    switch (status) {
      case MaintenanceStatus.ok:
        return (Colors.green, 'OK');
      case MaintenanceStatus.dueSoon:
        return (Colors.orange, 'Due Soon');
      case MaintenanceStatus.due:
        return (Colors.deepOrange, 'Due');
      case MaintenanceStatus.overdue:
        return (Colors.red, 'Overdue');
    }
  }
}
