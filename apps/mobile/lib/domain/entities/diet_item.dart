/// One ingredient of a homemade mix, with grams in one meal.
class RecipeLine {
  const RecipeLine({required this.id, required this.name, required this.grams});
  final String id;
  final String name;
  final double grams;
}

/// What a pet eats, with dates. `endedOn` is the first day it is no longer fed.
class DietItem {
  const DietItem({
    required this.id,
    required this.foodName,
    required this.amount,
    required this.unit,
    required this.timesPerDay,
    required this.startedOn,
    this.foodId,
    this.role = 'main',
    this.endedOn,
    this.replacedId,
    this.note,
    this.kcalPerKg,
    this.kcalPerUnit,
    this.recipe,
  });

  final String id;
  final String? foodId;
  final String foodName;
  final String role;
  final double amount;
  final String unit;
  final double timesPerDay;
  final String startedOn;
  final String? endedOn;
  final String? replacedId;
  final String? note;
  final double? kcalPerKg;
  final double? kcalPerUnit;
  final List<RecipeLine>? recipe;

  DietItem copyWith({String? endedOn, double? kcalPerKg, double? kcalPerUnit, double? amount, double? timesPerDay}) => DietItem(
        id: id,
        foodId: foodId,
        foodName: foodName,
        role: role,
        amount: amount ?? this.amount,
        unit: unit,
        timesPerDay: timesPerDay ?? this.timesPerDay,
        startedOn: startedOn,
        endedOn: endedOn ?? this.endedOn,
        replacedId: replacedId,
        note: note,
        kcalPerKg: kcalPerKg ?? this.kcalPerKg,
        kcalPerUnit: kcalPerUnit ?? this.kcalPerUnit,
        recipe: recipe,
      );
}
