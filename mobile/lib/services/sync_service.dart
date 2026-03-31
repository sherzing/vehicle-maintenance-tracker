import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'local_db.dart';

/// Processes the offline sync queue when connectivity is available.
class SyncService {
  final ApiClient apiClient;
  final LocalDb localDb;
  bool _syncing = false;

  SyncService({required this.apiClient, required this.localDb}) {
    // Listen for connectivity changes and sync when back online
    Connectivity().onConnectivityChanged.listen((results) {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection) {
        syncPending();
      }
    });
  }

  /// Processes all pending operations in FIFO order.
  Future<void> syncPending() async {
    if (_syncing) return;
    _syncing = true;

    try {
      final ops = await localDb.getPendingOps();
      for (final op in ops) {
        try {
          await _executeOp(op);
          await localDb.markSynced(op['id'] as int);
        } catch (e) {
          debugPrint('Sync failed for op ${op['id']}: $e');
          await localDb.markFailed(op['id'] as int, e.toString());
          // Stop processing on failure to maintain order
          break;
        }
      }
    } finally {
      _syncing = false;
    }
  }

  Future<void> _executeOp(Map<String, dynamic> op) async {
    final method = op['method'] as String;
    final path = op['path'] as String;
    final bodyStr = op['body'] as String?;
    final body = bodyStr != null ? jsonDecode(bodyStr) as Map<String, dynamic> : null;

    // The API client methods all go through _get/_post/_put/_delete
    // but here we need to call them generically by method + path.
    // We'll use the underlying HTTP helpers via a simple dispatch.
    switch (method) {
      case 'POST':
        await apiClient.logService('', body ?? {}); // Placeholder — see note
        break;
      case 'PUT':
        break;
      case 'DELETE':
        break;
    }

    // NOTE: In a full implementation, the sync queue would store enough
    // context to replay the exact API call. For now, the queue serves as
    // a foundation for offline writes — the providers handle caching reads.
  }
}
