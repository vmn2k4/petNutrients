import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/calc/calc_repository.dart';

/// Wired to the Supabase function in main().
final calcRepoProvider = Provider<CalcRepository>((ref) => throw UnimplementedError('calcRepoProvider is overridden in main()'));

String _key(String fn, List<Object?> args) => jsonEncode([fn, args]);

/// Results already fetched, by request. Widgets that read a result rebuild when it arrives.
class CalcCache extends Notifier<Map<String, Object?>> {
  @override
  Map<String, Object?> build() => const {};
  void put(Map<String, Object?> more) => state = {...state, ...more};
}

final calcCacheProvider = NotifierProvider<CalcCache, Map<String, Object?>>(CalcCache.new);

/// Sends calculations to the server, batching everything asked for in the same moment into one request.
class CalcClient {
  CalcClient(this._ref);
  final Ref _ref;
  final _queue = <String, CalcCall>{};
  final _inflight = <String>{};
  final _waiting = <String, List<Completer<Object?>>>{};
  final _last = <String, Object?>{}; // newest result per slot, shown while the next one loads
  bool _scheduled = false;

  Object? peek(String fn, List<Object?> args, {String? slot}) {
    final cache = _ref.read(calcCacheProvider);
    final k = _key(fn, args);
    if (cache.containsKey(k)) return cache[k];
    return slot == null ? null : _last[slot];
  }

  /// Fetches (once) and caches. Use for reads that screens show.
  void request(String fn, List<Object?> args, {String? slot}) {
    final k = _key(fn, args);
    if (_ref.read(calcCacheProvider).containsKey(k) || _inflight.contains(k)) return;
    _queue[k] = CalcCall(fn, args);
    _schedule();
  }

  /// Awaits a result (for actions like saving a weight). Not shown from the cache twice.
  Future<Object?> run(String fn, List<Object?> args) {
    final k = _key(fn, args);
    final cache = _ref.read(calcCacheProvider);
    if (cache.containsKey(k)) return Future.value(cache[k]);
    final c = Completer<Object?>();
    (_waiting[k] ??= []).add(c);
    _queue[k] = CalcCall(fn, args);
    _schedule();
    return c.future;
  }

  void remember(String slot, Object? value) {
    if (value != null) _last[slot] = value;
  }

  void _schedule() {
    if (_scheduled) return;
    _scheduled = true;
    scheduleMicrotask(_flush);
  }

  Future<void> _flush() async {
    _scheduled = false;
    final batch = Map<String, CalcCall>.of(_queue);
    _queue.clear();
    if (batch.isEmpty) return;
    _inflight.addAll(batch.keys);
    final keys = batch.keys.toList();
    try {
      final out = await _ref.read(calcRepoProvider).batch([for (final k in keys) batch[k]!]);
      final got = {for (var i = 0; i < keys.length; i++) keys[i]: out[i]};
      _inflight.removeAll(keys);
      _ref.read(calcCacheProvider.notifier).put(got);
      for (final k in keys) {
        for (final c in _waiting.remove(k) ?? const <Completer<Object?>>[]) {
          c.complete(got[k]);
        }
      }
    } catch (e) {
      _inflight.removeAll(keys);
      for (final k in keys) {
        for (final c in _waiting.remove(k) ?? const <Completer<Object?>>[]) {
          c.completeError(e);
        }
      }
    }
  }
}

final calcClientProvider = Provider<CalcClient>((ref) => CalcClient(ref));

/// Reads a result for a widget or provider: the cached one (or the last one for the same slot while a new one loads), else null
/// and a fetch is started. The caller rebuilds when it arrives.
Object? calcGet(Ref ref, String fn, List<Object?> args, String? slot) {
  ref.watch(calcCacheProvider);
  return _get(ref.read(calcClientProvider), fn, args, slot);
}

Object? calcGetW(WidgetRef ref, String fn, List<Object?> args, String? slot) {
  ref.watch(calcCacheProvider);
  return _get(ref.read(calcClientProvider), fn, args, slot);
}

Object? _get(CalcClient c, String fn, List<Object?> args, String? slot) {
  final v = c.peek(fn, args, slot: slot);
  c.request(fn, args);
  if (slot != null && v != null) c.remember(slot, v);
  return v;
}
