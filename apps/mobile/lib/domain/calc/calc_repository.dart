/// One calculation to run on the server: a function exported by the shared `domain.js` and its JSON arguments.
class CalcCall {
  const CalcCall(this.fn, [this.args = const []]);
  final String fn;
  final List<Object?> args;
}

/// The only way the app calculates anything. Growth, calories, goals, food fit and diet rules all live in one place, the
/// `calc` Supabase Edge Function, so the web app and this app always get identical results.
abstract class CalcRepository {
  /// Runs the calls in one request. Results come back in the same order; a failed call throws [CalcException].
  Future<List<Object?>> batch(List<CalcCall> calls);
}

class CalcException implements Exception {
  const CalcException(this.message);
  final String message;
  @override
  String toString() => message;
}
