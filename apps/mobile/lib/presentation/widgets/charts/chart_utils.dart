import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Round axis ticks: returns the ticks and the top of the axis.
({List<double> ticks, double top}) niceTicks(double maxValue, [int count = 4]) {
  final raw = maxValue / count;
  final mag = math.pow(10, (math.log(raw) / math.ln10).floor()).toDouble();
  final norm = raw / mag;
  final step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  final top = (maxValue / step).ceil() * step;
  return (ticks: [for (var v = 0.0; v <= top + 1e-9; v += step) v], top: top);
}

/// Adds cubic curves through [pts] to [path], which must already be at `pts.first` (Catmull-Rom turned into cubic curves).
void smoothTo(Path path, List<Offset> pts) {
  if (pts.length < 3) {
    for (final p in pts.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    return;
  }
  for (var i = 0; i < pts.length - 1; i++) {
    final p0 = i == 0 ? pts[i] : pts[i - 1];
    final p1 = pts[i];
    final p2 = pts[i + 1];
    final p3 = i + 2 < pts.length ? pts[i + 2] : p2;
    path.cubicTo(p1.dx + (p2.dx - p0.dx) / 6, p1.dy + (p2.dy - p0.dy) / 6, p2.dx - (p3.dx - p1.dx) / 6, p2.dy - (p3.dy - p1.dy) / 6, p2.dx, p2.dy);
  }
}

/// A smooth path through the points.
Path smoothPath(List<Offset> pts) {
  final path = Path();
  if (pts.isEmpty) return path;
  path.moveTo(pts.first.dx, pts.first.dy);
  smoothTo(path, pts);
  return path;
}

/// Draws a dashed or dotted version of [source].
void drawDashed(Canvas canvas, Path source, Paint paint, {double dash = 6, double gap = 5}) {
  for (final m in source.computeMetrics()) {
    var d = 0.0;
    while (d < m.length) {
      canvas.drawPath(m.extractPath(d, math.min(d + dash, m.length)), paint);
      d += dash + gap;
    }
  }
}

void paintText(Canvas canvas, String text, Offset at, TextStyle style, {TextAlign align = TextAlign.left, double? maxWidth, bool haloOn = false, Color? halo}) {
  final tp = TextPainter(text: TextSpan(text: text, style: style), textAlign: align, textDirection: TextDirection.ltr, maxLines: 1)..layout(maxWidth: maxWidth ?? double.infinity);
  var o = at;
  if (align == TextAlign.right) o = Offset(at.dx - tp.width, at.dy);
  if (align == TextAlign.center) o = Offset(at.dx - tp.width / 2, at.dy);
  if (haloOn && halo != null) {
    final hp = TextPainter(text: TextSpan(text: text, style: style.copyWith(foreground: Paint()..style = PaintingStyle.stroke..strokeWidth = 4..strokeJoin = StrokeJoin.round..color = halo)), textDirection: TextDirection.ltr, maxLines: 1)..layout();
    hp.paint(canvas, o);
  }
  tp.paint(canvas, o);
}
