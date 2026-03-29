# Vehicle Maintenance Tracker - Flutter Mobile App

## Setup

1. Install Flutter SDK: https://docs.flutter.dev/get-started/install
2. Create the project:
   ```bash
   flutter create --org com.vmt --project-name vmt_mobile .
   ```
3. Add dependencies to `pubspec.yaml`:
   ```yaml
   dependencies:
     flutter:
       sdk: flutter
     firebase_core: ^3.0.0
     firebase_auth: ^5.0.0
     google_sign_in: ^6.0.0
     http: ^1.2.0
     isar: ^4.0.0
     isar_flutter_libs: ^4.0.0
     provider: ^6.0.0    # or riverpod
     go_router: ^14.0.0

   dev_dependencies:
     flutter_test:
       sdk: flutter
     isar_generator: ^4.0.0
     build_runner: ^2.4.0
   ```

4. Configure Firebase:
   ```bash
   flutterfire configure --project=maintainer-dev
   ```

## Project Structure

```
lib/
├── main.dart                  # App entry, Firebase init
├── app.dart                   # MaterialApp, routing, theme
├── config/
│   ├── api_config.dart        # API base URL, timeouts
│   └── theme.dart             # Material 3 theme (seed color, dark mode)
├── models/                    # Dart data classes (mirrors Go API models)
│   ├── team.dart
│   ├── vehicle.dart
│   ├── maintenance_item.dart
│   ├── service_history.dart
│   └── usage_history.dart
├── services/
│   ├── api_client.dart        # HTTP client, auth header injection
│   ├── auth_service.dart      # Firebase Auth (Google Sign-In)
│   ├── sync_service.dart      # Offline queue processing
│   └── local_db.dart          # Isar schema and helpers
├── providers/                 # State management
│   ├── auth_provider.dart
│   ├── team_provider.dart
│   ├── vehicle_provider.dart
│   └── maintenance_provider.dart
├── screens/
│   ├── login_screen.dart
│   ├── dashboard_screen.dart
│   ├── teams/
│   ├── vehicles/
│   └── maintenance/
└── widgets/                   # Reusable components
    ├── status_badge.dart
    ├── vehicle_card.dart
    ├── maintenance_item_card.dart
    ├── service_history_tile.dart
    └── usage_conflict_dialog.dart
```

## Offline Support

The app uses Isar (embedded NoSQL) for local caching and offline queue:

1. All reads hit local cache first, then API for fresh data
2. Writes are queued locally with `syncStatus: pending`
3. `SyncService` processes the queue on connectivity change
4. Conflicts are surfaced to the user for resolution

## Running

```bash
# Development
flutter run

# Tests
flutter test

# Build
flutter build apk    # Android
flutter build ios     # iOS
```
