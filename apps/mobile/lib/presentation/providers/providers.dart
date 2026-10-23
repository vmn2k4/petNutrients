import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../domain/domain.dart';
import 'calc.dart';
import 'calc_api.dart';

// ---- wiring: the data layer is injected in main(); tests override these with fakes ----------------------------------
final authRepoProvider = Provider<AuthRepository>((ref) => throw UnimplementedError('authRepoProvider is overridden in main()'));
final petRepoProvider = Provider<PetRepository>((ref) => throw UnimplementedError('petRepoProvider is overridden in main()'));
final foodRepoProvider = Provider<FoodRepository>((ref) => throw UnimplementedError('foodRepoProvider is overridden in main()'));
final settingsRepoProvider = Provider<SettingsRepository>((ref) => throw UnimplementedError('settingsRepoProvider is overridden in main()'));
final referenceProvider = Provider<ReferenceData>((ref) => throw UnimplementedError('referenceProvider is overridden in main()'));
final ingredientsProvider = Provider<List<Ingredient>>((ref) => throw UnimplementedError('ingredientsProvider is overridden in main()'));

const _uuid = Uuid();
String newId() => _uuid.v4();

// ---- account -----------------------------------------------------------------------------------------------------
final authProvider = StreamProvider<AppUser?>((ref) async* {
  final repo = ref.watch(authRepoProvider);
  yield repo.currentUser;
  yield* repo.changes;
});

final currentUserProvider = Provider<AppUser?>((ref) => ref.watch(authProvider).value ?? ref.watch(authRepoProvider).currentUser);

// ---- settings ----------------------------------------------------------------------------------------------------
class SettingsState {
  const SettingsState({required this.region, required this.hasRegion, required this.unit, required this.reminders});
  final String region;
  final bool hasRegion;
  final String unit;
  final bool reminders;
}

class SettingsController extends Notifier<SettingsState> {
  SettingsRepository get _r => ref.read(settingsRepoProvider);

  @override
  SettingsState build() => _read();

  SettingsState _read() => SettingsState(region: _r.region, hasRegion: _r.hasRegion, unit: _r.weightUnit, reminders: _r.emailReminders);

  Future<void> setRegion(String region) async {
    await _r.setRegion(region);
    state = _read();
  }

  Future<void> setUnit(String unit) async {
    await _r.setWeightUnit(unit);
    state = _read();
  }

  Future<void> setReminders(bool on) async {
    await _r.setEmailReminders(on);
    state = _read();
  }
}

final settingsProvider = NotifierProvider<SettingsController, SettingsState>(SettingsController.new);

// ---- the catalogue -----------------------------------------------------------------------------------------------
final foodsProvider = FutureProvider<List<Food>>((ref) => ref.watch(foodRepoProvider).foods());
final treatsProvider = FutureProvider<List<Food>>((ref) => ref.watch(foodRepoProvider).treats());
final supplementsProvider = FutureProvider<List<Supplement>>((ref) => ref.watch(foodRepoProvider).supplements());

// ---- pets --------------------------------------------------------------------------------------------------------
class PetsState {
  const PetsState({this.pets = const [], this.activeId});
  final List<Pet> pets;
  final String? activeId;

  Pet? get active => pets.isEmpty ? null : (pets.where((p) => p.id == activeId).firstOrNull ?? pets.first);
  PetsState replace(Pet p) => PetsState(pets: [for (final x in pets) x.id == p.id ? p : x], activeId: activeId);
}

class PetsController extends AsyncNotifier<PetsState> {
  PetRepository get _repo => ref.read(petRepoProvider);
  SettingsRepository get _settings => ref.read(settingsRepoProvider);
  CalcClient get _calc => ref.read(calcClientProvider);

  @override
  Future<PetsState> build() async {
    final user = ref.watch(currentUserProvider);
    if (user == null) return const PetsState();
    final pets = await _repo.loadPets();
    return PetsState(pets: pets, activeId: _settings.activePetId);
  }

  PetsState get _s => state.value ?? const PetsState();

