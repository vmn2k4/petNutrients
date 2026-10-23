
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../domain/domain.dart';

/// Owner settings. Region, units and the active pet live on the device; region and the reminder choice are also kept on the
/// profile when signed in, so they follow the owner to a new phone.
class PrefsSettingsRepository implements SettingsRepository {
  PrefsSettingsRepository(this._p, this._client);
  final SharedPreferences _p;
  final sb.SupabaseClient? _client;

  static const _region = 'pnm.region';
  static const _unit = 'pnm.unit';
  static const _active = 'pnm.activePet';
  static const _remind = 'pnm.remind';

  /// A best guess from the device's locale until the owner chooses.
  String _guess(String? locale) => (locale ?? '').toUpperCase().endsWith('CA') ? 'CA' : 'US';
  String? deviceLocale;

  @override
  bool get hasRegion => _p.containsKey(_region);

  @override
  String get region => _p.getString(_region) ?? _guess(deviceLocale);

  @override
  Future<void> setRegion(String region) async {
    await _p.setString(_region, region);
    final c = _client;
    if (c != null && c.auth.currentUser != null) {
      try {
        await c.from('profiles').upsert({'user_id': c.auth.currentUser!.id, 'region': region}, onConflict: 'user_id');
      } catch (_) {/* kept on the device; the profile column may not exist yet */}
    }
  }

  @override
  bool get emailReminders => _p.getBool(_remind) ?? false;

  @override
  Future<void> setEmailReminders(bool on) async {
    await _p.setBool(_remind, on);
    final c = _client;
    if (c != null && c.auth.currentUser != null) {
      try {
        await c.from('profiles').upsert({'user_id': c.auth.currentUser!.id, 'email_reminders': on, if (on) 'reminders_consent_at': DateTime.now().toUtc().toIso8601String()}, onConflict: 'user_id');
      } catch (_) {/* kept on the device */}
    }
  }

  @override
  String get weightUnit => _p.getString(_unit) == 'lb' ? 'lb' : 'kg';

  @override
  Future<void> setWeightUnit(String unit) => _p.setString(_unit, unit);

  @override
  String? get activePetId => _p.getString(_active);

  @override
  Future<void> setActivePetId(String? id) => id == null ? _p.remove(_active) : _p.setString(_active, id);

  @override
  bool dietSkipped(String petId) => _p.getBool('pnm.dietSkipped.$petId') ?? false;

  @override
  Future<void> setDietSkipped(String petId, bool skipped) => _p.setBool('pnm.dietSkipped.$petId', skipped);

  @override
  bool get acknowledged => _p.getBool('pnm.ack') ?? false;

  @override
  Future<void> setAcknowledged() => _p.setBool('pnm.ack', true);
}
