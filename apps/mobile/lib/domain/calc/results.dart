import '../entities/diet_item.dart';
import '../entities/pet.dart';

/// What the `calc` function returns, as typed values. No calculation happens here, only reading the JSON.

double _d(Object? v) => (v as num).toDouble();
Map<String, dynamic> _m(Object? v) => (v as Map).cast<String, dynamic>();
List<Map<String, dynamic>> _l(Object? v) => ((v as List?) ?? const []).map(_m).toList();

class EnergyPlan {
  const EnergyPlan({required this.stage, required this.ideal, required this.kcal, required this.losing, required this.vetHold, required this.needsVet, required this.method});
  final String stage;
  final double ideal;
  final double kcal;
  final bool losing;
  final bool vetHold;
  final bool needsVet;
  final String method;
  factory EnergyPlan.fromJson(Map<String, dynamic> j) => EnergyPlan(stage: j['stage'] as String, ideal: _d(j['ideal']), kcal: _d(j['kcal']), losing: j['losing'] == true, vetHold: j['vetHold'] == true, needsVet: j['needsVet'] == true, method: '${j['method'] ?? ''}');
}

class DailyTarget {
  const DailyTarget(this.kcal, this.label);
  final int kcal;
  final String label;
  static DailyTarget? from(Object? v) => v == null ? null : DailyTarget((_m(v)['kcal'] as num).round(), '${_m(v)['label']}');
}

class WeighStatus {
  const WeighStatus({required this.interval, required this.dueInDays, required this.streak, required this.lastDaysAgo});
  final int interval;
  final int dueInDays;
  final int streak;
  final int lastDaysAgo;
  factory WeighStatus.fromJson(Map<String, dynamic> j) => WeighStatus(interval: (j['interval'] as num).toInt(), dueInDays: (j['dueInDays'] as num).toInt(), streak: (j['streak'] as num).toInt(), lastDaysAgo: (j['lastDaysAgo'] as num).toInt());
}

/// The saved goal with the days left until its fixed date.
class EffectiveGoal {
  const EffectiveGoal({required this.type, required this.targetKg, required this.daysLeft, required this.custom, required this.expired, this.targetDate});
  final GoalType type;
  final double targetKg;
  final int daysLeft;
  final bool custom;
  final bool expired;
  final String? targetDate;
  static EffectiveGoal? from(Object? v) {
    if (v == null) return null;
    final j = _m(v);
    return EffectiveGoal(type: GoalType.parse('${j['type']}'), targetKg: _d(j['targetKg']), daysLeft: (j['daysLeft'] as num?)?.toInt() ?? 0, custom: j['custom'] == true, expired: j['expired'] == true, targetDate: j['targetDate'] as String?);
  }
}

/// One answer to "how active are they": the minutes of walking or play a day, and what to save for it.
class ActivityOption {
  const ActivityOption({required this.label, this.sub, required this.exerciseMin, required this.activity});
  final String label;
  final String? sub;
  final int exerciseMin;
  final String activity; // low, normal, high
}

class PetSummary {
  const PetSummary({required this.ageMonths, required this.growing, required this.plan, required this.target, required this.weigh, required this.completeness, required this.idealKg, required this.goal, this.activityLabel = '', this.activityOptions = const []});
  final String activityLabel;
  final List<ActivityOption> activityOptions;
  final int ageMonths;
  final bool growing;
  final EnergyPlan plan;
  final DailyTarget? target;
  final WeighStatus weigh;
  final int completeness;
  final double idealKg;
  final EffectiveGoal? goal;
  factory PetSummary.fromJson(Object? v) {
    final j = _m(v);
    return PetSummary(ageMonths: (j['ageMonths'] as num).toInt(), growing: j['growing'] == true, plan: EnergyPlan.fromJson(_m(j['plan'])), target: DailyTarget.from(j['target']), weigh: WeighStatus.fromJson(_m(j['weigh'])), completeness: (j['completeness'] as num).toInt(), idealKg: _d(j['idealKg']), goal: EffectiveGoal.from(j['goal']), activityLabel: j['activity'] == null ? '' : '${_m(j['activity'])['label']}', activityOptions: j['activity'] == null ? const [] : [for (final o in _l(_m(j['activity'])['options'])) ActivityOption(label: '${o['label']}', sub: o['sub'] as String?, exerciseMin: (_m(o['patch'])['exerciseMin'] as num).toInt(), activity: '${_m(o['patch'])['activity']}')]);
  }
}

