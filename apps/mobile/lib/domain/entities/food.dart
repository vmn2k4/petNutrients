/// A row of a maker's feeding table (a weight band).
class FeedingBand {
  const FeedingBand({this.weightLabel, this.weightKgMin, this.weightKgMax, this.amountMin, this.amountMax, this.unit, this.gramsPerDayMin, this.gramsPerDayMax});
  final String? weightLabel;
  final double? weightKgMin;
  final double? weightKgMax;
  final double? amountMin;
  final double? amountMax;
  final String? unit;
  final double? gramsPerDayMin;
  final double? gramsPerDayMax;
}

/// A label limit for a treat by pet weight.
class TreatBand {
  const TreatBand({this.weightKgMin, this.weightKgMax, this.maxTreatsPerDay});
  final double? weightKgMin;
  final double? weightKgMax;
  final double? maxTreatsPerDay;
}

/// A dosing row of a supplement label.
class DoseBand {
  const DoseBand({this.weightKgMin, this.weightKgMax, this.amount, this.unit, this.raw});
  final double? weightKgMin;
  final double? weightKgMax;
  final double? amount;
  final String? unit;
  final String? raw;
}

/// A supplement from the catalogue. Shown, never judged, and not counted in calories.
class Supplement {
  const Supplement({required this.id, required this.brand, required this.name, required this.species, this.speciesAll, this.speciesUnknown = false, this.type, this.servingSize, this.dosingText, this.dosingBands = const [], this.claim, this.vetOnly = false, this.photo, this.buyUrl, this.credit});
  final String id;
  final String brand;
  final String name;
  final String species;
  final List<String>? speciesAll;
  final bool speciesUnknown;
  final String? type;
  final String? servingSize;
  final String? dosingText;
  final List<DoseBand> dosingBands;
  final String? claim;
  final bool vetOnly;
  final String? photo;
  final String? buyUrl;
  final String? credit;
  String get label => '$brand $name';
}

/// A food, treat or supplement from the catalogue. Nutrient numbers are the label's guaranteed analysis, as fed (percent).
class Food {
  const Food({
    required this.id,
    required this.brand,
    required this.name,
    required this.species,
    this.format = 'other',
    this.lifeStage = 'unknown',
    this.protein,
    this.fat,
    this.fibre,
    this.moisture,
    this.ash,
    this.calcium,
    this.phosphorus,
    this.kcalPerKg,
    this.kcalPerCup,
    this.gramsPerCup,
    this.kcalPerUnit,
    this.kcalUnit,
    this.kcalPerTreat,
    this.pricePerKg,
    this.markets = const [],
    this.ingredients = const [],
    this.extras = const [],
    this.photo,
    this.buyUrl,
    this.buyRetailer,
    this.sourceUrl,
    this.credit,
    this.guide = const [],
    this.treatBands = const [],
    this.isTreat = false,
    this.isSupplement = false,
    this.rating = 0,
    this.reviews = 0,
  });

  final String id;
  final String brand;
  final String name;
  final String species;
  final String format;
  final String lifeStage;
  final double? protein;
  final double? fat;
  final double? fibre;
  final double? moisture;
  final double? ash;
  final double? calcium;
  final double? phosphorus;
  final double? kcalPerKg;
  final double? kcalPerCup;
  final double? gramsPerCup;
  final double? kcalPerUnit;
  final String? kcalUnit;
  final double? kcalPerTreat;
  final double? pricePerKg;
  final List<String> markets;
  final List<String> ingredients;
  final List<String> extras;
  final String? photo;
  final String? buyUrl;
  final String? buyRetailer;
  final String? sourceUrl;
  final String? credit;
  final List<FeedingBand> guide;
  final List<TreatBand> treatBands;
  final bool isTreat;
  final bool isSupplement;
  final double rating;
  final int reviews;

  String get label => '$brand $name';
}