  Future<void> refresh() async {
    state = await AsyncValue.guard(() => build());
  }

  Future<void> setActive(String id) async {
    await _settings.setActivePetId(id);
    state = AsyncData(PetsState(pets: _s.pets, activeId: id));
  }

  /// Adds a pet and makes it the active one.
  Future<Pet> createPet(Pet draft) async {
    final saved = await _repo.createPet(draft);
    await _settings.setActivePetId(saved.id);
    state = AsyncData(PetsState(pets: [..._s.pets, saved], activeId: saved.id));
    return saved;
  }

  Future<void> removeActive() async {
    final p = _s.active;
    if (p == null) return;
    await _repo.removePet(p.id);
    final rest = _s.pets.where((x) => x.id != p.id).toList();
    await _settings.setActivePetId(rest.isEmpty ? null : rest.first.id);
    state = AsyncData(PetsState(pets: rest, activeId: rest.isEmpty ? null : rest.first.id));
  }

  /// Saves edited profile answers (name, breed, body shape ...).
  Future<void> updateProfile(Pet updated) async {
    await _repo.updateProfile(updated);
    state = AsyncData(_s.replace(updated));
  }

  /// Rejects an impossible weight before saving; returns the message, or null when saved.
  Future<String?> logWeight(double kg, {DateTime? now}) async {
    final p = _s.active;
    if (p == null) return 'No pet yet.';
    final check = await ref.read(calcActionsProvider).weightCheck(p, kg);
    if (!check.ok) return check.message;
    final w = WeighIn(on: todayStr(now), kg: kg, bcs: p.bcs);
    await _repo.addWeighIn(p.id, w);
    state = AsyncData(_s.replace(p.copyWith(weightKg: kg, logs: [...p.logs, w])));
    return null;
  }

  Future<void> skipWeighIn() async {
    final p = _s.active;
    if (p == null) return;
    final skips = [...p.skips, todayStr()];
    await _repo.addSkip(p.id, skips);
    state = AsyncData(_s.replace(p.copyWith(skips: skips)));
  }

  Future<void> setGoal({required GoalType type, required double targetKg, required int days, bool custom = false, double? kcalOverride}) async {
    final p = _s.active;
    if (p == null) return;
    final r = (await _calc.run('planSetGoal', [p.toCalc(), {'type': type.name, 'targetKg': targetKg, 'days': days, 'custom': custom, 'fromChart': true, 'kcalOverride': kcalOverride, 'today': todayStr()}])) as Map;
    final goal = goalFromCalc((r['goal'] as Map).cast<String, dynamic>());
    final archived = r['archived'] == null ? null : goalRecordFromCalc((r['archived'] as Map).cast<String, dynamic>());
    if (archived != null) await _repo.archiveGoal(p.id, archived);
    await _repo.saveGoal(p.id, goal);
    state = AsyncData(_s.replace(p.copyWith(goal: goal, goalHistory: archived == null ? p.goalHistory : [archived, ...p.goalHistory])));
  }

  Future<void> clearGoal() async {
    final p = _s.active;
    if (p == null) return;
    final r = (await _calc.run('planClearGoal', [p.toCalc(), {'today': todayStr()}])) as Map;
    final archived = r['archived'] == null ? null : goalRecordFromCalc((r['archived'] as Map).cast<String, dynamic>());
    if (archived != null) await _repo.archiveGoal(p.id, archived);
    await _repo.saveGoal(p.id, null);
    state = AsyncData(_s.replace(p.copyWith(clearGoal: true, goalHistory: archived == null ? p.goalHistory : [archived, ...p.goalHistory])));
  }

