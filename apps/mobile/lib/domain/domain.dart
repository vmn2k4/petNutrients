// The domain layer: plain Dart values and contracts. It contains no calculations; those run on the server (`calc` Edge Function).
export 'calc/calc_repository.dart';
export 'calc/changes.dart';
export 'calc/results.dart';
export 'calc/serialize.dart';
export 'entities/diet_item.dart';
export 'entities/food.dart';
export 'entities/ingredient.dart';
export 'entities/pet.dart';
export 'reference/reference_data.dart';
export 'repositories/repositories.dart';
export 'util/dates.dart';
export 'util/numbers.dart';
