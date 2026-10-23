import 'dart:convert';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../domain/calc/calc_repository.dart';

/// Runs calculations on the `calc` Supabase Edge Function (see supabase/functions/calc).
class SupabaseCalcRepository implements CalcRepository {
  SupabaseCalcRepository(this._c, {this.urlOverride = '', this.key = ''});
  final sb.SupabaseClient _c;
  final String urlOverride;
  final String key;

  @override
  Future<List<Object?>> batch(List<CalcCall> calls) async {
    if (calls.isEmpty) return const [];
    final body = {
      'calls': [for (var i = 0; i < calls.length; i++) {'id': i, 'fn': calls[i].fn, 'args': calls[i].args}],
    };
    try {
      final Object? data = urlOverride.isEmpty ? (await _c.functions.invoke('calc', body: body)).data : await _post(body);
      final list = ((data as Map)['results'] as List).cast<Map>();
      final out = List<Object?>.filled(calls.length, null);
      for (final r in list) {
        if (r['error'] != null) throw CalcException('${r['error']}');
        out[(r['id'] as num).toInt()] = r['result'];
      }
      return out;
    } on sb.FunctionException catch (e) {
      throw CalcException('${e.details ?? e.reasonPhrase}');
    }
  }

  Future<Object?> _post(Map<String, Object?> body) async {
    final c = HttpClient();
    try {
      final req = await c.postUrl(Uri.parse(urlOverride));
      req.headers.set('content-type', 'application/json');
      req.headers.set('apikey', key);
      req.headers.set('authorization', 'Bearer $key');
      req.write(jsonEncode(body));
      final res = await req.close();
      return jsonDecode(await res.transform(utf8.decoder).join());
    } finally {
      c.close();
    }
  }
}
