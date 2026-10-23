import '../../domain/domain.dart';

/// Translation between database rows and domain entities. Column names follow the `pets`, `weight_logs`, `pet_goals` and
/// `pet_diet_items` tables the web app also uses, so both apps read and write the same data.

double? _d(Object? v) => v == null ? null : (v is num ? v.toDouble() : double.tryParse('$v'));
List<String> _list(Object? v) => (v as List?)?.map((e) => '$e').toList() ?? const [];

Map<String, dynamic> goalToJson(Goal g) => {
      'type': g.type.name,
      'targetKg': g.targetKg,
      'days': g.days,
      if (g.custom) 'custom': true,
      if (g.fromChart) 'fromChart': true,
      if (g.kcalOverride != null) 'kcalOverride': g.kcalOverride,
      if (g.startOn != null) 'startOn': g.startOn,
      if (g.startKg != null) 'startKg': g.startKg,
      if (g.targetDate != null) 'targetDate': g.targetDate,
    };

Goal? goalFromJson(Object? j) {
  if (j is! Map) return null;
  return Goal(
    type: GoalType.parse('${j['type']}'),
    targetKg: _d(j['targetKg']) ?? 0,
    days: (j['days'] as num?)?.toInt() ?? 90,
    custom: j['custom'] == true,
    fromChart: j['fromChart'] == true,
    kcalOverride: _d(j['kcalOverride']),
    startOn: j['startOn'] as String?,
    startKg: _d(j['startKg']),
    targetDate: j['targetDate'] as String?,
  );
}

/// The columns of `pets` the owner can change.
Map<String, dynamic> petToRow(Pet p) => {
      'species': p.species.label,
      'name': p.name,
      'breed': p.breed,
      'size_cat': p.sizeCat,
      'birth_date': p.birth,
      'sex': p.sex,
      'neutered': p.neutered,
      'weight_kg': p.weightKg,
      'bcs': p.bcs,
      'activity': p.activity,
      'exercise_min': p.exerciseMin,
      'allergies': p.allergies,
      'health': p.health,
      'answered': p.answered,
      'goal': p.goal == null ? null : goalToJson(p.goal!),
      'target': p.goal == null || p.goal!.targetDate == null ? null : {'kg': p.goal!.targetKg, 'days': p.goal!.days, 'date': p.goal!.targetDate, 'setOn': p.goal!.startOn},
      'skips': p.skips,
      'remind': p.remind,
    };

Pet petFromRow(Map<String, dynamic> r, {List<WeighIn> logs = const [], List<DietItem> diet = const [], List<GoalRecord> history = const []}) => Pet(
      id: r['id'] as String,
      species: Species.parse('${r['species']}'),
      name: '${r['name']}',
      breed: '${r['breed'] ?? ''}',
      sizeCat: r['size_cat'] as String?,
      birth: '${r['birth_date']}'.substring(0, 10),
      sex: '${r['sex'] ?? 'unknown'}',
      neutered: r['neutered'] != false,
      weightKg: _d(r['weight_kg']) ?? 0,
      bcs: (r['bcs'] as num?)?.toInt() ?? 5,
      activity: '${r['activity'] ?? 'normal'}',
      exerciseMin: (r['exercise_min'] as num?)?.toInt(),
      allergies: _list(r['allergies']),
      health: _list(r['health']),
      answered: ((r['answered'] as Map?) ?? const {}).map((k, v) => MapEntry('$k', v == true)),
      goal: goalFromJson(r['goal']),
      skips: _list(r['skips']),
      remind: r['remind'] == true,
      logs: logs,
      diet: diet,
      goalHistory: history,
    );

WeighIn weighInFromRow(Map<String, dynamic> r) => WeighIn(on: '${r['measured_on']}'.substring(0, 10), kg: _d(r['kg']) ?? 0, bcs: (r['bcs'] as num?)?.toInt());

GoalRecord goalRecordFromRow(Map<String, dynamic> r) => GoalRecord(
      type: GoalType.parse('${r['type']}'),
      startOn: '${r['start_on']}',
      startKg: _d(r['start_kg']) ?? 0,
      targetKg: _d(r['target_kg']) ?? 0,
      targetDate: '${r['target_date']}',
      endedOn: '${r['ended_on']}',
      endKg: _d(r['end_kg']),
      outcome: '${r['outcome']}',
    );

Map<String, dynamic> goalRecordToRow(GoalRecord h, String petId) => {
      'pet_id': petId,
      'type': h.type.name,
      'start_on': h.startOn,
      'start_kg': h.startKg,
      'target_kg': h.targetKg,
      'target_date': h.targetDate,
      'ended_on': h.endedOn,
      'end_kg': h.endKg,
      'outcome': h.outcome,
    };

DietItem dietFromRow(Map<String, dynamic> r) => DietItem(
      id: r['id'] as String,
      foodId: r['food_id'] as String?,
      foodName: '${r['food_name']}',
      role: '${r['role'] ?? 'main'}',
      amount: _d(r['amount']) ?? 0,
      unit: '${r['unit'] ?? 'g'}',
      timesPerDay: _d(r['times_per_day']) ?? 1,
      startedOn: '${r['started_on']}'.substring(0, 10),
      endedOn: r['ended_on'] == null ? null : '${r['ended_on']}'.substring(0, 10),
      replacedId: r['replaced_id'] as String?,
      note: r['note'] as String?,
      kcalPerKg: _d(r['kcal_per_kg']),
      kcalPerUnit: _d(r['kcal_per_unit']),
      recipe: (r['recipe'] as List?)?.map((e) => RecipeLine(id: '${e['id']}', name: '${e['name']}', grams: _d(e['grams']) ?? 0)).toList(),
    );

