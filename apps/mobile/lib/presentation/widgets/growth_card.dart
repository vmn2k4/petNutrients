import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';
import '../../domain/domain.dart';
import '../providers/calc_api.dart';
import 'app_button.dart';
import 'app_card.dart';
import 'chips.dart';
import 'charts/growth_chart.dart';
import 'charts/weight_chart.dart';
import 'status_badge.dart';

const _horizons = [(7, '1w', '1 week'), (14, '2w', '2 weeks'), (30, '1m', '1 month'), (60, '2m', '2 months'), (90, '3m', '3 months')];

String ageLabel(int m) => m >= 24 ? '${m ~/ 12} yr${m % 12 > 0 ? ' ${m % 12} mo' : ''}' : '$m mo';

String kgText(double v) => v == v.roundToDouble() ? '${v.round()}' : v.toStringAsFixed(1);

/// The pet's chart with its percentile, the target picker, and the calories to get there. Shared by Home and the public growth tool.
/// Every number comes from the server (`growthCardView`, `targetCheck`, `retarget`); this widget only draws them.
/// The chart is read-only: the target is set with the time-frame buttons, the slider and the number box.
class GrowthCard extends ConsumerStatefulWidget {
  const GrowthCard({super.key, required this.pet, this.onSaveGoal, this.onClearGoal, this.onFindFood, this.showTable = true});
  final Pet pet;

  /// When set, a "Save as my goal" button appears (signed-in owners).
  final Future<void> Function(int days, double kg)? onSaveGoal;
  final Future<void> Function()? onClearGoal;
  final void Function(int days, double kg)? onFindFood;
  final bool showTable;

  @override
  ConsumerState<GrowthCard> createState() => _GrowthCardState();
}

class _GrowthCardState extends ConsumerState<GrowthCard> {
  Retarget? _t; // the picked target: days, weight, and the slider's limits for those days
  String? _forPet;
  bool? _zoom;
  bool _busy = false;
  late final TextEditingController _kgCtl;

  Pet get pet => widget.pet;

  @override
  void initState() {
    super.initState();
    _kgCtl = TextEditingController();
  }

  @override
  void dispose() {
    _kgCtl.dispose();
    super.dispose();
  }

  void _adopt(GrowthCardData data) {
    final key = '${pet.id}:${pet.weightKg}:${pet.goal?.targetDate}:${pet.goal?.targetKg}';
    if (_forPet == key) return;
    _forPet = key;
    final i = data.initial;
    _t = Retarget(days: i.days, kg: i.kg, lo: i.lo, hi: i.hi);
    _kgCtl.text = kgText(i.kg);
  }

  Future<void> _setDays(int nd) async {
    final t = _t;
    if (t == null || _busy) return;
    _busy = true;
    try {
      final r = await ref.read(calcActionsProvider).retarget(pet, t.days, t.kg, nd);
      if (!mounted) return;
      setState(() {
        _t = r;
        _kgCtl.text = kgText(r.kg);
      });
    } finally {
      _busy = false;
    }
  }

  void _setKg(double v, {bool fromField = false}) {
    final t = _t!;
    setState(() {
      final kg = clampD(roundTo(v, 1), t.lo, t.hi);
      _t = Retarget(days: t.days, kg: kg, lo: t.lo, hi: t.hi);
      if (!fromField) _kgCtl.text = kgText(kg);
    });
  }

