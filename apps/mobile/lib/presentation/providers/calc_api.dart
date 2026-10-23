import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/domain.dart';
import 'calc.dart';

typedef _Getter = Object? Function(String fn, List<Object?> args, String? slot);

/// Typed reads of the server calculations for screens. A value is null until its first answer arrives; while a newer answer for the
/// same slot loads, the previous one is still returned so numbers do not flicker.
class CalcApi {
  CalcApi(this._get);
  final _Getter _get;

  T? _r<T>(String fn, List<Object?> args, T Function(Object?) parse, {String? slot}) {
    final v = _get(fn, args, slot);
    return v == null ? null : parse(v);
  }

  PetSummary? summary(Pet p) => _r('petSummary', [p.toCalc()], PetSummary.fromJson, slot: 'summary:${p.id}');
  GrowthCardData? growthCard(Pet p) => _r('growthCardView', [p.toCalc()], GrowthCardData.fromJson, slot: 'growth:${p.id}');
  TargetCheck? targetCheck(Pet p, int days, double kg) => _r('targetCheck', [p.toCalc(), days, kg], TargetCheck.fromJson, slot: 'check:${p.id}');
  DietViewData? dietView(Pet p, List<Food> foods) => _r('dietView', [p.toCalc(), [for (final f in foods) f.toCalc()]], (v) => DietViewData.fromJson(v, p.diet), slot: 'diet:${p.id}');
  BreedSize? breedSize(String breed) => breed.isEmpty ? null : _r('breedSize', [breed], (v) => BreedSize.from(v)!);

  /// Fit of each food for the pet, by food id.
  Map<String, FoodFit>? foodFits(Pet p, List<Food> foods, {String slot = 'fits', bool detail = false}) {
    if (foods.isEmpty) return const {};
    return _r('foodFits', [p.toCalc(), [for (final f in foods) f.toFitCalc()], if (detail) {'detail': true}], (v) => (v as Map).map((k, x) => MapEntry('$k', FoodFit.fromJson(x))), slot: slot);
  }

  FoodFit? foodFit(Pet p, Food f) => foodFits(p, [f], slot: 'fit:${f.id}', detail: true)?[f.id];
  UnitKcal? unitKcal(Food f, String unit) => _r('foodUnitKcal', [unit, f.toCalc()], (v) => UnitKcal.from(v)!, slot: 'unit:${f.id}');
  EstimateKcal? estimate(Food f) => _r('estimateKcal', [f.toCalc()], (v) => EstimateKcal.from(v)!, slot: 'est:${f.id}');
  /// A homemade mix with amounts as percent of a batch (`pct`) or grams (`g`).
  /// The ranked, filtered food list for the page (the server filters, scores and sorts; this only asks). `pet` null shows foods without a fit.
  RankedFoods? rankFoods({Pet? pet, required String species, required String region, List<String> quick = const [], List<String> needs = const [], List<String> priority = const [], Map<String, ({double v, String op})> targets = const {}, bool hideAllergy = true, int limit = 12}) => _r(
        'rankFoods',
        [{'pet': pet?.toCalc(), 'goal': null, 'species': species, 'region': region, 'quick': quick, 'needs': needs, 'priority': priority, 'hideAllergy': hideAllergy, 'unit': 'kcal', 'targets': {for (final e in targets.entries) e.key: {'v': e.value.v, 'op': e.value.op}}, 'sort': 'fit', 'limit': limit}],
        RankedFoods.fromJson,
        slot: 'rank',
      );

  /// Bounds and one-tap suggestions for the "own numbers" sliders.
  OwnNumbers? ownNumbers(String species) => _r('targetsView', [species], OwnNumbers.fromJson, slot: 'own:$species');

