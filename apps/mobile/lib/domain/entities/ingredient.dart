/// A USDA FoodData Central ingredient, values per 100 g (public domain). Used by the homemade mix builder.
class Ingredient {
  const Ingredient({required this.id, required this.group, required this.state, required this.name, required this.kcal, required this.proteinG, required this.fatG, this.calciumMg, this.phosphorusMg, this.waterG});
  final String id;
  final String group;
  final String state; // raw, cooked, canned, ...
  final String name;
  final double kcal;
  final double proteinG;
  final double fatG;
  final double? calciumMg;
  final double? phosphorusMg;
  final double? waterG;

  factory Ingredient.fromJson(Map<String, dynamic> j) => Ingredient(
        id: j['id'] as String,
        group: j['group'] as String? ?? '',
        state: j['state'] as String? ?? '',
        name: j['name'] as String,
        kcal: (j['kcal'] as num).toDouble(),
        proteinG: (j['protein_g'] as num).toDouble(),
        fatG: (j['fat_g'] as num).toDouble(),
        calciumMg: (j['calcium_mg'] as num?)?.toDouble(),
        phosphorusMg: (j['phosphorus_mg'] as num?)?.toDouble(),
        waterG: (j['water_g'] as num?)?.toDouble(),
      );

  String get label => '$name${state == 'raw' ? ' (raw)' : state == 'cooked' ? ' (cooked)' : state == 'canned' ? ' (canned)' : ''}';
}
