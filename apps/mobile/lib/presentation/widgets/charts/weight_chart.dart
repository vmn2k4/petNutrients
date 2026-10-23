import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../../domain/domain.dart';
import 'chart_utils.dart';

class WeightPoint {
  const WeightPoint({required this.on, required this.kg});
  final String on;
  final double kg;
}

/// Weight over time for a fully grown pet: the weigh-ins against the usual adult range and an estimated ideal weight.
class WeightChart extends StatefulWidget {
  const WeightChart({super.key, required this.points, required this.petName, required this.tipFor, this.idealKg, this.range, this.projection, this.target});

  final List<WeightPoint> points;
  final String petName;
  final double? idealKg;
  final ({double min, double max})? range;
  final TrendProjection? projection;
  final ({int t, double kg, String label})? target;
  final List<(String, String)> Function(WeightPoint p) tipFor;

  @override
  State<WeightChart> createState() => _WeightChartState();
}

class _WeightChartState extends State<WeightChart> {
  int? _selected;
  List<Offset> _dots = const [];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return LayoutBuilder(builder: (context, box) {
      final w = box.maxWidth;
      final h = math.min(380.0, math.max(240.0, w * 0.62));
      final painter = _WeightPainter(widget, c, w, h, context.text.bodySmall!);
      _dots = painter.dots();
      return GestureDetector(
        onTapDown: (d) {
          var best = -1;
          var bd = 28.0;
          for (var i = 0; i < _dots.length; i++) {
            final dist = (_dots[i] - d.localPosition).distance;
            if (dist < bd) {
              best = i;
              bd = dist;
            }
          }
          setState(() => _selected = best < 0 ? null : best);
        },
        child: SizedBox(width: w, height: h, child: Stack(children: [
          CustomPaint(size: Size(w, h), painter: painter),
          if (_selected != null && _selected! < _dots.length)
            Positioned(
              left: (_dots[_selected!].dx - 115).clamp(0.0, math.max(0.0, w - 230)).toDouble(),
              top: math.max(0.0, _dots[_selected!].dy - 72),
              child: IgnorePointer(
                child: Container(
                  width: 230,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.s3, vertical: AppSpace.s2),
                  decoration: BoxDecoration(color: c.ink, borderRadius: BorderRadius.circular(AppRadius.md)),
                  child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    for (final (k, v) in widget.tipFor(painter.pts[_selected!]))
                      Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                        Text(k, style: context.text.bodySmall!.copyWith(color: c.onInk.withValues(alpha: 0.7), fontSize: 11)),
                        Text(v, style: context.text.labelMedium!.copyWith(color: c.onInk)),
                      ]),
                  ]),
                ),
              ),
            ),
        ])),
      );
    });
  }
}

class _WeightPainter extends CustomPainter {
  _WeightPainter(this.w, this.c, this.W, this.H, this.small) {
    pts = [...w.points]..sort((a, b) => a.on.compareTo(b.on));
    const day = 86400000;
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final first = parseIso(pts.first.on).millisecondsSinceEpoch;
    x0 = math.min(first, nowMs - 60 * day).toDouble();
    x1 = math.max(math.max(parseIso(pts.last.on).millisecondsSinceEpoch, nowMs), math.max(w.target?.t ?? 0, w.projection?.points.last.t ?? 0)) + 7.0 * day;
    final ys = [...pts.map((p) => p.kg), ...?w.projection?.points.map((p) => p.kg), if (w.target != null) w.target!.kg, if (w.idealKg != null) w.idealKg!, if (w.range != null) ...[w.range!.min, w.range!.max]];
    final lo = ys.reduce(math.min);
    final hi = ys.reduce(math.max);
    final pad = math.max(1.0, (hi - lo) * 0.18);
    bottom = math.max(0.0, lo - pad);
    final nt = niceTicks(hi + pad - bottom, 4);
    top = bottom + nt.top;
    ticks = [for (final t in nt.ticks) bottom + t];
  }

  final WeightChart w;
  final AppPalette c;
  final double W;
  final double H;
  final TextStyle small;
  late final List<WeightPoint> pts;
  late final double x0, x1, top, bottom;
  late final List<double> ticks;
  static const ml = 40.0, mr = 16.0, mt = 22.0, mb = 40.0;

