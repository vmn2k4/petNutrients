import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../../domain/domain.dart';
import '../../providers/calc_api.dart';
import '../../providers/providers.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/charts/growth_chart.dart';
import '../../widgets/charts/weight_chart.dart';
import '../../widgets/growth_card.dart';
import '../../widgets/inset_list.dart';
import '../../widgets/page.dart';
import '../../widgets/progress_ring.dart';
import '../../widgets/pet_widgets.dart';
import '../../widgets/sheet.dart';
import '../../widgets/states.dart';
import '../../widgets/status_badge.dart';

/// The owner's home, built like a phone app: the pet's chart first and big, one thing to do next under it,
/// quick tiles, and the long text (vet details, history, target planner) one tap away in sheets.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final view = ref.watch(petViewProvider);
    if (view == null) return const LoadingView();
    final pet = view.pet;
    final notifier = ref.read(petsProvider.notifier);
    return AppPage(onRefresh: notifier.refresh, children: [
      AppHeader(view: view),
      const Gap(AppSpace.s3),
      _HeroChart(view: view, onPlan: () => _showPlanner(context, ref, view)),
      const Gap(AppSpace.s4),
      InsetSection(children: [_nextRow(context, ref, view), _kcalRow(context, view), _foodsRow(context, view)]),
      const Gap(AppSpace.s3),
      SafetyBanner(view: view, compact: true),
      const Gap(AppSpace.s5),
      _WeightLog(pet: pet),
      const EstimateNote(),
    ]);
  }

  void _showPlanner(BuildContext context, WidgetRef ref, PetView view) {
    final pet = view.pet;
    final notifier = ref.read(petsProvider.notifier);
    showAppSheet<void>(context, title: '${pet.name}\'s target', builder: (ctx) {
      return GrowthCard(
        pet: pet,
        showTable: false,
        onSaveGoal: (days, kg) async {
          final type = await ref.read(calcActionsProvider).goalType(pet, kg);
          await notifier.setGoal(type: GoalType.parse(type), targetKg: kg, days: days, custom: true);
          if (ctx.mounted) Navigator.pop(ctx);
          if (context.mounted) showToast(context, 'Target saved');
        },
        onClearGoal: () async {
          await notifier.clearGoal();
          if (ctx.mounted) Navigator.pop(ctx);
        },
        onFindFood: (days, kg) {
          Navigator.pop(ctx);
          context.go('/foods?species=${pet.species.name}');
        },
      );
    });
  }
}

/// The chart is the first thing on the screen: the current weight counts up, the pet's line draws in.
class _HeroChart extends ConsumerStatefulWidget {
  const _HeroChart({required this.view, required this.onPlan});
  final PetView view;
  final VoidCallback onPlan;

  @override
  ConsumerState<_HeroChart> createState() => _HeroChartState();
}

class _HeroChartState extends ConsumerState<_HeroChart> {
  double? _maxM; // visible months; null = start zoomed in on young pets

