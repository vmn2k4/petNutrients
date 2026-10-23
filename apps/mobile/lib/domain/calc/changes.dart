import '../entities/diet_item.dart';
import '../entities/pet.dart';

/// A food the owner starts feeding (sent to the server, which checks it and returns the rows to save).
class DietStart {
  const DietStart({required this.foodName, required this.amount, required this.unit, required this.timesPerDay, this.foodId, this.role = 'main', this.replacesId, this.note, this.kcalPerKg, this.kcalPerUnit, this.recipe});
  final String foodName;
  final String? foodId;
  final String role;
  final double amount;
  final String unit;
  final double timesPerDay;
  final String? replacesId;
  final String? note;
  final double? kcalPerKg;
  final double? kcalPerUnit;
  final List<RecipeLine>? recipe;

  Map<String, Object?> toCalc() => {
        'foodName': foodName,
        'foodId': foodId,
        'role': role,
        'amount': amount,
        'unit': unit,
        'timesPerDay': timesPerDay,
        'replacesId': replacesId,
        'note': note,
        'kcalPerKg': kcalPerKg,
        'kcalPerUnit': kcalPerUnit,
        if (recipe != null) 'recipe': [for (final r in recipe!) {'id': r.id, 'name': r.name, 'grams': r.grams}],
      };
}

DietItem dietItemFromCalc(Map<String, dynamic> j) => DietItem(
      id: '${j['id']}',
      foodId: j['foodId'] as String?,
      foodName: '${j['foodName']}',
      role: '${j['role'] ?? 'main'}',
      amount: (j['amount'] as num).toDouble(),
      unit: '${j['unit']}',
      timesPerDay: (j['timesPerDay'] as num).toDouble(),
      startedOn: '${j['startedOn']}',
      endedOn: j['endedOn'] as String?,
      replacedId: j['replacedId'] as String?,
      note: j['note'] as String?,
      kcalPerKg: (j['kcalPerKg'] as num?)?.toDouble(),
      kcalPerUnit: (j['kcalPerUnit'] as num?)?.toDouble(),
      recipe: j['recipe'] == null ? null : [for (final r in (j['recipe'] as List)) RecipeLine(id: '${r['id']}', name: '${r['name']}', grams: (r['grams'] as num).toDouble())],
    );

Goal goalFromCalc(Map<String, dynamic> j) => Goal(
      type: GoalType.parse('${j['type']}'),
      targetKg: (j['targetKg'] as num).toDouble(),
      days: (j['days'] as num).toInt(),
      custom: j['custom'] == true,
      fromChart: j['fromChart'] == true,
      kcalOverride: (j['kcalOverride'] as num?)?.toDouble(),
      startOn: j['startOn'] as String?,
      startKg: (j['startKg'] as num?)?.toDouble(),
      targetDate: j['targetDate'] as String?,
    );

GoalRecord goalRecordFromCalc(Map<String, dynamic> j) => GoalRecord(
      type: GoalType.parse('${j['type']}'),
      startOn: '${j['startOn']}',
      startKg: (j['startKg'] as num).toDouble(),
      targetKg: (j['targetKg'] as num).toDouble(),
      targetDate: '${j['targetDate']}',
      endedOn: '${j['endedOn']}',
      endKg: (j['endKg'] as num?)?.toDouble(),
      outcome: '${j['outcome']}',
    );