  double x(num t) => ml + ((t - x0) / (x1 - x0)) * (W - ml - mr);
  double y(double kg) => H - mb - ((kg - bottom) / (top - bottom)) * (H - mt - mb);
  double _t(String on) => parseIso(on).millisecondsSinceEpoch.toDouble();

  List<Offset> dots() => [for (final p in pts) Offset(x(_t(p.on)), y(p.kg))];

  @override
  void paint(Canvas canvas, Size size) {
    final tick = small.copyWith(fontSize: 11, color: c.fgMuted);
    final grid = Paint()..color = c.border..strokeWidth = 1;
    for (final t in ticks) {
      canvas.drawLine(Offset(ml, y(t)), Offset(W - mr, y(t)), grid);
      paintText(canvas, t.toStringAsFixed(t == t.roundToDouble() ? 0 : 1), Offset(ml - 6, y(t) - 7), tick, align: TextAlign.right);
    }
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var i = 0; i < 4; i++) {
      final t = x0 + (x1 - x0) * (i / 3);
      final d = DateTime.fromMillisecondsSinceEpoch(t.round(), isUtc: true);
      paintText(canvas, '${months[d.month - 1]} ${d.day}', Offset(x(t), H - mb + 8), tick, align: TextAlign.center);
    }
    final r = w.range;
    if (r != null) {
      canvas.drawRect(Rect.fromLTRB(ml, y(r.max), W - mr, y(r.min)), Paint()..color = c.chartBandOuter);
      paintText(canvas, 'Usual adult range', Offset(ml + 6, y(r.max) + 2), tick);
    }
    if (w.idealKg != null) {
      drawDashed(canvas, Path()..moveTo(ml, y(w.idealKg!))..lineTo(W - mr, y(w.idealKg!)), Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5..color = c.chartMedian, dash: 6, gap: 5);
      paintText(canvas, 'Ideal about ${w.idealKg!.toStringAsFixed(1)} kg', Offset(W - mr - 4, y(w.idealKg!) - 16), tick.copyWith(color: c.chartMedian, fontWeight: FontWeight.w700), align: TextAlign.right);
    }
    final orange = c.chartPoint;
    final dotsAt = dots();
    if (dotsAt.isEmpty) return;
    final nowAt = dotsAt.last;
    final proj = w.projection;
    if (proj != null) {
      drawDashed(canvas, smoothPath([nowAt, for (final p in proj.points.skip(1)) Offset(x(p.t), y(p.kg))]), Paint()..style = PaintingStyle.stroke..strokeWidth = 2.5..strokeCap = StrokeCap.round..color = orange.withValues(alpha: 0.85), dash: 1, gap: 6);
    }
    final tg = w.target;
    if (tg != null) {
      final tAt = Offset(x(tg.t), y(tg.kg));
      drawDashed(canvas, Path()..moveTo(nowAt.dx, nowAt.dy)..lineTo(tAt.dx, tAt.dy), Paint()..style = PaintingStyle.stroke..strokeWidth = 2.5..color = c.primary, dash: 6, gap: 5);
      canvas.drawCircle(tAt, 8, Paint()..color = c.surface);
      canvas.drawCircle(tAt, 8, Paint()..style = PaintingStyle.stroke..strokeWidth = 3.5..color = c.primary);
    }
    if (dotsAt.length > 1) canvas.drawPath(smoothPath(dotsAt), Paint()..style = PaintingStyle.stroke..strokeWidth = 2.5..strokeCap = StrokeCap.round..color = orange);
    for (final d in dotsAt.take(dotsAt.length - 1)) {
      canvas.drawCircle(d, 4.5, Paint()..color = orange);
      canvas.drawCircle(d, 4.5, Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5..color = c.surface);
    }
    canvas.drawCircle(nowAt, 13, Paint()..color = orange.withValues(alpha: 0.2));
    canvas.drawCircle(nowAt, 7, Paint()..color = orange);
    canvas.drawCircle(nowAt, 7, Paint()..style = PaintingStyle.stroke..strokeWidth = 2..color = c.surface);
  }

  @override
  bool shouldRepaint(_WeightPainter old) => true;
}
