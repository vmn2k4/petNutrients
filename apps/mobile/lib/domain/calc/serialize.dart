import '../entities/diet_item.dart';
import '../entities/food.dart';
import '../entities/pet.dart';

/// The JSON the `calc` function reads: the same shapes the web app's domain.js already uses.
extension GoalCalc on Goal {
  Map<String, Object?> toCalc() => {
        'type': type.name,
        'targetKg': targetKg,
        'days': days,
        'custom': custom,
        'fromChart': fromChart,
        if (kcalOverride != null) 'kcalOverride': kcalOverride,
        if (startOn != null) 'startOn': startOn,
        if (startKg != null) 'startKg': startKg,
        if (targetDate != null) 'targetDate': targetDate,
      };
}

extension DietItemCalc on DietItem {
  Map<String, Object?> toCalc() => {
        'id': id,
        'foodId': foodId,
        'foodName': foodName,
        'role': role,
        'amount': amount,
        'unit': unit,
        'timesPerDay': timesPerDay,
        'startedOn': startedOn,
        'endedOn': endedOn,
        'replacedId': replacedId,
        'note': note,
        if (kcalPerKg != null) 'kcalPerKg': kcalPerKg,
        if (kcalPerUnit != null) 'kcalPerUnit': kcalPerUnit,
        if (recipe != null) 'recipe': [for (final r in recipe!) {'id': r.id, 'name': r.name, 'grams': r.grams}],
      };
}

extension PetCalc on Pet {
  Map<String, Object?> toCalc() => {
        'id': id,
        'species': species.name,
        'name': name,
        'breed': breed,
        'sizeCat': sizeCat,
        'birth': birth,
        'sex': sex,
        'neutered': neutered,
        'weightKg': weightKg,
        'bcs': bcs,
        'activity': activity,
        if (exerciseMin != null) 'exerciseMin': exerciseMin,
        'allergies': allergies,
        'health': health,
        if (answered.isNotEmpty) 'answered': answered,
        if (goal != null) 'goal': goal!.toCalc(),
        'logs': [for (final l in logs) {'on': l.on, 'kg': l.kg, 'bcs': l.bcs}],
        'skips': skips,
        'diet': [for (final d in diet) d.toCalc()],
      };
}

extension FoodCalc on Food {
  Map<String, Object?> toCalc() => {
        'id': id,
        'brand': brand,
        'name': name,
        'species': species,
        'format': format,
        'lifeStage': lifeStage,
        'protein': protein,
        'fat': fat,
        'fibre': fibre,
        'moisture': moisture,
        'ash': ash,
        'calcium': calcium,
        'phosphorus': phosphorus,
        'kcalPerKg': kcalPerKg,
        'kcalPerCup': kcalPerCup,
        'gramsPerCup': gramsPerCup,
        'kcalPerUnit': kcalPerUnit,
        'kcalUnit': kcalUnit,
        'kcalPerTreat': kcalPerTreat,
        'ingredients': ingredients,
        'guide': [
          for (final g in guide) {'weight_kg_min': g.weightKgMin, 'weight_kg_max': g.weightKgMax, 'amount_min': g.amountMin, 'amount_max': g.amountMax, 'unit': g.unit, 'grams_per_day_min': g.gramsPerDayMin, 'grams_per_day_max': g.gramsPerDayMax}
        ],
      };

  /// Only what the fit check reads, for lists of hundreds of foods.
  Map<String, Object?> toFitCalc() => {'id': id, 'species': species, 'lifeStage': lifeStage, 'protein': protein, 'fat': fat, 'calcium': calcium, 'phosphorus': phosphorus, 'moisture': moisture, 'kcalPerKg': kcalPerKg, 'ingredients': ingredients};
}
