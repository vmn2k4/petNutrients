import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../core/config/env.dart';
import '../../domain/domain.dart';

/// Google sign-in through Supabase Auth. On a phone it uses Google's own account picker inside the app (native sign-in) and hands the
/// ID token to Supabase. Without client IDs (or on the web) it falls back to the browser flow.
class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository(this._client);
  final sb.SupabaseClient _client;

  AppUser? _map(sb.User? u) => (u == null || u.isAnonymous) ? null : AppUser(id: u.id, email: u.email);

  @override
  AppUser? get currentUser => _map(_client.auth.currentUser);

  @override
  Stream<AppUser?> get changes => _client.auth.onAuthStateChange.map((e) => _map(e.session?.user));

  bool _ready = false;

  @override
  Future<void> signInWithGoogle() async {
    if (kIsWeb || !Env.hasNativeGoogle) return _browserSignIn();
    final g = GoogleSignIn.instance;
    if (!_ready) {
      await g.initialize(clientId: Env.googleIosClientId.isEmpty ? null : Env.googleIosClientId, serverClientId: Env.googleWebClientId);
      _ready = true;
    }
    try {
      final account = await g.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null) throw StateError('Google did not return an ID token.');
      await _client.auth.signInWithIdToken(provider: sb.OAuthProvider.google, idToken: idToken);
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) return; // the person closed the picker
      rethrow;
    }
  }

  Future<void> _browserSignIn() async {
    await _client.auth.signInWithOAuth(
      sb.OAuthProvider.google,
      redirectTo: kIsWeb ? null : Env.authRedirect,
      authScreenLaunchMode: sb.LaunchMode.externalApplication,
    );
  }

  @override
  Future<void> signOut() => _client.auth.signOut();

  @override
  Future<void> deleteMyAccount() async {
    await _client.rpc('delete_my_account');
    await _client.auth.signOut();
  }
}