Map<String, dynamic> dietToRow(DietItem it, String petId) => {
      'id': it.id,
      'pet_id': petId,
      'food_id': it.foodId,
      'food_name': it.foodName,
      'role': it.role,
      'amount': it.amount,
      'unit': it.unit,
      'times_per_day': it.timesPerDay,
      'started_on': it.startedOn,
      'ended_on': it.endedOn,
      'replaced_id': it.replacedId,
      'note': it.note,
      // sent only when set, so a database without these columns still saves normal foods
      if (it.kcalPerKg != null) 'kcal_per_kg': it.kcalPerKg,
      if (it.kcalPerUnit != null) 'kcal_per_unit': it.kcalPerUnit,
      if (it.recipe != null) 'recipe': it.recipe!.map((l) => {'id': l.id, 'name': l.name, 'grams': l.grams}).toList(),
    };

/// A catalogue row (`catalog.products`) as a [Food]. The id has its dashes turned into underscores, as the web app does.
Food foodFromRow(Map<String, dynamic> p, {bool treat = false}) {
  final id = '${p['id']}'.replaceAll('-', '_');
  return Food(
    id: id,
    brand: '${p['brand'] ?? ''}',
    name: '${p['name'] ?? ''}',
    species: '${p['species'] ?? 'dog'}',
    format: '${p['format'] ?? 'other'}',
    lifeStage: '${p['life_stage'] ?? 'unknown'}',
    protein: _d(p['protein_g_100g']),
    fat: _d(p['fat_g_100g']),
    fibre: _d(p['fibre_g_100g']),
    moisture: _d(p['moisture_g_100g']),
    ash: _d(p['ash_g_100g']),
    calcium: _d(p['calcium_g_100g']),
    phosphorus: _d(p['phosphorus_g_100g']),
    kcalPerKg: _d(p['kcal_per_kg']),
    kcalPerCup: _d(p['kcal_per_cup']),
    gramsPerCup: _d(p['grams_per_cup']),
    kcalPerUnit: _d(p['kcal_per_unit']),
    kcalUnit: p['kcal_unit'] as String?,
    kcalPerTreat: _d(p['kcal_per_treat']),
    pricePerKg: _d(p['price_per_kg_cad_min']),
    markets: _list(p['markets']),
    ingredients: _list(p['ingredients']),
    extras: [
      if (p['probiotics'] == true) 'probiotics',
      if (p['glucosamine_chondroitin'] == true) 'glucosamine',
      if (p['collagen_added'] == true) 'collagen',
      if (p['omega3_source'] != null) 'omega3',
    ],
    photo: p['image_type'] == 'packshot' ? p['image_url'] as String? : null,
    buyUrl: p['buy_url'] as String?,
    buyRetailer: p['buy_retailer'] as String?,
    sourceUrl: p['source_url'] as String?,
    credit: p['attribution'] as String?,
    isTreat: treat,
    treatBands: ((p['treat_feeding_bands'] as List?) ?? const [])
        .map((b) => TreatBand(weightKgMin: _d(b['weight_kg_min']), weightKgMax: _d(b['weight_kg_max']), maxTreatsPerDay: _d(b['max_treats_per_day'])))
        .toList(),
  );
}

FeedingBand feedingBandFromRow(Map<String, dynamic> g) => FeedingBand(
      weightLabel: g['weight_label'] as String?,
      weightKgMin: _d(g['weight_kg_min']),
      weightKgMax: _d(g['weight_kg_max']),
      amountMin: _d(g['amount_min']),
      amountMax: _d(g['amount_max']),
      unit: g['unit'] as String?,
      gramsPerDayMin: _d(g['grams_per_day_min']),
      gramsPerDayMax: _d(g['grams_per_day_max']),
    );

Supplement supplementFromRow(Map<String, dynamic> p) => Supplement(
      id: '${p['id']}'.replaceAll('-', '_'),
      brand: '${p['brand'] ?? ''}',
      name: '${p['name'] ?? ''}',
      species: '${p['species'] ?? ''}',
      speciesAll: (p['species_all'] as List?)?.map((e) => '$e').toList(),
      speciesUnknown: ((p['qa_flags'] as List?) ?? const []).contains('species_unknown'),
      type: p['supplement_type'] as String?,
      servingSize: p['serving_size'] as String?,
      dosingText: p['dosing_text'] as String?,
      dosingBands: ((p['dosing_bands'] as List?) ?? const []).map((b) => DoseBand(weightKgMin: _d(b['weight_kg_min']), weightKgMax: _d(b['weight_kg_max']), amount: _d(b['amount']), unit: b['unit'] as String?, raw: b['raw'] as String?)).toList(),
      claim: p['label_claim_text'] as String?,
      vetOnly: p['vet_only'] == true,
      photo: p['image_url'] as String?,
      buyUrl: (p['buy_url_us'] ?? p['buy_url']) as String?,
      credit: p['attribution'] as String?,
    );