class Pct {
  const Pct({required this.value, this.edge, this.young = false});
  final int value;
  final String? edge; // below, above
  final bool young;
  static Pct? from(Object? v) => v == null ? null : Pct(value: (_m(v)['value'] as num).toInt(), edge: _m(v)['edge'] as String?, young: _m(v)['young'] == true);
}

/// One month of a growth curve: the weights (kg) at the 2nd, 25th, 50th, 75th and 98th percentile.
class GrowthRow {
  const GrowthRow({required this.m, required this.p02, required this.p25, required this.p50, required this.p75, required this.p98});
  final double m;
  final double p02;
  final double p25;
  final double p50;
  final double p75;
  final double p98;
  factory GrowthRow.fromJson(Map<String, dynamic> j) => GrowthRow(m: _d(j['m']), p02: _d(j['p02']), p25: _d(j['p25']), p50: _d(j['p50']), p75: _d(j['p75']), p98: _d(j['p98']));
  double operator [](String key) => switch (key) { 'p02' => p02, 'p25' => p25, 'p50' => p50, 'p75' => p75, _ => p98 };
}

class WeighedPoint {
  const WeighedPoint({required this.on, required this.kg, required this.m, this.pct});
  final String on;
  final double kg;
  final double m;
  final Pct? pct;
}

class GrowthProjection {
  const GrowthProjection(this.points);
  final List<({double m, double kg})> points;
}

class TrendProjection {
  const TrendProjection(this.points);
  final List<({int t, double kg})> points;
}

class TargetStart {
  const TargetStart({required this.days, required this.kg, required this.lo, required this.hi});
  final int days;
  final double kg;
  final double lo;
  final double hi;
  factory TargetStart.fromJson(Object? v) {
    final j = _m(v);
    return TargetStart(days: (j['days'] as num).toInt(), kg: _d(j['kg']), lo: _d(j['lo']), hi: _d(j['hi']));
  }
}

class GrowthCardData {
  const GrowthCardData({required this.nowM, required this.ageMonths, required this.growing, required this.plan, required this.cur, required this.bands, required this.points, required this.initial, required this.growthProjection, required this.trendProjection, required this.breedRange, required this.dietMarks, this.dietDates = const [], required this.saved});
  final double nowM;
  final int ageMonths;
  final bool growing;
  final EnergyPlan plan;
  final Pct? cur;
  final List<GrowthRow> bands;
  final List<WeighedPoint> points;
  final TargetStart initial;
  final GrowthProjection? growthProjection;
  final TrendProjection? trendProjection;
  final ({double min, double max})? breedRange;
  final List<double> dietMarks; // age in months of each diet change, newest first
  final List<String> dietDates; // the same changes' days, newest first
  final EffectiveGoal? saved;

  factory GrowthCardData.fromJson(Object? v) {
    final j = _m(v);
    final proj = j['projection'] == null ? null : _m(j['projection']);
    final isGrowth = j['growing'] == true;
    final breed = j['breed'] == null ? null : _m(j['breed']);
    return GrowthCardData(
      nowM: _d(j['nowM']),
      ageMonths: (j['ageMonths'] as num).toInt(),
      growing: isGrowth,
      plan: EnergyPlan.fromJson(_m(j['plan'])),
      cur: Pct.from(j['cur']),
      bands: _l(j['bands']).map(GrowthRow.fromJson).toList(),
      points: [for (final p in _l(j['points'])) WeighedPoint(on: '${p['on']}', kg: _d(p['kg']), m: _d(p['m']), pct: Pct.from(p['pct']))],
      initial: TargetStart.fromJson(j['initial']),
      growthProjection: proj != null && isGrowth ? GrowthProjection([for (final p in _l(proj['points'])) (m: _d(p['m']), kg: _d(p['kg']))]) : null,
      trendProjection: proj != null && !isGrowth ? TrendProjection([for (final p in _l(proj['points'])) (t: (p['t'] as num).toInt(), kg: _d(p['kg']))]) : null,
      breedRange: breed == null ? null : (min: _d(breed['min']), max: _d(breed['max'])),
      dietMarks: [for (final d in _l(j['dietMarks'])) _d(d['m'])],
      dietDates: [for (final d in _l(j['dietMarks'])) '${d['date']}'],
      saved: EffectiveGoal.from(j['goal']),
    );
  }
}

class Pace {
  const Pace(this.state, this.text);
  final String state; // good, caution, bad
  final String text;
}

