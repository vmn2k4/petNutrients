import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import 'app.dart';
import 'core/config/env.dart';
import 'data/assets/asset_reference_repository.dart';
import 'data/calc/supabase_calc_repository.dart';
import 'data/local/prefs_settings_repository.dart';
import 'data/supabase/supabase_auth_repository.dart';
import 'data/supabase/supabase_food_repository.dart';
import 'data/supabase/supabase_pet_repository.dart';
import 'presentation/providers/calc.dart';
import 'presentation/providers/providers.dart';

/// The only place that wires concrete data classes to the contracts the rest of the app uses.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final assets = AssetReferenceRepository();
  final reference = await assets.reference();
  final ingredients = await assets.ingredients();

  if (!Env.hasBackend) {
    runApp(const MaterialApp(home: Scaffold(body: Center(child: Padding(padding: EdgeInsets.all(24), child: Text('Missing configuration. Run with --dart-define-from-file=env.json (see env.example.json).', textAlign: TextAlign.center))))));
    return;
  }
  await sb.Supabase.initialize(url: Env.supabaseUrl, publishableKey: Env.supabaseAnonKey);
  final client = sb.Supabase.instance.client;

  runApp(ProviderScope(
    overrides: [
      settingsRepoProvider.overrideWithValue(PrefsSettingsRepository(prefs, client)),
      referenceProvider.overrideWithValue(reference),
      calcRepoProvider.overrideWithValue(SupabaseCalcRepository(client, urlOverride: Env.calcUrl, key: Env.supabaseAnonKey)),
      ingredientsProvider.overrideWithValue(ingredients),
      authRepoProvider.overrideWithValue(SupabaseAuthRepository(client)),
      petRepoProvider.overrideWithValue(SupabasePetRepository(client)),
      foodRepoProvider.overrideWithValue(SupabaseFoodRepository(client)),
    ],
    child: const PetNutritionApp(),
  ));
}