  @override
  Widget build(BuildContext context) {
    final pet = widget.view.pet;
    final data = ref.calc.growthCard(pet);
    final c = context.colors;
    if (data == null) return const AppCard(child: SizedBox(height: 320, child: Center(child: CircularProgressIndicator())));
    final growing = data.growing;
    final pc = data.cur;
    final unit = ref.watch(settingsProvider).unit;
    final shown = unit == 'lb' ? kgToLb(pet.weightKg) : pet.weightKg;
    final reduce = MediaQuery.disableAnimationsOf(context);

    List<(String, String)> tip(String on, double weight) {
      final pt = data.points.where((p) => p.on == on).firstOrNull;
      final pp = pt?.pct ?? data.cur;
      return [
        ('Date', fmtDay(on)),
        ('Age', ageLabel((pt?.m ?? data.nowM).floor())),
        ('Weight', '${kgText(weight)} kg'),
        if (growing && pp != null) ('Percentile', pp.edge == 'below' ? 'under 2nd' : pp.edge == 'above' ? 'over 98th' : ordinal(pp.value)),
      ];
    }

    Widget chart;
    var canZoom = false;
    var minM = 6.0, fullM = 36.0, curM = 36.0;
    if (growing) {
      final months = data.ageMonths;
      final limit = pet.species == Species.cat ? 21 : 35;
      final fullMax = pet.species == Species.cat ? 21.0 : 36.0;
      final zoomMax = math.min(fullMax, math.max(12.0, months + 9.0));
      canZoom = true;
      minM = math.min(fullMax, math.max(6.0, data.nowM + 3)).ceilToDouble();
      fullM = fullMax;
      curM = (_maxM ?? (zoomMax < fullMax && months < 18 ? zoomMax : fullMax)).clamp(minM, fullMax).toDouble();
      final pts = [for (final p in data.points) if (p.m <= limit) ChartPoint(m: p.m, kg: p.kg, on: p.on)];
      if (pts.isEmpty || (pts.last.kg - pet.weightKg).abs() > 0.001) pts.add(ChartPoint(m: data.nowM, kg: pet.weightKg, on: todayStr()));
      final g = pet.goal;
      chart = GrowthChart(
        bands: data.bands,
        points: pts,
        maxMonth: curM,
        petName: pet.name,
        projection: data.growthProjection,
        target: g == null || g.targetDate == null ? null : TargetMarker(m: data.nowM + math.max(0, DateTime.parse(g.targetDate!).difference(DateTime.now()).inDays) / 30.44, kg: g.targetKg, label: 'Target ${kgText(g.targetKg)} kg'),
        dietMarks: [for (var i = 0; i < data.dietMarks.length; i++) (m: data.dietMarks[i], n: data.dietMarks.length - i, date: i < data.dietDates.length ? fmtDay(data.dietDates[i]) : '', lines: i < data.dietDates.length ? dietLines(pet, data.dietDates[i]) : const <String>[])],
        tipFor: (p) => tip(p.on, p.kg),
      );
    } else {
      final pts = [for (final l in sortedLogs(pet.logs)) WeightPoint(on: l.on, kg: l.kg)];
      if (pts.isEmpty) pts.add(WeightPoint(on: todayStr(), kg: pet.weightKg));
      chart = WeightChart(
        points: pts,
        petName: pet.name,
        idealKg: (data.plan.ideal - pet.weightKg).abs() > 0.3 ? data.plan.ideal : null,
        range: data.breedRange,
        projection: data.trendProjection,
        tipFor: (p) => tip(p.on, p.kg),
      );
    }

    final badge = growing && pc != null
        ? StatusBadge(pc.edge != null ? 'Outside typical range' : (pc.young ? 'Too young to rank' : '${ordinal(pc.value)} percentile'), state: pc.edge != null ? 'caution' : 'good', icon: pc.edge != null ? PhosphorIconsRegular.warning : PhosphorIconsRegular.checkCircle)
        : const StatusBadge('Fully grown', state: 'info', icon: PhosphorIconsRegular.checkCircle);

    return AppCard(
      padding: const EdgeInsets.fromLTRB(AppSpace.s2, AppSpace.s4, AppSpace.s2, AppSpace.s2),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.symmetric(horizontal: AppSpace.s3), child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: reduce ? shown : 0, end: shown),
            duration: reduce ? Duration.zero : const Duration(milliseconds: 900),
            curve: Curves.easeOutCubic,
            builder: (_, v, __) => Text.rich(TextSpan(children: [
              TextSpan(text: v.toStringAsFixed(1), style: context.text.displaySmall),
              TextSpan(text: ' $unit', style: context.text.titleMedium!.copyWith(color: c.fgMuted)),
            ])),
          ),
          const Spacer(),
          badge,
        ])),
        const SizedBox(height: AppSpace.s3),
        SizedBox(height: 250, child: chart),
        Padding(padding: const EdgeInsets.symmetric(horizontal: AppSpace.s2), child: Row(children: [
          TextButton.icon(onPressed: widget.onPlan, icon: Icon(PhosphorIconsRegular.target, size: 18), label: Text(pet.goal == null ? 'Set a target' : 'Target ${kgText(pet.goal!.targetKg)} kg')),
          const Spacer(),
          if (canZoom) ...[
            IconButton(tooltip: 'Zoom out', visualDensity: VisualDensity.compact, onPressed: curM >= fullM ? null : () => setState(() => _maxM = (curM * 1.3).roundToDouble().clamp(minM, fullM).toDouble()), icon: Icon(PhosphorIconsRegular.minusCircle)),
            IconButton(tooltip: 'Zoom in', visualDensity: VisualDensity.compact, onPressed: curM <= minM ? null : () => setState(() => _maxM = (curM / 1.3).roundToDouble().clamp(minM, fullM).toDouble()), icon: Icon(PhosphorIconsRegular.plusCircle)),
          ],
        ])),
      ]),
    );
  }
}