class TargetCheck {
  const TargetCheck({required this.kind, required this.pace, required this.kcal, required this.weeklyPct, this.pct, this.curPct, this.note = '', this.vetWarning});
  final String kind; // growth, adult
  final Pace pace;
  final int kcal;
  final double weeklyPct;
  final int? pct;
  final int? curPct;
  final String note;
  final String? vetWarning;
  factory TargetCheck.fromJson(Object? v) {
    final j = _m(v);
    final p = _m(j['pace']);
    return TargetCheck(kind: '${j['kind']}', pace: Pace('${p['state']}', '${p['text']}'), kcal: (j['kcal'] as num).round(), weeklyPct: _d(j['weeklyPct']), pct: (j['pct'] as num?)?.toInt(), curPct: (j['curPct'] as num?)?.toInt(), note: '${j['note'] ?? ''}', vetWarning: j['vetWarning'] as String?);
  }
}

class Retarget {
  const Retarget({required this.days, required this.kg, required this.lo, required this.hi});
  final int days;
  final double kg;
  final double lo;
  final double hi;
  factory Retarget.fromJson(Object? v) {
    final j = _m(v);
    return Retarget(days: (j['days'] as num).toInt(), kg: _d(j['kg']), lo: _d(j['lo']), hi: _d(j['hi']));
  }
}

class WeightCheck {
  const WeightCheck({required this.ok, this.message});
  final bool ok;
  final String? message;
  factory WeightCheck.fromJson(Object? v) => WeightCheck(ok: _m(v)['ok'] == true, message: _m(v)['message'] as String?);
}

class BreedSize {
  const BreedSize({required this.min, required this.max});
  final double min;
  final double max;
  static BreedSize? from(Object? v) => v == null ? null : BreedSize(min: _d(_m(v)['min']), max: _d(_m(v)['max']));
}

class ItemKcal {
  const ItemKcal({required this.perDay, required this.source});
  final double perDay;
  final String source; // label, estimate, yours, mix
  static ItemKcal? from(Object? v) => v == null ? null : ItemKcal(perDay: _d(_m(v)['perDay']), source: '${_m(v)['source']}');
}

class DietChangeDay {
  const DietChangeDay({required this.date, required this.started, required this.stopped, this.lines = const [], this.isFirst = false});
  final String date;
  final List<String> started;
  final List<String> stopped;

  /// Plain-text lines: "Replaced A (..) with B (..)", "Changed B from .. to ..", "Added C (..)", "Stopped D".
  final List<String> lines;
  final bool isFirst;
}

/// What the food or ingredient check found for one item in the diet.
class ItemFlag {
  const ItemFlag({required this.wrongSpecies, required this.foodSpecies, this.badText});
  final bool wrongSpecies;
  final String foodSpecies;
  final String? badText;
}

/// Weight from one diet change until the next (or now).
class DietPeriod {
  const DietPeriod({required this.start, this.end, this.startKg, this.endKg, this.weighIns = 0, this.enough = false, this.weeklyGain, this.pctStart, this.pctEnd});
  final String start;
  final String? end;
  final double? startKg;
  final double? endKg;
  final int weighIns;
  final bool enough;
  final double? weeklyGain;
  final int? pctStart;
  final int? pctEnd;
}

String _unitWords(String u, num n) => const ['g', 'ml', 'tsp', 'tbsp'].contains(u) ? u : (n == 1 ? u : (u == 'piece' ? 'pieces' : '${u}s'));
String _num(num v) => v == v.roundToDouble() ? '${v.round()}' : '$v';
String _amountText(Map<String, dynamic> it) => '${_num(it['amount'] as num)} ${_unitWords('${it['unit']}', it['amount'] as num)} × ${_num(it['timesPerDay'] as num)} a day';

class DietViewData {
  const DietViewData({required this.summary, required this.current, required this.items, required this.kcal, required this.unknown, required this.vsState, required this.vsPct, required this.changes, this.flags = const {}, this.periods = const [], this.treatShare = 0.1, this.treatKcal = 0, this.floor});
  final PetSummary summary;
  final List<DietItem> current;
  final Map<String, ItemKcal?> items;
  final int kcal;
  final int unknown;
  final String vsState; // none, unknown, below, about, above
  final int? vsPct;
  final List<DietChangeDay> changes;
  final Map<String, ItemFlag> flags;
  final List<DietPeriod> periods;
  final double treatShare;
  final int treatKcal;
  final double? floor;

