import 'package:flutter/material.dart';

import '../models/maintenance_item.dart';
import 'status_badge.dart';

class MaintenanceItemCard extends StatelessWidget {
  final MaintenanceItem item;
  final VoidCallback? onTap;

  const MaintenanceItemCard({super.key, required this.item, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.name,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ),
                  StatusBadge(status: item.status),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: (item.percentage / 100).clamp(0.0, 1.0),
                backgroundColor:
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                color: _progressColor(item.percentage),
              ),
              const SizedBox(height: 4),
              Text(
                '${item.percentage.toStringAsFixed(0)}% used',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (item.usageInterval != null ||
                  item.timeIntervalDays != null) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 16,
                  children: [
                    if (item.usageInterval != null)
                      Text(
                        'Every ${item.usageInterval!.toStringAsFixed(0)} usage units',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                      ),
                    if (item.timeIntervalDays != null)
                      Text(
                        'Every ${item.timeIntervalDays} days',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _progressColor(double percent) {
    if (percent >= 100) return Colors.red;
    if (percent >= 85) return Colors.orange;
    return Colors.green;
  }
}