  /// One call for every kind of diet change on one day. The server checks it and returns the rows to save. Returns an error message, or null when saved.
  Future<String?> changeDiet({required String date, List<String> stops = const [], List<DietStart> starts = const []}) async {
    final p = _s.active;
    if (p == null) return 'No pet yet.';
    final r = (await _calc.run('planDietChange', [p.toCalc(), {'date': date, 'stops': stops, 'starts': [for (final x in starts) x.toCalc()], 'ids': [for (final _ in starts) newId()], 'today': todayStr()}])) as Map;
    if (r['ok'] != true) return '${r['message']}';
    List<DietItem> items(Object? l) => [for (final e in (l as List)) dietItemFromCalc((e as Map).cast<String, dynamic>())];
    final started = items(r['started']);
    final stopped = items(r['stopped']);
    await _repo.endDietItems(stopped.map((e) => e.id).toList(), date);
    await _repo.insertDietItems(p.id, started);
    state = AsyncData(_s.replace(p.copyWith(diet: items(r['diet']))));
    return null;
  }

  Future<void> undoDietChange(String date) async {
    final p = _s.active;
    if (p == null) return;
    final r = (await _calc.run('planUndo', [[for (final d in p.diet) d.toCalc()], date])) as Map;
    List<DietItem> items(Object? l) => [for (final e in (l as List)) dietItemFromCalc((e as Map).cast<String, dynamic>())];
    await _repo.reviveDietItems(items(r['revived']).map((e) => e.id).toList());
    await _repo.deleteDietItems(items(r['removed']).map((e) => e.id).toList());
    state = AsyncData(_s.replace(p.copyWith(diet: items(r['diet']))));
  }

  /// Add or correct the calories of a food already in the diet, in place. `kcal` is per 100 g for grams, else per one measure.
  Future<String?> setDietKcal(String itemId, double kcal) async {
    final p = _s.active;
    final it = p?.diet.where((x) => x.id == itemId).firstOrNull;
    if (p == null || it == null) return 'That food is not in the diet.';
    final r = (await _calc.run('planDietKcal', [it.toCalc(), kcal])) as Map;
    if (r['ok'] != true) return '${r['message']}';
    final perKg = (r['kcalPerKg'] as num?)?.toDouble();
    final perUnit = (r['kcalPerUnit'] as num?)?.toDouble();
    await _repo.setDietItemKcal(itemId, kcalPerKg: perKg, kcalPerUnit: perUnit);
    final next = p.diet.map((x) => x.id == itemId ? DietItem(id: x.id, foodId: x.foodId, foodName: x.foodName, role: x.role, amount: x.amount, unit: x.unit, timesPerDay: x.timesPerDay, startedOn: x.startedOn, endedOn: x.endedOn, replacedId: x.replacedId, note: x.note, kcalPerKg: perKg, kcalPerUnit: perUnit, recipe: x.recipe) : x).toList();
    state = AsyncData(_s.replace(p.copyWith(diet: next)));
    return null;
  }

  bool get dietSkipped => _s.active != null && _settings.dietSkipped(_s.active!.id);
  Future<void> skipDiet() async {
    if (_s.active != null) await _settings.setDietSkipped(_s.active!.id, true);
    ref.invalidateSelf(asReload: false);
    state = AsyncData(_s);
  }
}

final petsProvider = AsyncNotifierProvider<PetsController, PetsState>(PetsController.new);

/// The active pet with its plan from the server, ready for screens. Null until the first answer arrives.
class PetView {
  const PetView({required this.pet, required this.summary});
  final Pet pet;
  final PetSummary summary;

  EnergyPlan get plan => summary.plan;
  DailyTarget? get target => summary.target;
  WeighStatus get weigh => summary.weigh;
  bool get growing => summary.growing;
}

final petViewProvider = Provider<PetView?>((ref) {
  final pet = ref.watch(petsProvider).value?.active;
  if (pet == null) return null;
  final summary = ref.calc.summary(pet);
  return summary == null ? null : PetView(pet: pet, summary: summary);
});

/// Foods sold in the owner's region (Canada and US catalogues are kept apart; "all" shows everything).
bool soldIn(Food f, String region) => region == 'all' || f.markets.isEmpty || f.markets.contains(region);

final regionFoodsProvider = Provider<AsyncValue<List<Food>>>((ref) {
  final region = ref.watch(settingsProvider).region;
  return ref.watch(foodsProvider).whenData((l) => l.where((f) => soldIn(f, region)).toList());
});
