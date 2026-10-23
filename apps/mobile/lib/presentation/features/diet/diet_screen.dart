import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../../domain/domain.dart';
import '../../providers/calc_api.dart';
import '../../providers/providers.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/growth_card.dart' show kgText, thousands;
import '../../widgets/inset_list.dart';
import '../../widgets/labels.dart';
import '../../widgets/page.dart';
import '../../widgets/pet_widgets.dart';
import '../../widgets/progress_ring.dart';
import '../../widgets/sheet.dart';
import '../../widgets/states.dart';
import '../../widgets/status_badge.dart';
import 'add_food_sheet.dart';

String _amountText(DietItem it) => '${kgText(it.amount)} ${unitWords(it.unit, it.amount)} × ${kgText(it.timesPerDay)} a day';

/// Diet: today's calories against the goal as one hero, then what is fed as grouped lists. Tap a row for its actions; swipe left to stop.
class DietScreen extends ConsumerWidget {
  const DietScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final view = ref.watch(petViewProvider);
    if (view == null) return const SizedBox.shrink();
    final pet = view.pet;
    final byId = {for (final f in [...?ref.watch(foodsProvider).value, ...?ref.watch(treatsProvider).value]) f.id: f};
    final used = [for (final it in pet.diet) if (it.foodId != null && byId[it.foodId] != null) byId[it.foodId]!];
    final dv = ref.calc.dietView(pet, used);
    if (dv == null) return const LoadingView();
    final now = dv.current;
    final foods = now.where((i) => i.role != 'supplement' && i.role != 'treat').toList();
    final treats = now.where((i) => i.role == 'treat').toList();
    final supps = now.where((i) => i.role == 'supplement').toList();
    final target = view.target;

