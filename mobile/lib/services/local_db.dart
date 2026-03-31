import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Local SQLite cache for offline-first support.
/// Stores API responses as JSON blobs keyed by cache key.
/// Pending mutations are queued in a separate table for sync.
class LocalDb {
  Database? _db;

  Future<void> init() async {
    final dbPath = await getDatabasesPath();
    _db = await openDatabase(
      join(dbPath, 'vmt_cache.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE cache (
            key TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            body TEXT,
            created_at INTEGER NOT NULL,
            status TEXT DEFAULT 'pending'
          )
        ''');
      },
    );
  }

  Database get db {
    if (_db == null) throw StateError('LocalDb not initialized. Call init() first.');
    return _db!;
  }

  // --- Cache ---

  Future<void> putCache(String key, dynamic data) async {
    await db.insert(
      'cache',
      {
        'key': key,
        'data': jsonEncode(data),
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<dynamic> getCache(String key) async {
    final rows = await db.query('cache', where: 'key = ?', whereArgs: [key]);
    if (rows.isEmpty) return null;
    return jsonDecode(rows.first['data'] as String);
  }

  Future<void> clearCache() async {
    await db.delete('cache');
  }

  // --- Sync Queue ---

  Future<void> enqueue(String method, String path, [Map<String, dynamic>? body]) async {
    await db.insert('sync_queue', {
      'method': method,
      'path': path,
      'body': body != null ? jsonEncode(body) : null,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'status': 'pending',
    });
  }

  Future<List<Map<String, dynamic>>> getPendingOps() async {
    return await db.query(
      'sync_queue',
      where: 'status = ?',
      whereArgs: ['pending'],
      orderBy: 'created_at ASC',
    );
  }

  Future<void> markSynced(int id) async {
    await db.delete('sync_queue', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> markFailed(int id, String error) async {
    await db.update(
      'sync_queue',
      {'status': 'failed'},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> pendingCount() async {
    final result = await db.rawQuery(
        "SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'pending'");
    return result.first['cnt'] as int;
  }
}
