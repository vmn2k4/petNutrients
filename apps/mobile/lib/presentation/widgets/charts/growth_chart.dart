import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../../domain/domain.dart';
import 'chart_utils.dart';

/// A weigh-in on the growth chart.
class ChartPoint {
  const ChartPoint({required this.m, required this.kg, required this.on});
  final double m;
  final double kg;
  final String on;
}

class TargetMarker {
  const TargetMarker({required this.m, required this.kg, required this.label});
  final double m;
  final double kg;
  final String label;
}

/// The growth chart: percentile bands, the pet's weigh-ins, where it is heading, and the target. Read-only: tap a dot for its details.
class GrowthChart extends StatefulWidget {
  const GrowthChart({super.key, required this.bands, required this.points, required this.maxMonth, required this.petName, required this.tipFor, this.projection, this.target, this.dietMarks = const []});

  final List<GrowthRow> bands;
  final List<ChartPoint> points;
  final double maxMonth;
  final String petName;
  final GrowthProjection? projection;
  final TargetMarker? target;
  final List<({double m, int n, String date, List<String> lines})> dietMarks;

  /// The text for a tapped dot: date, age, weight, percentile.
  final List<(String, String)> Function(ChartPoint p) tipFor;

  @override
  State<GrowthChart> createState() => _GrowthChartState();
}

class _GrowthChartState extends State<GrowthChart> {
  int? _selected;
  int? _selectedMark;
  List<Offset> _dotPositions = const [];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return LayoutBuilder(builder: (context, box) {
      final w = box.maxWidth;
      final h = math.min(420.0, math.max(250.0, w * 0.68));
      final painter = _GrowthPainter(widget, c, w, h, context.text.bodySmall!);
      _dotPositions = painter.dotPositions();
      final sel = _selected;
      return GestureDetector(
        onTapDown: (d) {
          final marks = painter.markPositions();
          for (var i = 0; i < marks.length; i++) {
            if ((marks[i] - d.localPosition).distance < 24) {
              setState(() {
                _selectedMark = i;
                _selected = null;
              });
              return;
            }
          }
          var best = -1;
          var bestDist = 28.0;
          for (var i = 0; i < _dotPositions.length; i++) {
            final dist = (_dotPositions[i] - d.localPosition).distance;
            if (dist < bestDist) {
              best = i;
              bestDist = dist;
            }
          }
          setState(() {
            _selected = best < 0 ? null : best;
            _selectedMark = null;
          });
        },
        child: SizedBox(
          width: w,
          height: h,
          child: Stack(children: [
            CustomPaint(size: Size(w, h), painter: painter),
            if (sel != null && sel < _dotPositions.length) _Tip(at: _dotPositions[sel], width: w, rows: widget.tipFor(painter.sorted[sel])),
            if (_selectedMark != null && _selectedMark! < widget.dietMarks.length) _MarkTip(at: painter.markPositions()[_selectedMark!], width: w, mark: widget.dietMarks[_selectedMark!]),
          ]),
        ),
      );
    });
  }
}

class _MarkTip extends StatelessWidget {
  const _MarkTip({required this.at, required this.width, required this.mark});
  final Offset at;
  final double width;
  final ({double m, int n, String date, List<String> lines}) mark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tipW = math.min(290.0, width - 8);
    final left = (at.dx - tipW / 2).clamp(0.0, math.max(0.0, width - tipW)).toDouble();
    return Positioned(
      left: left,
      top: at.dy + 14,
      child: IgnorePointer(
        child: Container(
          width: tipW,
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.s3, vertical: AppSpace.s2),
          decoration: BoxDecoration(color: c.ink, borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text('Diet change · ${mark.date}', style: context.text.bodySmall!.copyWith(color: c.onInk.withValues(alpha: 0.7), fontSize: 11)),
            for (final l in mark.lines) Text(l, style: context.text.labelMedium!.copyWith(color: c.onInk)),
          ]),
        ),
      ),
    );
  }
}

