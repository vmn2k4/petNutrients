import '../entities/diet_item.dart';
import '../entities/food.dart';
import '../entities/ingredient.dart';
import '../entities/pet.dart';
import '../reference/reference_data.dart';

/// Contracts the data layer implements. The domain and the UI depend on these, never on Supabase.

class AppUser {
  const AppUser({required this.id, required this.email});
  final String id;
  final String? email;
}

abstract class AuthRepository {
  AppUser? get currentUser;
  Stream<AppUser?> get changes;

  /// Opens the Google sign-in flow; the session arrives through [changes].
  Future<void> signInWithGoogle();

  /// Email and password sign-in for an account that already exists. The app never creates accounts with a password.
  Future<void> signInWithPassword(String email, String password);
  /// Sets or changes the password of the signed-in account, so Google accounts can also sign in with email and password.
  Future<void> setPassword(String password);
  Future<void> signOut();
  Future<void> deleteMyAccount();
}

abstract class PetRepository {
  /// Every pet of the signed-in owner with weigh-ins, goal history and diet.
  Future<List<Pet>> loadPets();
  Future<Pet> createPet(Pet draft);
  Future<void> updateProfile(Pet pet);
  Future<void> removePet(String petId);
  Future<void> addWeighIn(String petId, WeighIn weighIn);
  Future<void> addSkip(String petId, List<String> skips);
  Future<void> saveGoal(String petId, Goal? goal);
  Future<void> archiveGoal(String petId, GoalRecord record);
  Future<void> insertDietItems(String petId, List<DietItem> items);
  Future<void> endDietItems(List<String> ids, String date);
  Future<void> reviveDietItems(List<String> ids);
  Future<void> deleteDietItems(List<String> ids);
  Future<void> setDietItemKcal(String id, {double? kcalPerKg, double? kcalPerUnit});
}

abstract class FoodRepository {
  Future<List<Food>> foods();
  Future<List<Food>> treats();
  Future<List<Supplement>> supplements();
}

/// Settings that belong to the owner rather than a pet.
abstract class SettingsRepository {
  String get region; // 'US', 'CA' or 'all'
  bool get hasRegion;
  Future<void> setRegion(String region);
  Future<void> setEmailReminders(bool on);
  bool get emailReminders;
  String get weightUnit; // 'kg' or 'lb'
  Future<void> setWeightUnit(String unit);
  String? get activePetId;
  Future<void> setActivePetId(String? id);
  bool dietSkipped(String petId);
  Future<void> setDietSkipped(String petId, bool skipped);

  /// The owner has read that results are estimates, not veterinary advice (asked once, on this device).
  bool get acknowledged;
  Future<void> setAcknowledged();
}

abstract class ReferenceRepository {
  Future<ReferenceData> reference();
  Future<List<Ingredient>> ingredients();
}
