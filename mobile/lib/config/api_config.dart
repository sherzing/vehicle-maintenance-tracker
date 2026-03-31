class ApiConfig {
  // Change this to your Go API URL
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080', // Android emulator -> host localhost
  );

  static const Duration timeout = Duration(seconds: 15);
  static const String apiPrefix = '/api/v1';

  static String get apiUrl => '$baseUrl$apiPrefix';
}
