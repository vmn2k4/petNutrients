class Breed {
  const Breed({required this.name, required this.size, required this.min, required this.max});
  final String name;
  final String size;
  final double min;
  final double max;
}

/// Lists the interface needs (the breed picker). Growth curves and nutrient tables are not here: they stay on the server.
class ReferenceData {
  const ReferenceData({required this.breeds});
  final List<Breed> breeds;

  factory ReferenceData.fromJson(Map<String, dynamic> j) => ReferenceData(
        breeds: (j['dogBreeds'] as List).map((e) => Breed(name: e['name'] as String, size: e['size'] as String, min: (e['min'] as num).toDouble(), max: (e['max'] as num).toDouble())).toList(),
      );
}

/// Adult size groups offered when the breed is unknown (labels only; the calculations use the group id).
const sizeCategories = [
  ('I', 'Toy (under 6.5 kg)'),
  ('II', 'Small (6.5 to 9 kg)'),
  ('III', 'Small-medium (9 to 15 kg)'),
  ('IV', 'Medium (15 to 30 kg)'),
  ('V', 'Large (30 to 40 kg)'),
  ('VI', 'Giant (over 40 kg)'),
];

/// Allergens offered in pickers. The server matches them against ingredient lists (with synonyms).
const allergens = ['chicken', 'beef', 'lamb', 'fish', 'egg', 'dairy', 'wheat', 'corn', 'soy', 'pea'];