class _Tip extends StatelessWidget {
  const _Tip({required this.at, required this.width, required this.rows});
  final Offset at;
  final double width;
  final List<(String, String)> rows;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tipW = math.min(290.0, width - 8);
    final left = (at.dx - tipW / 2).clamp(0.0, math.max(0.0, width - tipW)).toDouble();
    return Positioned(
      left: left,
      top: math.max(0.0, at.dy - 72),
      child: IgnorePointer(
        child: Container(
          width: tipW,
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.s3, vertical: AppSpace.s2),
          decoration: BoxDecoration(color: c.ink, borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            for (final (k, v) in rows)
              Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(k, style: context.text.bodySmall!.copyWith(color: c.onInk.withValues(alpha: 0.7), fontSize: 11)),
                Text(v, style: context.text.labelMedium!.copyWith(color: c.onInk)),
              ]),
          ]),
        ),
      ),
    );
  }
}

class _GrowthPainter extends CustomPainter {
  _GrowthPainter(this.w, this.c, this.W, this.H, this.small) {
    sorted = [...w.points]..sort((a, b) => a.m.compareTo(b.m));
    rows = w.bands.where((r) => r.m >= 1 && r.m <= w.maxMonth).toList();
    final maxData = [
      ...rows.map((r) => r.p98),
      ...w.points.map((p) => p.kg),
      if (w.projection != null) ...w.projection!.points.where((p) => p.m <= w.maxMonth).map((p) => p.kg),
    ].reduce(math.max);
    final nt = niceTicks(maxData * 1.04, 6);
    ticks = nt.ticks;
    top = nt.top;
  }

  final GrowthChart w;
  final AppPalette c;
  final double W;
  final double H;
  final TextStyle small;
  late final List<ChartPoint> sorted;
  late final List<GrowthRow> rows;
  late final List<double> ticks;
  late final double top;

  static const ml = 30.0, mr = 38.0, mt = 30.0, mb = 44.0;

  double x(double mo) => ml + ((mo - 1) / (w.maxMonth - 1)) * (W - ml - mr);
  double y(double kg) => H - mb - (kg / top) * (H - mt - mb);

  List<Offset> markPositions() => [for (final m in w.dietMarks) Offset(x(math.max(1, m.m)), mt - 6)];

  List<Offset> dotPositions() => [for (final p in sorted) Offset(x(math.max(1, p.m)), y(p.kg))];

  /// The area between two percentile lines.
  Path _band(String lo, String hi) {
    final upper = [for (final r in rows) Offset(x(r.m), y(r[hi]))];
    final lower = [for (final r in rows.reversed) Offset(x(r.m), y(r[lo]))];
    final path = Path()..moveTo(upper.first.dx, upper.first.dy);
    smoothTo(path, upper);
    path.lineTo(lower.first.dx, lower.first.dy);
    smoothTo(path, lower);
    return path..close();
  }

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()..color = c.border..strokeWidth = 1;
    final tick = small.copyWith(fontSize: 11, color: c.fgMuted);
    for (final t in ticks) {
      for (var xx = ml; xx < W - mr; xx += 8) {
        canvas.drawLine(Offset(xx, y(t)), Offset(math.min(xx + 3, W - mr), y(t)), grid);
      }
      paintText(canvas, t == t.roundToDouble() ? '${t.round()}' : '$t', Offset(ml - 6, y(t) - 7), tick, align: TextAlign.right);
    }
    final xStep = w.maxMonth > 24 ? 6 : 3;
    for (var t = xStep; t <= w.maxMonth; t += xStep) {
      paintText(canvas, '$t', Offset(x(t.toDouble()), H - mb + 8), tick, align: TextAlign.center);
    }
    paintText(canvas, 'Age in months', Offset((ml + W - mr) / 2, H - 16), tick, align: TextAlign.center);
    paintText(canvas, 'kg', Offset(ml - 6, mt - 22), tick, align: TextAlign.right);