    return AppPage(onRefresh: () => ref.read(petsProvider.notifier).refresh(), children: [
      AppHeader(view: view, title: 'Diet', showFacts: false),
      const Gap(AppSpace.s4),
      if (target != null) _Hero(view: view, dv: dv, target: target, anyFed: now.any((i) => i.role != 'supplement')),
      const Gap(AppSpace.s3),
      SafetyBanner(view: view, compact: true),
      if (view.plan.vetHold || view.plan.needsVet || pet.health.isNotEmpty) const Gap(AppSpace.s3),
      const Gap(AppSpace.s3),
      InsetSection(
        title: 'Food',
        action: AddButton(label: 'Add a food', onPressed: () => showChangeDietSheet(context)),
        children: foods.isEmpty ? [RowTile(leading: IconBubble(PhosphorIconsRegular.bowlFood), title: 'Add what ${pet.name} eats', subtitle: 'Compare it with the daily goal', onTap: () => showChangeDietSheet(context), chevron: true)] : [for (final it in foods) _row(context, ref, it, dv, pet)],
      ),
      const Gap(AppSpace.s5),
      InsetSection(
        title: 'Treats',
        action: AddButton(label: 'Add a treat', onPressed: () => showChangeDietSheet(context, kind: DietKind.treat)),
        footer: treats.isEmpty || target == null ? 'Keep treats under about 10% of the day.' : null,
        children: treats.isEmpty ? [RowTile(leading: IconBubble(PhosphorIconsRegular.cookie), title: 'No treats added', onTap: () => showChangeDietSheet(context, kind: DietKind.treat), chevron: true)] : [for (final it in treats) _row(context, ref, it, dv, pet), if (target != null) Padding(padding: const EdgeInsets.all(AppSpace.s4), child: _TreatLine(dv: dv, planned: target.kcal, name: pet.name))],
      ),
      const Gap(AppSpace.s5),
      InsetSection(
        title: 'Supplements',
        action: AddButton(label: 'Add a supplement', onPressed: () => showChangeDietSheet(context, kind: DietKind.supplement)),
        footer: 'Not counted in calories. Ask your vet before starting one.',
        children: supps.isEmpty ? [RowTile(leading: IconBubble(PhosphorIconsRegular.pill), title: 'None added', onTap: () => showChangeDietSheet(context, kind: DietKind.supplement), chevron: true)] : [for (final it in supps) _row(context, ref, it, dv, pet)],
      ),
      if (dv.changes.isNotEmpty) ...[
        const Gap(AppSpace.s5),
        _History(dv: dv),
      ],
      const EstimateNote(),
    ]);
  }

  Widget _row(BuildContext context, WidgetRef ref, DietItem it, DietViewData dv, Pet pet) {
    final c = context.colors;
    final k = dv.items[it.id];
    final fl = dv.flags[it.id];
    final icon = it.role == 'treat' ? PhosphorIconsRegular.cookie : it.role == 'supplement' ? PhosphorIconsRegular.pill : PhosphorIconsRegular.bowlFood;
    final warn = fl?.wrongSpecies == true ? 'Made for ${fl!.foodSpecies}s, not ${pet.species.name}s' : fl?.badText != null ? 'Check ingredients' : null;
    final sub = [_amountText(it), if (k != null && k.source == 'estimate') 'estimate'].join(' · ');
    return Dismissible(
      key: ValueKey('diet-${it.id}'),
      direction: DismissDirection.endToStart,
      background: Container(alignment: Alignment.centerRight, padding: const EdgeInsets.only(right: AppSpace.s4), color: c.badBg, child: Row(mainAxisSize: MainAxisSize.min, children: [Text('Stop', style: context.text.labelLarge!.copyWith(color: c.bad)), const SizedBox(width: AppSpace.s2), Icon(PhosphorIconsRegular.stop, color: c.bad)])),
      onDismissed: (_) => _stopWithUndo(context, ref, it),
      child: Container(
        color: c.surface,
        child: RowTile(
          leading: IconBubble(warn != null ? PhosphorIconsRegular.warning : icon, color: warn != null ? c.bad : null, background: warn != null ? c.badBg : null),
          title: it.foodName,
          subtitle: warn ?? sub,
          subtitleColor: warn != null ? c.bad : null,
          trailing: it.role == 'supplement' ? null : k == null ? Text('no kcal', style: context.text.bodySmall) : Text('${k.perDay.round()} kcal', style: context.text.titleSmall),
          onTap: () => _actions(context, ref, it, dv, pet, k == null && it.role != 'supplement'),
        ),
      ),
    );
  }

  void _actions(BuildContext context, WidgetRef ref, DietItem it, DietViewData dv, Pet pet, bool noKcal) {
    final fl = dv.flags[it.id];
    showAppSheet<void>(context, title: it.foodName, builder: (ctx) {
      Widget act(IconData icon, String label, VoidCallback go, {bool destructive = false}) => RowTile(leading: IconBubble(icon, color: destructive ? ctx.colors.bad : null, background: destructive ? ctx.colors.badBg : null), title: label, destructive: destructive, onTap: () {
            Navigator.pop(ctx);
            go();
          });
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('${_amountText(it)}${dv.items[it.id] == null ? '' : ' · ${dv.items[it.id]!.perDay.round()} kcal'}', style: ctx.text.bodyMedium),
        if (fl?.wrongSpecies == true) Padding(padding: const EdgeInsets.only(top: AppSpace.s2), child: Text('This is a ${fl!.foodSpecies} food and ${pet.name} is a ${pet.species.name}. ${fl.foodSpecies == 'cat' ? 'Cat food is richer in protein and fat and is not balanced for dogs.' : 'Dog food is not balanced for cats, who also need taurine.'} Please check with your vet.', style: ctx.text.bodySmall!.copyWith(color: ctx.colors.bad)))
        else if (fl?.badText != null) Padding(padding: const EdgeInsets.only(top: AppSpace.s2), child: Text(fl!.badText!, style: ctx.text.bodySmall!.copyWith(color: ctx.colors.bad))),
        const Gap(AppSpace.s3),
        InsetSection(children: [
          act(PhosphorIconsRegular.pencilSimple, 'Change amount', () => showChangeDietSheet(context, mode: 'amount', itemId: it.id)),
          if (it.role != 'supplement') act(PhosphorIconsRegular.arrowsLeftRight, 'Replace with another food', () => showChangeDietSheet(context, mode: 'replace', itemId: it.id)),
          if (noKcal) act(PhosphorIconsRegular.flame, it.unit == 'g' ? 'Add kcal per 100 g' : 'Add kcal per ${it.unit}', () => _askKcal(context, ref, it)),
          act(PhosphorIconsRegular.stop, 'Stop this food', () => _stopWithUndo(context, ref, it), destructive: true),
        ]),
      ]);
    });
  }

  /// Stops the food and offers Undo for a few seconds (swipe left, or from the row's actions).
  Future<void> _stopWithUndo(BuildContext context, WidgetRef ref, DietItem item) async {
    HapticFeedback.mediumImpact();
    final notifier = ref.read(petsProvider.notifier);
    final date = todayStr();
    final msg = await notifier.changeDiet(date: date, stops: [item.id]);
    if (!context.mounted) return;
    final m = ScaffoldMessenger.of(context);
    m.hideCurrentSnackBar();
    m.showSnackBar(SnackBar(content: Text(msg ?? 'Stopped ${item.foodName}'), action: msg != null ? null : SnackBarAction(label: 'Undo', onPressed: () => notifier.undoDietChange(date))));
  }

  Future<void> _askKcal(BuildContext context, WidgetRef ref, DietItem item) async {
    final grams = item.unit == 'g';
    final ctl = TextEditingController();
    String? error;
    await showAppSheet<void>(context, title: 'Calories for ${item.foodName}', builder: (ctx) => StatefulBuilder(builder: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(grams ? 'Calories in 100 g, from the label.' : 'Calories in one ${unitWords(item.unit, 1)}, from the label.', style: ctx.text.bodyMedium),
          const Gap(AppSpace.s3),
          TextField(controller: ctl, autofocus: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(suffixText: grams ? 'kcal / 100 g' : 'kcal')),
          const Gap(AppSpace.s3),
          ErrorText(error),
          AppButton(label: 'Save', block: true, onPressed: () async {
            final msg = await ref.read(petsProvider.notifier).setDietKcal(item.id, double.tryParse(ctl.text.replaceAll(',', '.')) ?? 0);
            if (!ctx.mounted) return;
            if (msg != null) {
              set(() => error = msg);
            } else {
              Navigator.pop(ctx);
            }
          }),
        ])));
    ctl.dispose();
  }
}

