import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../domain/domain.dart';
import 'mappers.dart';

/// Pets, weigh-ins, goals and the diet log in Supabase. Row-level security keeps each owner to their own rows.
class SupabasePetRepository implements PetRepository {
  SupabasePetRepository(this._c);
  final sb.SupabaseClient _c;

  @override
  Future<List<Pet>> loadPets() async {
    final rows = await _c.from('pets').select().order('created_at', ascending: true);
    final pets = <Pet>[];
    for (final r in rows) {
      final id = r['id'] as String;
      final logs = await _c.from('weight_logs').select('measured_on,kg,bcs').eq('pet_id', id).order('measured_on');
      final hist = await _c.from('pet_goals').select().eq('pet_id', id).order('ended_on', ascending: false).limit(50).catchError((_) => <Map<String, dynamic>>[]);
      final diet = await _c.from('pet_diet_items').select().eq('pet_id', id).order('started_on', ascending: false).catchError((_) => <Map<String, dynamic>>[]);
      pets.add(petFromRow(r, logs: logs.map(weighInFromRow).toList(), history: hist.map(goalRecordFromRow).toList(), diet: diet.map(dietFromRow).toList()));
    }
    return pets;
  }

  @override
  Future<Pet> createPet(Pet draft) async {
    final row = await _c.from('pets').insert(petToRow(draft)).select().single();
    final id = row['id'] as String;
    final logs = draft.logs.isNotEmpty ? draft.logs : [WeighIn(on: todayStr(), kg: draft.weightKg, bcs: draft.bcs)];
    await _c.from('weight_logs').insert(logs.map((l) => {'pet_id': id, 'measured_on': l.on, 'kg': l.kg, 'bcs': l.bcs}).toList());
    return petFromRow(row, logs: logs);
  }

  @override
  Future<void> updateProfile(Pet pet) => _c.from('pets').update(petToRow(pet)).eq('id', pet.id);

  @override
  Future<void> removePet(String petId) => _c.from('pets').delete().eq('id', petId);

  @override
  Future<void> addWeighIn(String petId, WeighIn w) async {
    await _c.from('weight_logs').insert({'pet_id': petId, 'measured_on': w.on, 'kg': w.kg, 'bcs': w.bcs});
    await _c.from('pets').update({'weight_kg': w.kg, 'bcs': w.bcs}).eq('id', petId);
  }

  @override
  Future<void> addSkip(String petId, List<String> skips) => _c.from('pets').update({'skips': skips}).eq('id', petId);

  @override
  Future<void> saveGoal(String petId, Goal? goal) => _c.from('pets').update({
        'goal': goal == null ? null : goalToJson(goal),
        'target': (goal == null || goal.targetDate == null) ? null : {'kg': goal.targetKg, 'days': goal.days, 'date': goal.targetDate, 'setOn': goal.startOn},
      }).eq('id', petId);

  @override
  Future<void> archiveGoal(String petId, GoalRecord record) => _c.from('pet_goals').insert(goalRecordToRow(record, petId));

  @override
  Future<void> insertDietItems(String petId, List<DietItem> items) async {
    if (items.isEmpty) return;
    await _c.from('pet_diet_items').insert(items.map((i) => dietToRow(i, petId)).toList());
  }

  @override
  Future<void> endDietItems(List<String> ids, String date) async {
    for (final id in ids) {
      await _c.from('pet_diet_items').update({'ended_on': date}).eq('id', id);
    }
  }

  @override
  Future<void> reviveDietItems(List<String> ids) async {
    for (final id in ids) {
      await _c.from('pet_diet_items').update({'ended_on': null}).eq('id', id);
    }
  }

  @override
  Future<void> deleteDietItems(List<String> ids) async {
    for (final id in ids) {
      await _c.from('pet_diet_items').delete().eq('id', id);
    }
  }

  @override
  Future<void> setDietItemKcal(String id, {double? kcalPerKg, double? kcalPerUnit}) => _c.from('pet_diet_items').update({'kcal_per_kg': kcalPerKg, 'kcal_per_unit': kcalPerUnit}).eq('id', id);
}