/// The one thing to do next, as the first row of "today": the weigh-in ring and one button.
Widget _nextRow(BuildContext context, WidgetRef ref, PetView view) {
  final p = view.pet;
  final c = context.colors;
  final due = view.weigh.dueInDays <= 0;
  final noDiet = !p.diet.any((x) => x.endedOn == null);
  final String title, text, label;
  final VoidCallback go;
  final IconData icon;
  if (due || p.logs.length < 2) {
    title = 'Weigh-in time';
    text = p.logs.length < 2 ? 'One more weight shows the trend.' : view.weigh.lastDaysAgo <= 0 ? 'Weighed today.' : 'Last weighed ${view.weigh.lastDaysAgo} days ago.';
    label = 'Log weight';
    icon = PhosphorIconsRegular.scales;
    go = () => showLogWeightSheet(context, ref);
  } else if (noDiet) {
    title = 'What does ${p.name} eat?';
    text = 'Compare it with the daily calories.';
    label = 'Add a food';
    icon = PhosphorIconsRegular.bowlFood;
    go = () => context.go('/plan');
  } else {
    title = 'On track';
    text = 'Next weigh-in in ${view.weigh.dueInDays} days.';
    label = 'Log weight';
    icon = PhosphorIconsRegular.scales;
    go = () => showLogWeightSheet(context, ref);
  }
  return Padding(
    padding: const EdgeInsets.all(AppSpace.s4),
    child: Row(children: [
      ProgressRing(size: 52, stroke: 6, value: due || view.weigh.interval <= 0 ? 1 : view.weigh.dueInDays / view.weigh.interval, color: due ? c.caution : c.primary, child: Text(due ? 'Now' : '${view.weigh.dueInDays}d', style: context.text.labelMedium)),
      const SizedBox(width: AppSpace.s3),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: context.text.titleMedium),
          Text(text, style: context.text.bodySmall),
          if (due && p.logs.length >= 2) TextButton(style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 32), alignment: Alignment.centerLeft), onPressed: () => ref.read(petsProvider.notifier).skipWeighIn(), child: const Text('Skip this time')),
        ]),
      ),
      const SizedBox(width: AppSpace.s2),
      AppButton(label: label, icon: icon, small: true, cta: true, onPressed: go),
    ]),
  );
}

Widget _kcalRow(BuildContext context, PetView view) => RowTile(leading: IconBubble(PhosphorIconsRegular.flame), title: '${thousands(view.target?.kcal ?? view.plan.kcal.round())} kcal a day', subtitle: 'Daily goal · see what ${view.pet.name} eats', chevron: true, onTap: () => context.go('/plan'));

Widget _foodsRow(BuildContext context, PetView view) => RowTile(leading: IconBubble(PhosphorIconsRegular.magnifyingGlass), title: 'Foods that fit ${view.pet.name}', subtitle: 'Ranked for their profile', chevron: true, onTap: () => context.go('/foods?species=${view.pet.species.name}'));

class _WeightLog extends ConsumerWidget {
  const _WeightLog({required this.pet});
  final Pet pet;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final logs = sortedLogs(pet.logs).reversed.take(5).toList();
    final unit = ref.watch(settingsProvider).unit;
    String show(double kg) => unit == 'lb' ? '${roundTo(kgToLb(kg), 1)} lb' : '${kgText(kg)} kg';
    if (logs.isEmpty) return const SizedBox.shrink();
    return InsetSection(title: 'Weight log', children: [
      for (var i = 0; i < logs.length; i++)
        RowTile(
          leading: IconBubble(PhosphorIconsRegular.scales),
          title: show(logs[i].kg),
          subtitle: fmtDay(logs[i].on),
          trailing: i + 1 < logs.length && (logs[i].kg - logs[i + 1].kg).abs() >= 0.05 ? Text('${logs[i].kg - logs[i + 1].kg > 0 ? '+' : ''}${(logs[i].kg - logs[i + 1].kg).toStringAsFixed(1)} kg', style: context.text.bodySmall) : null,
        ),
    ]);
  }
}
