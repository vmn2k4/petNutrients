import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:pet_nutrition_matcher/domain/domain.dart';

/// Checks the app and the `calc` function agree on the JSON both ways. Needs the function running:
///   supabase functions serve --no-verify-jwt    then    CALC_URL=http://127.0.0.1:55321/functions/v1/calc flutter test test/calc_contract_test.dart
void main() {
  final url = Platform.environment['CALC_URL'];
  final key = Platform.environment['CALC_KEY'] ?? '';

  Future<Object?> call(String fn, List<Object?> args) async {
    final c = HttpClient();
    final req = await c.postUrl(Uri.parse(url!));
    req.headers.set('content-type', 'application/json');
    req.headers.set('apikey', key);
    req.headers.set('authorization', 'Bearer $key');
    req.write(jsonEncode({'fn': fn, 'args': args}));
    final res = await req.close();
    final body = jsonDecode(await res.transform(utf8.decoder).join()) as Map;
    expect(body['error'], isNull, reason: fn);
    return body['result'];
  }

  final pet = Pet(
    id: 'p',
    species: Species.dog,
    name: 'Rex',
    breed: 'Labrador Retriever',
    sizeCat: 'V',
    birth: isoDay(DateTime.now().subtract(const Duration(days: 280))),
    weightKg: 20,
    logs: [WeighIn(on: isoDay(DateTime.now().subtract(const Duration(days: 40))), kg: 15, bcs: 5), WeighIn(on: todayStr(), kg: 20, bcs: 5)],
  );
  const food = Food(id: 'f1', brand: 'B', name: 'N', species: 'dog', lifeStage: 'growth', protein: 28, fat: 16, calcium: 1.3, phosphorus: 1.0, moisture: 10, kcalPerKg: 3800, gramsPerCup: 100, ingredients: ['chicken', 'rice']);

  group('calc contract', skip: url == null ? 'set CALC_URL' : false, () {
    test('petSummary', () async {
      final s = PetSummary.fromJson(await call('petSummary', [pet.toCalc()]));
      expect(s.growing, isTrue);
      expect(s.target!.kcal, greaterThan(500));
    });
    test('growthCardView, retarget, targetCheck', () async {
      final g = GrowthCardData.fromJson(await call('growthCardView', [pet.toCalc()]));
      expect(g.bands, isNotEmpty);
      expect(g.points.length, 2);
      expect(g.initial.hi, greaterThan(g.initial.lo));
      final r = Retarget.fromJson(await call('retarget', [pet.toCalc(), g.initial.days, g.initial.kg, 60]));
      expect(r.days, 60);
      final c = TargetCheck.fromJson(await call('targetCheck', [pet.toCalc(), r.days, r.kg]));
      expect(c.kind, 'growth');
    });
    test('foods and diet', () async {
      final fits = (await call('foodFits', [pet.toCalc(), [food.toFitCalc()]])) as Map;
      expect(FoodFit.fromJson(fits['f1']).verdict, isNotEmpty);
      final u = UnitKcal.from(await call('foodUnitKcal', ['cup', food.toCalc()]))!;
      expect(u.per, closeTo(380, 1));
      final change = await call('planDietChange', [pet.toCalc(), {'date': todayStr(), 'today': todayStr(), 'ids': ['a'], 'starts': [const DietStart(foodName: 'N', foodId: 'f1', amount: 1, unit: 'cup', timesPerDay: 2).toCalc()]}]) as Map;
      expect(change['ok'], isTrue);
      final item = dietItemFromCalc((change['started'] as List).first as Map<String, dynamic>);
      final withDiet = pet.copyWith(diet: [item]);
      final dv = DietViewData.fromJson(await call('dietView', [withDiet.toCalc(), [food.toCalc()]]), withDiet.diet);
      expect(dv.current.length, 1);
      expect(dv.kcal, closeTo(760, 1));
      final mix = MixResult.fromJson(await call('mixAnalysis', [pet.toCalc(), [{'id': 'chicken-breast-raw', 'amount': 100}]]));
      expect(mix.kcal, closeTo(106, 1));
    });
  });
}