    if (rows.length >= 2) {
      canvas.drawPath(_band('p02', 'p98'), Paint()..color = c.chartBandOuter);
      canvas.drawPath(_band('p25', 'p75'), Paint()..color = c.chartBandInner);
      for (final k in ['p02', 'p98']) {
        canvas.drawPath(smoothPath([for (final r in rows) Offset(x(r.m), y(r[k]))]), Paint()..style = PaintingStyle.stroke..strokeWidth = 1..color = c.chartMedian.withValues(alpha: 0.35));
      }
      canvas.drawPath(smoothPath([for (final r in rows) Offset(x(r.m), y(r.p50))]), Paint()..style = PaintingStyle.stroke..strokeWidth = 2.5..color = c.chartMedian);
      var prev = -99.0;
      for (final (k, label) in [('p98', '98th'), ('p75', '75th'), ('p50', '50th'), ('p25', '25th'), ('p02', '2nd')]) {
        var yy = y(rows.last[k]);
        if (yy - prev < 13) yy = prev + 13;
        prev = yy;
        paintText(canvas, label, Offset(W - mr + 6, yy - 7), tick.copyWith(color: k == 'p50' ? c.chartMedian : c.fgMuted, fontWeight: k == 'p50' ? FontWeight.w700 : FontWeight.w400));
      }
    }

    for (final m in w.dietMarks) {
      if (m.m > w.maxMonth) continue;
      final xx = x(math.max(1, m.m));
      drawDashed(canvas, Path()..moveTo(xx, mt)..lineTo(xx, H - mb), Paint()..style = PaintingStyle.stroke..strokeWidth = 1.2..color = c.fgMuted, dash: 2, gap: 4);
      canvas.drawCircle(Offset(xx, mt - 6), 8, Paint()..color = c.ink);
      paintText(canvas, 'D', Offset(xx, mt - 13), small.copyWith(fontSize: 11, color: c.onInk, fontWeight: FontWeight.w700), align: TextAlign.center);
    }

    if (sorted.isEmpty) return;
    final now = sorted.last;
    final nowAt = Offset(x(math.max(1, now.m)), y(now.kg));
    final orange = c.chartPoint;

    final proj = w.projection;
    if (proj != null) {
      final vis = proj.points.where((p) => p.m <= w.maxMonth).toList();
      if (vis.length >= 2) {
        final p0 = proj.points.first;
        final adj = [for (final p in vis) Offset(x(math.max(1, p.m)), y(p.kg + (now.kg - p0.kg) * math.exp(-(p.m - p0.m) / 2.5)))];
        drawDashed(canvas, smoothPath(adj), Paint()..style = PaintingStyle.stroke..strokeWidth = 2.5..strokeCap = StrokeCap.round..color = orange.withValues(alpha: 0.85), dash: 1, gap: 6);
        final end = adj.last;
        canvas.drawCircle(end, 4, Paint()..color = c.surface);
        canvas.drawCircle(end, 4, Paint()..style = PaintingStyle.stroke..strokeWidth = 2..color = orange);
      }
    }

    final tg = w.target;
    if (tg != null) {
      final tAt = Offset(x(math.min(w.maxMonth, math.max(1, tg.m))), y(tg.kg));
      final path = Path()..moveTo(nowAt.dx, nowAt.dy)..quadraticBezierTo((nowAt.dx + tAt.dx) / 2, math.min(nowAt.dy, tAt.dy) - 6, tAt.dx, tAt.dy);
      drawDashed(canvas, path, Paint()..style = PaintingStyle.stroke..strokeWidth = 2.5..color = c.primary, dash: 6, gap: 5);
      canvas.drawCircle(tAt, 5, Paint()..color = c.surface);
      canvas.drawCircle(tAt, 5, Paint()..style = PaintingStyle.stroke..strokeWidth = 2.5..color = c.primary);
    }

    if (sorted.length > 1) {
      canvas.drawPath(smoothPath([for (final p in sorted) Offset(x(math.max(1, p.m)), y(p.kg))]), Paint()..style = PaintingStyle.stroke..strokeWidth = 2.5..strokeCap = StrokeCap.round..color = orange);
    }
    for (final p in sorted.take(sorted.length - 1)) {
      final at = Offset(x(math.max(1, p.m)), y(p.kg));
      canvas.drawCircle(at, 3, Paint()..color = orange);
      canvas.drawCircle(at, 3, Paint()..style = PaintingStyle.stroke..strokeWidth = 1..color = c.surface);
    }
    canvas.drawCircle(nowAt, 9, Paint()..color = orange.withValues(alpha: 0.2));
    canvas.drawCircle(nowAt, 4.5, Paint()..color = orange);
    canvas.drawCircle(nowAt, 4.5, Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5..color = c.surface);
  }

  @override
  bool shouldRepaint(_GrowthPainter old) => true;
}