  /// The AAFCO amounts for this pet's life stage, per 1,000 kcal (the minimum, or the maximum when there is no minimum), by nutrient: protein, fat, calcium, phosphorus.
  Map<String, double>? idealPer1000(Pet pet) => _r('goalView', [pet.toCalc(), null], (v) {
        final t = (v as Map)['targets'] as Map? ?? const {};
        double? pick(String name) {
          final m = t[name] as Map?;
          return ((m?['min'] ?? m?['max']) as num?)?.toDouble();
        }
        return {for (final e in const {'protein': 'Crude Protein', 'fat': 'Crude Fat', 'calcium': 'Calcium', 'phosphorus': 'Phosphorus'}.entries) if (pick(e.value) != null) e.key: pick(e.value)!};
      }, slot: 'ideal:${pet.id}');

  /// Special needs worth suggesting for this pet (joints for older or larger pets, omega-3 for everyone).
  List<String>? suggestedNeeds(Pet pet) => _r('goalView', [pet.toCalc(), null], (v) => [for (final n in ((v as Map)['needs'] as List? ?? const [])) '$n'], slot: 'needs:${pet.id}');

  MixResult? mixRows(Pet p, List<({String id, double amount})> rows, {required String mode, required double batchG}) => rows.isEmpty ? null : _r('mixAnalysis', [p.toCalc(), [for (final r in rows) {'id': r.id, 'amount': r.amount}], {'mode': mode, 'batchG': batchG}], MixResult.fromJson, slot: 'mixrows');
  MixResult? mix(Pet p, Map<String, double> grams) => grams.isEmpty ? null : _r('mixAnalysis', [p.toCalc(), [for (final e in grams.entries) {'id': e.key, 'amount': e.value}]], MixResult.fromJson, slot: 'mix');
}

extension CalcWidgetRef on WidgetRef {
  CalcApi get calc => CalcApi((fn, args, slot) => calcGetW(this, fn, args, slot));
}

extension CalcRefX on Ref {
  CalcApi get calc => CalcApi((fn, args, slot) => calcGet(this, fn, args, slot));
}

/// Calculations the app waits for: checks before saving, and the changes to save.
class CalcActions {
  CalcActions(this._c);
  final CalcClient _c;

  Future<WeightCheck> weightCheck(Pet p, double kg) async => WeightCheck.fromJson(await _c.run('weightCheck', [p.toCalc(), kg]));
  Future<Retarget> retarget(Pet p, int fromDays, double fromKg, int toDays) async => Retarget.fromJson(await _c.run('retarget', [p.toCalc(), fromDays, fromKg, toDays]));
  Future<String> goalType(Pet p, double kg) async => '${await _c.run('goalTypeForTarget', [p.toCalc(), kg])}';

  Future<DietLive> dietLive(Pet p, Map<String, Object?> payload) async => DietLive.fromJson(await _c.run('dietLiveView', [p.toCalc(), payload]));
  Future<SuggestedAmount?> suggestAmount(Pet p, Food f) async => SuggestedAmount.from(await _c.run('suggestAmount', [p.toCalc(), f.toCalc()]));
  Future<TreatHint> treatHint(Pet p, Food f) async => TreatHint.fromJson(await _c.run('treatHintView', [p.toCalc(), f.toCalc()]));

  /// Checks the calories and cup weight typed for a new food. `ok` false carries the message to show; `cupKcal` is the calories per cup worked out from the cup weight.
  Future<({bool ok, String? message, double? cupKcal})> entryCheck(Food? f, {required String unit, String? kcalTyped, String? gpc, bool mix = false}) async {
    final r = (await _c.run('dietEntryCheck', [f?.toCalc(), {'unit': unit, 'kcalTyped': kcalTyped, 'gpc': gpc, 'mix': mix}])) as Map;
    return (ok: r['ok'] == true, message: r['message'] as String?, cupKcal: (r['cupKcal'] as num?)?.toDouble());
  }
}

final calcActionsProvider = Provider<CalcActions>((ref) => CalcActions(ref.read(calcClientProvider)));