/// Today at a glance: the ring of calories fed against the goal, on one tinted surface.
class _Hero extends StatelessWidget {
  const _Hero({required this.view, required this.dv, required this.target, required this.anyFed});
  final PetView view;
  final DietViewData dv;
  final DailyTarget target;
  final bool anyFed;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final verdict = {'about': 'About right', 'below': 'Below the goal', 'above': 'Above the goal', 'unknown': 'Some foods have no calories yet'}[dv.vsState];
    final state = dv.vsState == 'about' ? 'good' : dv.vsState == 'unknown' ? 'info' : 'caution';
    final plan = view.plan;
    return Container(
      padding: const EdgeInsets.all(AppSpace.s5),
      decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          ProgressRing(
            value: !anyFed || target.kcal == 0 ? 0 : dv.kcal / target.kcal,
            color: dv.vsState == 'about' ? c.good : (dv.vsState == 'none' || dv.vsState == 'unknown' ? c.primary : c.caution),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(anyFed ? thousands(dv.kcal) : '–', style: context.text.headlineSmall),
              Text('kcal eating', style: context.text.bodySmall),
            ]),
          ),
          const SizedBox(width: AppSpace.s4),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Daily goal${view.plan.vetHold ? ' · approximate' : ''}', style: context.text.bodySmall),
              Text.rich(TextSpan(children: [TextSpan(text: thousands(target.kcal), style: context.text.headlineMedium), TextSpan(text: ' kcal', style: context.text.titleSmall)])),
              const Gap(AppSpace.s1),
              if (verdict != null && anyFed) StatusBadge(dv.vsPct != null && dv.vsState != 'about' && dv.vsState != 'unknown' ? '$verdict · ${dv.vsPct}%' : verdict, state: state),
            ]),
          ),
        ]),
        if (plan.stage != 'growth') ...[
          const Gap(AppSpace.s3),
          Text('Estimated ideal weight about ${kgText(double.parse(plan.ideal.toStringAsFixed(1)))} kg.${plan.losing && dv.floor != null ? ' Never go below ${dv.floor!.round()} kcal without a vet nutritionist.' : ''}', style: context.text.bodySmall),
        ],
      ]),
    );
  }
}

