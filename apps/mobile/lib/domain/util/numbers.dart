import 'dart:math' as math;

const double lbPerKg = 2.20462;
double kgToLb(double kg) => kg * lbPerKg;
double lbToKg(double lb) => lb / lbPerKg;

/// Rounds half away from zero at `d` decimals, as JavaScript's Math.round(n * 10^d) / 10^d does for positive numbers.
double roundTo(double n, [int d = 1]) {
  final f = math.pow(10, d).toDouble();
  return (n * f + 0.5).floorToDouble() / f;
}

double clampD(double v, double lo, double hi) => v < lo ? lo : (v > hi ? hi : v);