  factory DietViewData.fromJson(Object? v, List<DietItem> allItems) {
    final j = _m(v);
    final ids = [for (final c in _l(j['current'])) '${c['id']}'];
    final k = _m(j['kcal']);
    final vs = _m(j['vs']);
    List<String> foodNames(Object? list) => [for (final i in _l(list)) '${i['foodName']}'];
    DietChangeDay day(Map<String, dynamic> c) {
      final replaced = _l(c['replaced']);
      final amounts = _l(c['amountChanges']);
      final started = _l(c['started']);
      final stopped = _l(c['stopped']);
      final first = c['isFirst'] == true;
      final lines = <String>[
        for (final r in replaced) 'Replaced ${_m(r['from'])['foodName']} (${_amountText(_m(r['from']))}) with ${_m(r['to'])['foodName']} (${_amountText(_m(r['to']))})',
        for (final r in amounts) 'Changed ${_m(r['to'])['foodName']} from ${_amountText(_m(r['from']))} to ${_amountText(_m(r['to']))}',
        for (final s in started)
          if (!replaced.any((r) => _m(r['to'])['id'] == s['id']) && !amounts.any((r) => _m(r['to'])['id'] == s['id'])) '${first ? 'Started' : 'Added'} ${s['foodName']} (${_amountText(s)})',
        for (final s in stopped)
          if (!replaced.any((r) => _m(r['from'])['id'] == s['id']) && !amounts.any((r) => _m(r['from'])['id'] == s['id'])) 'Stopped ${s['foodName']}',
      ];
      return DietChangeDay(date: '${c['date']}', started: foodNames(c['started']), stopped: foodNames(c['stopped']), lines: lines, isFirst: first);
    }

    final flags = <String, ItemFlag>{};
    for (final e in _m(j['flags']).entries) {
      final f = _m(e.value);
      flags[e.key] = ItemFlag(wrongSpecies: f['wrongSpecies'] == true, foodSpecies: '${f['foodSpecies']}', badText: f['bad'] == null ? null : '${_m(f['bad'])['text']}');
    }
    return DietViewData(
      summary: PetSummary.fromJson(j),
      current: [for (final id in ids) allItems.firstWhere((x) => x.id == id)],
      items: {for (final e in _m(j['items']).entries) e.key: ItemKcal.from(e.value)},
      kcal: (k['kcal'] as num).round(),
      unknown: (k['unknown'] as num).toInt(),
      vsState: '${vs['state']}',
      vsPct: (vs['pct'] as num?)?.toInt(),
      changes: [for (final c in _l(j['changes'])) day(c)],
      flags: flags,
      periods: [
        for (final p in _l(j['periods']))
          DietPeriod(
            start: '${p['start']}',
            end: p['end'] == null ? null : '${p['end']}',
            startKg: (p['startKg'] as num?)?.toDouble(),
            endKg: (p['endKg'] as num?)?.toDouble(),
            weighIns: (p['weighIns'] as num?)?.toInt() ?? 0,
            enough: p['enough'] == true,
            weeklyGain: (p['weeklyGain'] as num?)?.toDouble(),
            pctStart: (p['pctStart'] as num?)?.toInt(),
            pctEnd: (p['pctEnd'] as num?)?.toInt(),
          ),
      ],
      treatShare: (j['treatShare'] as num?)?.toDouble() ?? 0.1,
      treatKcal: (k['treatKcal'] as num?)?.round() ?? 0,
      floor: (_m(j['plan'])['floor'] as num?)?.toDouble(),
    );
  }
}

class FitWarn {
  const FitWarn(this.level, this.text);
  final String level; // bad, caution
  final String text;
}

/// One nutrient of a food per 1000 kcal (grams), with the AAFCO minimum and maximum for the pet's life stage.
class NutrientCheck {
  const NutrientCheck({required this.label, required this.state, this.value, this.min, this.max});
  final String label;
  final String state; // good, bad, unknown
  final double? value;
  final double? min;
  final double? max;
}

class FoodFit {
  const FoodFit({required this.verdict, this.warn = const [], this.checks = const []});
  final String verdict; // good, caution, bad
  final List<FitWarn> warn;
  final List<NutrientCheck> checks;
  factory FoodFit.fromJson(Object? v) {
    final j = _m(v);
    double? dd(Object? x) => (x as num?)?.toDouble();
    return FoodFit(
      verdict: '${j['verdict']}',
      warn: [for (final w in _l(j['warn'])) FitWarn('${w['level']}', '${w['text']}')],
      checks: [for (final c in _l(j['checks'])) NutrientCheck(label: '${c['label']}', state: '${c['state']}', value: dd(c['value']), min: c['target'] == null ? null : dd(_m(c['target'])['min']), max: c['target'] == null ? null : dd(_m(c['target'])['max']))],
    );
  }
}

