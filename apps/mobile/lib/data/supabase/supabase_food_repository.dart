import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../domain/domain.dart';
import 'mappers.dart';

/// The food catalogue (`catalog` schema), read with the public key. Open Pet Food Facts rows live in a separate schema and are not read here.
class SupabaseFoodRepository implements FoodRepository {
  SupabaseFoodRepository(this._c);
  final sb.SupabaseClient _c;

  static const _cols = 'id,brand,name,species,format,form_detail,life_stage,kcal_per_kg,kcal_per_cup,kcal_per_unit,kcal_unit,grams_per_cup,protein_g_100g,fat_g_100g,fibre_g_100g,moisture_g_100g,ash_g_100g,calcium_g_100g,phosphorus_g_100g,ingredients,probiotics,glucosamine_chondroitin,collagen_added,omega3_source,markets,price_per_kg_cad_min,buy_url,buy_retailer,image_url,image_type,source_url,attribution';

  /// PostgREST returns at most 1,000 rows a request, so a table is read a page at a time.
  Future<List<Map<String, dynamic>>> _pages(sb.PostgrestTransformBuilder<List<Map<String, dynamic>>> Function() build) async {
    final out = <Map<String, dynamic>>[];
    for (var from = 0;; from += 1000) {
      final rows = await build().range(from, from + 999);
      out.addAll(rows);
      if (rows.length < 1000) return out;
    }
  }

  List<Food>? _foods;

  @override
  Future<List<Food>> foods() async {
    if (_foods != null) return _foods!;
    final rows = await _pages(() => _c
        .schema('catalog')
        .from('products')
        .select(_cols)
        .eq('product_type', 'food')
        .eq('retired', false)
        .eq('prescription', false)
        .not('protein_g_100g', 'is', null)
        .not('fat_g_100g', 'is', null)
        .neq('ingredients', '{}')
        .order('name')
        .order('id'));
    final guides = await _pages(() => _c.schema('catalog').from('feeding_guides').select('product_id,weight_label,weight_kg_min,weight_kg_max,amount_min,amount_max,unit,grams_per_day_min,grams_per_day_max').order('product_id').order('weight_kg_max')).catchError((_) => <Map<String, dynamic>>[]);
    final byId = <String, List<FeedingBand>>{};
    for (final g in guides) {
      byId.putIfAbsent('${g['product_id']}'.replaceAll('-', '_'), () => []).add(feedingBandFromRow(g));
    }
    return _foods = rows.map((r) {
      final f = foodFromRow(r);
      final guide = byId[f.id];
      return guide == null ? f : Food(id: f.id, brand: f.brand, name: f.name, species: f.species, format: f.format, lifeStage: f.lifeStage, protein: f.protein, fat: f.fat, fibre: f.fibre, moisture: f.moisture, ash: f.ash, calcium: f.calcium, phosphorus: f.phosphorus, kcalPerKg: f.kcalPerKg, kcalPerCup: f.kcalPerCup, gramsPerCup: f.gramsPerCup, kcalPerUnit: f.kcalPerUnit, kcalUnit: f.kcalUnit, pricePerKg: f.pricePerKg, markets: f.markets, ingredients: f.ingredients, extras: f.extras, photo: f.photo, buyUrl: f.buyUrl, buyRetailer: f.buyRetailer, sourceUrl: f.sourceUrl, credit: f.credit, guide: guide);
    }).toList();
  }

  List<Food>? _treats;

  @override
  Future<List<Food>> treats() async {
    if (_treats != null) return _treats!;
    try {
      final rows = await _pages(() => _c.schema('catalog').from('products').select('$_cols,treat_type,kcal_per_treat,treat_feeding_bands').eq('product_type', 'treat').eq('prescription', false).order('name').order('id'));
      return _treats = rows.map((r) => foodFromRow(r, treat: true)).toList();
    } catch (_) {
      return _treats = const [];
    }
  }

  List<Supplement>? _supplements;

  @override
  Future<List<Supplement>> supplements() async {
    if (_supplements != null) return _supplements!;
    try {
      final rows = await _pages(() => _c.schema('catalog').from('products').select('id,brand,name,species,species_all,supplement_type,serving_size,dosing_text,dosing_bands,label_claim_text,vet_only,qa_flags,image_url,buy_url,buy_url_us,attribution').eq('product_type', 'supplement').order('name').order('id'));
      return _supplements = rows.map(supplementFromRow).toList();
    } catch (_) {
      return _supplements = const [];
    }
  }
}
