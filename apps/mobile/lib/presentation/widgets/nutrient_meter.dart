import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';

String _g(double v) => v >= 10 ? v.round().toString() : v.toStringAsFixed(1);

/// One nutrient as grams: a bar showing the amount against the minimum and maximum (the shaded band). State is also written, never colour alone.
class NutrientMeter extends StatelessWidget {
  const NutrientMeter({super.key, required this.label, required this.value, this.min, this.max, required this.state});
  final String label;
  final double? value;
  final double? min;
  final double? max;
  final String state; // good, bad, unknown

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final col = state == 'good' ? c.good : state == 'bad' ? c.bad : c.fgMuted;
    final v = value;
    final top = [(max ?? (min == null ? (v ?? 1) * 1.5 : min! * 2)) * 1.3, (v ?? 0) * 1.1, 0.1].reduce((a, b) => a > b ? a : b);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.s3),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(label, style: context.text.titleSmall)),
          Text(v == null ? 'not reported' : '${_g(v)} g${state == 'bad' ? ' · outside the target' : ''}', style: context.text.bodySmall!.copyWith(color: col, fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 4),
        LayoutBuilder(builder: (context, box) {
          final w = box.maxWidth;
          double x(double g) => (g / top).clamp(0.0, 1.0) * w;
          return SizedBox(
            height: 14,
            child: Stack(children: [
              Positioned.fill(child: Container(decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(7)))),
              if (min != null || max != null) Positioned(left: x(min ?? 0), width: x(max ?? top) - x(min ?? 0), top: 0, bottom: 0, child: Container(decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(7)))),
              if (v != null) Positioned(left: (x(v) - 5).clamp(0.0, w - 10), top: 0, child: Container(width: 10, height: 14, decoration: BoxDecoration(color: col, borderRadius: BorderRadius.circular(5)))),
            ]),
          );
        }),
        if (min != null || max != null) Text(min != null && max != null ? 'Target ${_g(min!)} to ${_g(max!)} g' : min != null ? 'Target at least ${_g(min!)} g' : 'Target at most ${_g(max!)} g', style: context.text.bodySmall),
      ]),
    );
  }
}