/// The add-a-food form, recalculated as the owner types (calories per measure, the day's total, and the units that make sense).
class DietLive {
  const DietLive({this.allowed, required this.unit, required this.needGrams, this.placeholder, required this.hasLabel, this.pieceName, this.kcalDay, this.kcalMeal, this.dayAmount, this.pct, this.source = '', this.margin});
  final List<String>? allowed;
  final String unit;
  final bool needGrams;
  final num? placeholder;
  final bool hasLabel;
  final String? pieceName;
  final int? kcalDay;
  final int? kcalMeal;
  final num? dayAmount;
  final int? pct;
  final String source; // label, estimate, yours, mix
  final num? margin;
  bool get hasOut => kcalDay != null;
  factory DietLive.fromJson(Object? v) {
    final j = _m(v);
    final o = j['out'] == null ? null : _m(j['out']);
    final hasPer = o != null && o['per'] != null;
    return DietLive(
      allowed: j['allowed'] == null ? null : [for (final u in (j['allowed'] as List)) '$u'],
      unit: '${j['unit']}',
      needGrams: j['needGrams'] == true,
      placeholder: j['placeholder'] as num?,
      hasLabel: j['hasLabel'] == true,
      pieceName: j['pieceName'] as String?,
      kcalDay: hasPer ? (o['kD'] as num).round() : null,
      kcalMeal: hasPer ? (o['kM'] as num).round() : null,
      dayAmount: o?['dayAmount'] as num?,
      pct: (o?['pct'] as num?)?.round(),
      source: o == null ? '' : '${o['src'] ?? ''}',
      margin: o?['mg'] as num?,
    );
  }
}

class SuggestedAmount {
  const SuggestedAmount({required this.kcal, required this.meals, required this.perMeal});
  final double kcal;
  final int meals;
  final int perMeal;
  static SuggestedAmount? from(Object? v) => v == null ? null : SuggestedAmount(kcal: _d(_m(v)['kcal']), meals: (_m(v)['meals'] as num).toInt(), perMeal: (_m(v)['perMeal'] as num).round());
}

class TreatHint {
  const TreatHint({this.count, this.limitedBy, this.badText});
  final int? count;
  final String? limitedBy;
  final String? badText;
  factory TreatHint.fromJson(Object? v) {
    final j = _m(v);
    final p = j['plan'] == null ? <String, dynamic>{} : _m(j['plan']);
    return TreatHint(count: (p['count'] as num?)?.toInt(), limitedBy: p['limitedBy'] as String?, badText: j['bad'] == null ? null : '${_m(j['bad'])['text']}');
  }
}

/// One card of the ranked food list: the fit, the daily amount and cost for this pet, nutrients per 1000 kcal, and why it matched.
class RankedFood {
  const RankedFood({required this.id, this.fit, this.kcal, this.grams, this.cost, this.gramsRef, this.protein, this.fat, this.top = false, this.reasons = const [], this.guideText, this.guideLabel, this.guideCovers = true, this.petKg});
  final String id;
  final FoodFit? fit;
  final double? kcal; // the pet's daily calories
  final double? grams; // grams of this food a day
  final double? cost;
  final double? gramsRef;
  final double? protein; // grams per 1000 kcal
  final double? fat;
  final bool top;
  final List<String> reasons;
  final String? guideText;
  final String? guideLabel;
  final bool guideCovers;
  final double? petKg;

  factory RankedFood.fromJson(Object? v) {
    final j = _m(v);
    double? dd(Object? x) => (x as num?)?.toDouble();
    final m = j['match'] == null ? null : _m(j['match']);
    final g = j['guide'] == null ? null : _m(j['guide']);
    String? gt;
    if (g != null && g['covers'] == true) {
      final gr = g['grams'] as List?;
      gt = gr != null ? '${(gr[0] as num).round()}${gr[1] != gr[0] ? ' to ${(gr[1] as num).round()}' : ''} g a day' : '${g['text']}';
    }
    return RankedFood(
      id: '${j['id']}',
      fit: j['fit'] == null ? null : FoodFit.fromJson(j['fit']),
      kcal: dd(j['kcal']),
      grams: dd(j['grams']),
      cost: dd(j['cost']),
      gramsRef: dd(j['gramsRef']),
      protein: dd(j['protein']),
      fat: dd(j['fat']),
      top: m?['top'] == true,
      reasons: m == null ? const [] : [for (final r in (m['reasons'] as List? ?? const [])) '$r'],
      guideText: gt,
      guideLabel: g == null ? null : '${_m(g['row'])['weight_label']}',
      guideCovers: g == null || g['covers'] == true,
      petKg: dd(j['petKg']),
    );
  }
}