  List<(String, String)> _tip(GrowthCardData data, String on, double weight) {
    final pc = data.points.where((p) => p.on == on).firstOrNull?.pct ?? data.cur;
    final m = data.points.where((p) => p.on == on).firstOrNull?.m ?? data.nowM;
    return [
      ('Date', fmtDay(on)),
      ('Age', ageLabel(m.floor())),
      ('Weight', '${kgText(weight)} kg'),
      if (data.growing && pc != null) ('Percentile', pc.edge == 'below' ? 'under 2nd' : pc.edge == 'above' ? 'over 98th' : ordinal(pc.value)),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.calc.growthCard(pet);
    if (data == null) return const AppCard(child: SizedBox(height: 260, child: Center(child: CircularProgressIndicator())));
    _adopt(data);
    final t = _t!;
    final c = context.colors;
    final growing = data.growing;
    final months = data.ageMonths;
    final check = ref.calc.targetCheck(pet, t.days, t.kg);
    final horizonLabel = _horizons.firstWhere((h) => h.$1 == t.days, orElse: () => (t.days, '', '${t.days} days')).$3;
    final summary = growing ? _percentileLine(data) : '${pet.name} is fully grown. Weight is tracked against a healthy range.';
    final pc = data.cur;

    Widget chart;
    if (growing) {
      final limit = pet.species == Species.cat ? 21 : 35;
      final fullMax = pet.species == Species.cat ? 21.0 : 36.0;
      final zoomMax = math.min(fullMax, math.max(12.0, months + 9.0));
      final canZoom = zoomMax < fullMax;
      final zoomOn = _zoom ?? (canZoom && months < 18);
      final pts = [for (final p in data.points) if (p.m <= limit) ChartPoint(m: p.m, kg: p.kg, on: p.on)];
      if (pts.isEmpty || (pts.last.kg - pet.weightKg).abs() > 0.001) pts.add(ChartPoint(m: data.nowM, kg: pet.weightKg, on: todayStr()));
      chart = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (canZoom) Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () => setState(() => _zoom = !zoomOn), child: Text(zoomOn ? 'Show full curve' : 'Zoom in'))),
        GrowthChart(
          bands: data.bands,
          points: pts,
          maxMonth: zoomOn && canZoom ? zoomMax : fullMax,
          petName: pet.name,
          projection: data.growthProjection,
          target: TargetMarker(m: data.nowM + t.days / 30.44, kg: t.kg, label: 'Target ${kgText(t.kg)} kg'),
          dietMarks: [for (var i = 0; i < data.dietMarks.length; i++) (m: data.dietMarks[i], n: data.dietMarks.length - i, date: i < data.dietDates.length ? fmtDay(data.dietDates[i]) : '', lines: i < data.dietDates.length ? dietLines(pet, data.dietDates[i]) : const <String>[])],
          tipFor: (p) => _tip(data, p.on, p.kg),
        ),
        const SizedBox(height: AppSpace.s2),
        Wrap(spacing: AppSpace.s4, runSpacing: AppSpace.s1, children: [
          _legend(c.chartBandOuter, 'Typical range, 2nd to 98th'),
          _legend(c.chartBandInner, 'Middle half, 25th to 75th'),
          _legend(c.chartPoint, pet.name),
        ]),
      ]);
    } else {
      final pts = [for (final l in sortedLogs(pet.logs)) WeightPoint(on: l.on, kg: l.kg)];
      if (pts.isEmpty) pts.add(WeightPoint(on: todayStr(), kg: pet.weightKg));
      chart = WeightChart(
        points: pts,
        petName: pet.name,
        idealKg: (data.plan.ideal - pet.weightKg).abs() > 0.3 ? data.plan.ideal : null,
        range: data.breedRange,
        projection: data.trendProjection,
        target: (t: DateTime.now().millisecondsSinceEpoch + t.days * 86400000, kg: t.kg, label: 'Target ${kgText(t.kg)} kg'),
        tipFor: (p) => _tip(data, p.on, p.kg),
      );
    }

    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        TitleRow('Growth chart', trailing: growing && pc != null ? StatusBadge(pc.edge != null ? 'Outside typical range' : 'In the typical range', state: pc.edge != null ? 'caution' : 'good', icon: pc.edge != null ? PhosphorIconsRegular.warning : PhosphorIconsRegular.checkCircle) : const StatusBadge('Fully grown', state: 'info', icon: PhosphorIconsRegular.checkCircle)),
        const SizedBox(height: AppSpace.s2),
        Text(summary, style: context.text.bodyLarge),
        const SizedBox(height: AppSpace.s3),
        chart,
        const SizedBox(height: AppSpace.s4),
        SegmentTabs<int>(options: [for (final h in _horizons) (h.$1, h.$2)], value: _horizons.any((h) => h.$1 == t.days) ? t.days : -1, onChanged: _setDays),
        const SizedBox(height: AppSpace.s4),
        Text('Target in $horizonLabel', style: context.text.titleSmall),
        Row(children: [
          Expanded(child: Slider(min: t.lo, max: math.max(t.hi, t.lo + 0.1), divisions: math.max(1, ((t.hi - t.lo) * 10).round()), value: clampD(t.kg, t.lo, math.max(t.hi, t.lo + 0.1)), onChanged: (v) => _setKg(v))),
          SizedBox(
            width: 112,
            child: TextField(
              controller: _kgCtl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textAlign: TextAlign.center,
              decoration: const InputDecoration(suffixText: 'kg', isDense: true),
              onChanged: (s) {
                final v = double.tryParse(s.replaceAll(',', '.'));
                if (v != null && v >= t.lo && v <= t.hi) _setKg(v, fromField: true);
              },
              onEditingComplete: () {
                final v = double.tryParse(_kgCtl.text.replaceAll(',', '.'));
                _setKg(v ?? t.kg);
                FocusScope.of(context).unfocus();
              },
            ),
          ),
        ]),
        Text('Most similar pets weigh ${kgText(t.lo)} to ${kgText(t.hi)} kg by then.', style: context.text.bodySmall),
        const SizedBox(height: AppSpace.s3),
        if (check == null) const Padding(padding: EdgeInsets.all(AppSpace.s3), child: Center(child: CircularProgressIndicator())) else ...[
          _result(check, t),
          if (check.vetWarning != null) Padding(padding: const EdgeInsets.only(top: AppSpace.s3), child: NoticeBanner(state: 'caution', title: 'Ask your vet first', text: check.vetWarning!)),
          const SizedBox(height: AppSpace.s3),
          _feedBox(check, t),
        ],
        if (widget.onSaveGoal != null) ...[
          const SizedBox(height: AppSpace.s3),
          Wrap(spacing: AppSpace.s3, children: [
            AppButton(label: 'Save as my goal', variant: AppButtonVariant.dark, icon: PhosphorIconsRegular.checkCircle, onPressed: () => widget.onSaveGoal!(t.days, t.kg)),
            if (data.saved != null && widget.onClearGoal != null) AppButton(label: 'Clear target', variant: AppButtonVariant.ghost, onPressed: widget.onClearGoal),
          ]),
        ],
        if (growing && widget.showTable) _table(data.bands),
      ]),
    );
  }

  String _percentileLine(GrowthCardData data) {
    final p = data.cur;
    if (p == null) return '${kgText(pet.weightKg)} kg at ${data.ageMonths} mo';
    final label = p.young ? 'too young for the percentile chart' : p.edge == 'below' ? 'under 2nd percentile' : p.edge == 'above' ? 'over 98th percentile' : '${ordinal(p.value)} percentile';
    return '${kgText(pet.weightKg)} kg at ${data.ageMonths} mo · $label';
  }

  Widget _legend(Color color, String text) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 14, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3), border: Border.all(color: context.colors.border))),
        const SizedBox(width: 6),
        Text(text, style: context.text.bodySmall),
      ]);

  Widget _result(TargetCheck r, Retarget t) {
    final when = fmtDay(isoDay(DateTime.now().add(Duration(days: t.days))));
    final kg = t.kg;
    final icon = r.pace.state == 'good' ? PhosphorIconsRegular.checkCircle : r.pace.state == 'caution' ? PhosphorIconsRegular.warning : PhosphorIconsRegular.xCircle;
    final facts = r.kind == 'growth' ? '${kgText(kg)} kg by $when · ${ordinal(r.pct!)} percentile (now ${ordinal(r.curPct!)})' : '${kgText(kg)} kg by $when · ${r.weeklyPct > 0 ? '+' : ''}${r.weeklyPct.toStringAsFixed(1)}% a week';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpace.s3),
      decoration: BoxDecoration(color: context.colors.surface2, borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        StatusBadge(r.pace.text, state: r.pace.state, icon: icon),
        const SizedBox(height: AppSpace.s2),
        Text(facts, style: context.text.titleSmall),
        if (r.kind != 'growth' && r.note.isNotEmpty) Padding(padding: const EdgeInsets.only(top: AppSpace.s1), child: Text(r.note, style: context.text.bodySmall)),
      ]),
    );
  }

  /// "To reach this, feed about X kcal a day", with a way straight to foods that fit.
  Widget _feedBox(TargetCheck r, Retarget t) {
    final c = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpace.s3),
      decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Wrap(spacing: AppSpace.s3, runSpacing: AppSpace.s2, crossAxisAlignment: WrapCrossAlignment.center, alignment: WrapAlignment.spaceBetween, children: [
        RichText(text: TextSpan(style: context.text.bodyLarge, children: [
          const TextSpan(text: 'To reach this, feed about '),
          TextSpan(text: '${_thousands(r.kcal)} kcal', style: const TextStyle(fontWeight: FontWeight.w700)),
          const TextSpan(text: ' a day.'),
        ])),
        if (widget.onFindFood != null) AppButton(label: 'Find food that fits', small: true, variant: AppButtonVariant.secondary, icon: PhosphorIconsRegular.bowlFood, onPressed: () => widget.onFindFood!(t.days, t.kg)),
      ]),
    );
  }

  Widget _table(List<GrowthRow> bands) {
    final limit = pet.species == Species.cat ? 21 : 35;
    final rows = bands.where((r) => r.m % 3 == 0 && r.m <= limit + 1).toList();
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      title: Text('Show the curve as a table', style: context.text.titleSmall),
      children: [
        Table(border: TableBorder(horizontalInside: BorderSide(color: context.colors.border)), children: [
          TableRow(children: [for (final h in ['Month', '2nd', '25th', '50th', '75th', '98th']) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text(h, style: context.text.labelMedium))]),
          for (final r in rows) TableRow(children: [for (final v in [r.m.round().toString(), r.p02, r.p25, r.p50, r.p75, r.p98]) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text('$v', style: context.text.bodyMedium))]),
        ]),
      ],
    );
  }
}

String _thousands(num n) {
  final s = n.round().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return b.toString();
}

String thousands(num n) => _thousands(n);

/// What changed in the diet on one day, in plain words (for the marker on the chart).
List<String> dietLines(Pet pet, String day) {
  final started = [for (final d in pet.diet) if (d.startedOn == day) d];
  final stopped = [for (final d in pet.diet) if (d.endedOn == day) d];
  final lines = <String>[];
  for (final a in stopped) {
    final r = started.where((b) => b.replacedId == a.id).firstOrNull;
    if (r != null) {
      lines.add('Replaced ${a.foodName} with ${r.foodName}');
    } else if (!started.any((b) => b.foodName == a.foodName)) {
      lines.add('Stopped ${a.foodName}');
    }
  }
  for (final b in started) {
    if (started.any((x) => false) || stopped.any((a) => a.id == b.replacedId)) continue;
    final changed = stopped.any((a) => a.foodName == b.foodName);
    lines.add(changed ? 'Changed amount of ${b.foodName}' : 'Added ${b.foodName}');
  }
  return lines.isEmpty ? ['Diet updated'] : lines;
}
