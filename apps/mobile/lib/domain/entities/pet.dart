import 'diet_item.dart';

enum Species {
  dog,
  cat;

  static Species parse(String s) => s == 'cat' ? Species.cat : Species.dog;
  String get label => this == Species.dog ? 'dog' : 'cat';
}

/// One weigh-in. `on` is an ISO date (yyyy-MM-dd).
class WeighIn {
  const WeighIn({required this.on, required this.kg, this.bcs});
  final String on;
  final double kg;
  final int? bcs;
}

enum GoalType {
  lose,
  maintain,
  gain,
  grow;

  static GoalType parse(String s) => GoalType.values.firstWhere((g) => g.name == s, orElse: () => GoalType.maintain);
}

/// A saved goal. The target date is fixed when the goal is set.
class Goal {
  const Goal({
    required this.type,
    required this.targetKg,
    required this.days,
    this.custom = false,
    this.fromChart = false,
    this.kcalOverride,
    this.startOn,
    this.startKg,
    this.targetDate,
  });
  final GoalType type;
  final double targetKg;
  final int days;
  final bool custom;
  final bool fromChart;
  final double? kcalOverride;
  final String? startOn;
  final double? startKg;
  final String? targetDate;
}

/// A goal that ended, kept in the history.
class GoalRecord {
  const GoalRecord({required this.type, required this.startOn, required this.startKg, required this.targetKg, required this.targetDate, required this.endedOn, this.endKg, required this.outcome});
  final GoalType type;
  final String startOn;
  final double startKg;
  final double targetKg;
  final String targetDate;
  final String endedOn;
  final double? endKg;
  final String outcome;
}

class Pet {
  const Pet({
    required this.id,
    required this.species,
    required this.name,
    required this.birth,
    required this.weightKg,
    this.breed = '',
    this.sizeCat,
    this.sex = 'unknown',
    this.neutered = true,
    this.bcs = 5,
    this.activity = 'normal',
    this.exerciseMin,
    this.allergies = const [],
    this.health = const [],
    this.answered = const {},
    this.goal,
    this.logs = const [],
    this.skips = const [],
    this.diet = const [],
    this.goalHistory = const [],
    this.remind = false,
    this.dietSkipped = false,
  });

  final String id;
  final Species species;
  final String name;
  final String breed;
  final String? sizeCat;
  final String birth;
  final String sex;
  final bool neutered;
  final double weightKg;
  final int bcs;
  final String activity;
  final int? exerciseMin;
  final List<String> allergies;
  final List<String> health;
  final Map<String, bool> answered;
  final Goal? goal;
  final List<WeighIn> logs;
  final List<String> skips;
  final List<DietItem> diet;
  final List<GoalRecord> goalHistory;
  final bool remind;
  final bool dietSkipped;

  Pet copyWith({
    String? name,
    String? breed,
    String? sizeCat,
    String? birth,
    String? sex,
    bool? neutered,
    double? weightKg,
    int? bcs,
    String? activity,
    int? exerciseMin,
    List<String>? allergies,
    List<String>? health,
    Map<String, bool>? answered,
    Goal? goal,
    bool clearGoal = false,
    List<WeighIn>? logs,
    List<String>? skips,
    List<DietItem>? diet,
    List<GoalRecord>? goalHistory,
    bool? remind,
    bool? dietSkipped,
  }) =>
      Pet(
        id: id,
        species: species,
        name: name ?? this.name,
        breed: breed ?? this.breed,
        sizeCat: sizeCat ?? this.sizeCat,
        birth: birth ?? this.birth,
        sex: sex ?? this.sex,
        neutered: neutered ?? this.neutered,
        weightKg: weightKg ?? this.weightKg,
        bcs: bcs ?? this.bcs,
        activity: activity ?? this.activity,
        exerciseMin: exerciseMin ?? this.exerciseMin,
        allergies: allergies ?? this.allergies,
        health: health ?? this.health,
        answered: answered ?? this.answered,
        goal: clearGoal ? null : (goal ?? this.goal),
        logs: logs ?? this.logs,
        skips: skips ?? this.skips,
        diet: diet ?? this.diet,
        goalHistory: goalHistory ?? this.goalHistory,
        remind: remind ?? this.remind,
        dietSkipped: dietSkipped ?? this.dietSkipped,
      );
}

/// Weigh-ins oldest first, one per day (the last one entered that day wins). Just ordering for display.
List<WeighIn> sortedLogs(List<WeighIn> logs) {
  final byDay = <String, WeighIn>{};
  for (final l in [...logs]..sort((a, b) => a.on.compareTo(b.on))) {
    byDay[l.on] = l;
  }
  return byDay.values.toList();
}