class _TreatLine extends StatelessWidget {
  const _TreatLine({required this.dv, required this.planned, required this.name});
  final DietViewData dv;
  final int planned;
  final String name;

  @override
  Widget build(BuildContext context) {
    final budget = (dv.treatShare * planned).round();
    final pct = planned == 0 ? 0 : (dv.treatKcal / planned * 100).round();
    return Text.rich(TextSpan(style: context.text.bodySmall, children: [
      TextSpan(text: 'Treats add about ${dv.treatKcal} kcal a day, $pct% of $name\'s plan. The usual limit is about 10%, $budget kcal.'),
      if (dv.treatKcal > budget) TextSpan(text: ' That is above the usual limit: consider fewer treats or a smaller food portion.', style: TextStyle(color: context.colors.caution)),
    ]));
  }
}

class _History extends ConsumerWidget {
  const _History({required this.dv});
  final DietViewData dv;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final periods = {for (final p in dv.periods) p.start: p};
    return AppCard(
      padding: EdgeInsets.zero,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: AppSpace.s4),
          childrenPadding: const EdgeInsets.fromLTRB(AppSpace.s4, 0, AppSpace.s4, AppSpace.s4),
          title: Text('Diet history and what happened after', style: context.text.titleMedium),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < dv.changes.length; i++) _change(context, ref, dv.changes[i], i, periods[dv.changes[i].date]),
            const Gap(AppSpace.s2),
            Text('This shows what happened after each change. Growth also depends on age, health, treats and the season, so it does not prove that a food caused a change.', style: context.text.bodySmall),
          ],
        ),
      ),
    );
  }

  Widget _change(BuildContext context, WidgetRef ref, DietChangeDay c, int i, DietPeriod? p) {
    final cl = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.s4),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        CircleAvatar(radius: 12, backgroundColor: cl.primarySoft, child: Text('${dv.changes.length - i}', style: context.text.labelSmall!.copyWith(color: cl.primary))),
        const SizedBox(width: AppSpace.s3),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(fmtDay(c.date), style: context.text.titleSmall)),
              if (i == 0) TextButton(onPressed: () => _undo(context, ref, c.date), child: const Text('Undo this change')),
            ]),
            for (final l in c.lines) Padding(padding: const EdgeInsets.only(top: 2), child: Text(l, style: context.text.bodyMedium)),
            if (p != null) Padding(padding: const EdgeInsets.only(top: AppSpace.s1), child: Text(_impact(p), style: context.text.bodySmall)),
          ]),
        ),
      ]),
    );
  }

  String _impact(DietPeriod p) {
    final span = p.end != null ? 'until ${fmtDay(p.end!)}' : 'until now';
    if (p.startKg == null || p.endKg == null || p.weighIns == 0) return 'No weigh-ins $span yet. Weigh in to see how weight moved on this diet.';
    final pace = p.enough && p.weeklyGain != null ? ' · ${p.weeklyGain! > 0 ? '+' : ''}${p.weeklyGain!.toStringAsFixed(1)} kg a week' : '';
    final pct = p.enough && p.pctStart != null ? ' · ${p.pctStart}th to ${p.pctEnd}th percentile' : '';
    return 'Weight $span: ${kgText(double.parse(p.startKg!.toStringAsFixed(1)))} to ${kgText(double.parse(p.endKg!.toStringAsFixed(1)))} kg$pace$pct${p.enough ? '' : ' (not enough weigh-ins yet to read a pace: about 3 over 2 weeks)'}';
  }

  Future<void> _undo(BuildContext context, WidgetRef ref, String date) async {
    final ok = await showAdaptiveDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog.adaptive(title: const Text('Undo this change?'), content: const Text('Foods added on that day are removed and foods it stopped are brought back.'), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Undo'))]),
    );
    if (ok == true) await ref.read(petsProvider.notifier).undoDietChange(date);
  }
}
