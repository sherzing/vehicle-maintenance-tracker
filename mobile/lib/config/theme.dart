import 'package:flutter/material.dart';

class AppTheme {
  static const _seedColor = Color(0xFF1565C0); // Blue 800

  static final light = ThemeData(
    colorSchemeSeed: _seedColor,
    brightness: Brightness.light,
    useMaterial3: true,
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(),
      filled: true,
    ),
    cardTheme: const CardTheme(
      elevation: 1,
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    ),
  );

  static final dark = ThemeData(
    colorSchemeSeed: _seedColor,
    brightness: Brightness.dark,
    useMaterial3: true,
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(),
      filled: true,
    ),
    cardTheme: const CardTheme(
      elevation: 1,
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    ),
  );
}