class RankedFoods {
  const RankedFoods({required this.total, required this.items});
  final int total;
  final List<RankedFood> items;
  factory RankedFoods.fromJson(Object? v) {
    final j = _m(v);
    return RankedFoods(total: (j['total'] as num).toInt(), items: [for (final i in _l(j['items'])) RankedFood.fromJson(i)]);
  }
}

/// The sensible range of one nutrient number on the Find food page (per 1,000 kcal, or kcal per 100 g for energy), from what foods actually offer.
class NumBound {
  const NumBound({required this.lo, required this.hi, required this.step, required this.mid});
  final double lo;
  final double hi;
  final double step;
  final double mid;
}

class OwnNumbers {
  const OwnNumbers({required this.bounds, required this.presets});
  final Map<String, NumBound> bounds; // protein, fat, fibre, calcium, phosphorus, energy
  final Map<String, List<({String key, String op, double v})>> presets; // weightloss etc.
  factory OwnNumbers.fromJson(Object? v) {
    final j = _m(v);
    final b = _m(_m(j['bounds'])['kcal']);
    return OwnNumbers(
      bounds: {for (final e in b.entries) e.key: NumBound(lo: _d(_m(e.value)['lo']), hi: _d(_m(e.value)['hi']), step: _d(_m(e.value)['step']), mid: _d(_m(e.value)['mid']))},
      presets: {for (final e in _m(j['presets']).entries) e.key: [for (final i in _l(e.value)) (key: '${i['key']}', op: '${i['op']}', v: _d(i['v']))]},
    );
  }
}

class UnitKcal {
  const UnitKcal({required this.per, required this.source});
  final double per;
  final String source; // label, estimate
  static UnitKcal? from(Object? v) => v == null ? null : UnitKcal(per: _d(_m(v)['per']), source: '${_m(v)['source']}');
}

class MixCheck {
  const MixCheck(this.label, this.state, {this.value, this.min, this.max});
  final String label;
  final String state; // good, bad, unknown
  final double? value; // grams per 1000 kcal
  final double? min;
  final double? max;
}

class MixLine {
  const MixLine({required this.id, required this.name, required this.grams, required this.state});
  final String id;
  final String name;
  final double grams;
  final String state; // raw, cooked, canned, ...
}

class MixResult {
  const MixResult({required this.grams, required this.kcal, required this.kcalPerKg, required this.checks, this.kcalPer100g = 0, this.moisturePct = 0, this.ratio, this.pctSum, this.lines = const []});
  final double grams;
  final double kcal;
  final double kcalPerKg;
  final List<MixCheck> checks;
  final double kcalPer100g;
  final double moisturePct;
  final double? ratio; // calcium to phosphorus
  final double? pctSum;
  final List<MixLine> lines;
  factory MixResult.fromJson(Object? v) {
    final j = _m(v);
    double? dd(Object? x) => (x as num?)?.toDouble();
    return MixResult(
      grams: _d(j['grams']),
      kcal: _d(j['kcal']),
      kcalPerKg: _d(j['kcalPerKg']),
      kcalPer100g: dd(j['kcalPer100g']) ?? 0,
      moisturePct: dd(j['moisturePct']) ?? 0,
      ratio: dd(j['ratio']),
      pctSum: dd(j['pctSum']),
      checks: [
        for (final r in _l(j['rows']))
          MixCheck('${r['label']}', '${r['state']}', value: dd(r['value']), min: r['target'] == null ? null : dd(_m(r['target'])['min']), max: r['target'] == null ? null : dd(_m(r['target'])['max'])),
      ],
      lines: [for (final l in _l(j['lines'])) MixLine(id: '${l['id']}', name: '${l['name']}', grams: _d(l['grams']), state: '${l['state'] ?? ''}')],
    );
  }
}

class EstimateKcal {
  const EstimateKcal(this.kcalPerKg);
  final double kcalPerKg;
  static EstimateKcal? from(Object? v) => v == null ? null : EstimateKcal(_d(_m(v)['kcalPerKg']));
}
