import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService authService;
  User? _user;
  bool _loading = false;
  String? _error;

  AuthProvider({required this.authService}) {
    _user = authService.currentUser;
    authService.authStateChanges.listen((user) {
      _user = user;
      notifyListeners();
    });
  }

  User? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> signInWithGoogle() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await authService.signInWithGoogle();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    await authService.signOut();
    _user = null;
    notifyListeners();
  }
}
