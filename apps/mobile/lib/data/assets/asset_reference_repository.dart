import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../../domain/domain.dart';

/// Reference tables bundled with the app (exported from the same sources as the web app by tool/export_reference.mjs).
class AssetReferenceRepository implements ReferenceRepository {
  ReferenceData? _ref;
  List<Ingredient>? _ing;

  @override
  Future<ReferenceData> reference() async => _ref ??= ReferenceData.fromJson(jsonDecode(await rootBundle.loadString('assets/reference/reference.json')) as Map<String, dynamic>);

  @override
  Future<List<Ingredient>> ingredients() async =>
      _ing ??= (jsonDecode(await rootBundle.loadString('assets/reference/ingredients.json')) as List).map((e) => Ingredient.fromJson(e as Map<String, dynamic>)).toList();
}
