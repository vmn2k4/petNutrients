import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';
import '../../domain/domain.dart';
import '../providers/providers.dart';
import 'app_button.dart';
import 'chips.dart';
import 'growth_card.dart';
import 'page.dart';
import 'sheet.dart';
import 'status_badge.dart';

/// One chip per pet plus "Add pet". Picking a chip makes that pet the active one.
class PetSwitcher extends ConsumerWidget {
  const PetSwitcher({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(petsProvider).value;
    if (s == null || s.pets.isEmpty) return const SizedBox.shrink();
    final active = s.active;
    return SizedBox(
      height: AppSize.touchMin + 4,
      child: ListView(scrollDirection: Axis.horizontal, children: [
        for (final p in s.pets) Padding(padding: const EdgeInsets.only(right: AppSpace.s2), child: ToggleChip(label: p.name, icon: PhosphorIconsRegular.pawPrint, selected: p.id == active?.id, onTap: () => ref.read(petsProvider.notifier).setActive(p.id))),
        ToggleChip(label: 'Add pet', icon: PhosphorIconsRegular.plus, selected: false, onTap: () => context.push('/onboarding?add=1')),
      ]),
    );
  }
}

/// The compact top of every signed-in screen: the pet's avatar (tap to switch pets), name and facts, and the screen's one action.
class AppHeader extends ConsumerWidget {
  const AppHeader({super.key, required this.view, this.title, this.showFacts = true, this.action});
  final PetView view;
  final String? title;
  final bool showFacts;
  final Widget? action;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = view.pet;
    final streak = view.weigh.streak;
    return Row(children: [
      Material(
        color: AppColors.brandYellow,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _switchSheet(context, ref),
          child: SizedBox(
            width: 52,
            height: 52,
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Image.asset('assets/images/${p.species == Species.cat ? (view.growing ? 'cut-kitten' : 'cut-cat') : (view.growing ? 'cut-puppy' : 'cut-beagle')}.webp', fit: BoxFit.contain, alignment: Alignment.bottomCenter, errorBuilder: (_, __, ___) => Icon(PhosphorIconsRegular.pawPrint, color: AppColors.brandInk)),
            ),
          ),
        ),
      ),
      const SizedBox(width: AppSpace.s3),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title ?? p.name, style: context.text.headlineSmall),
          if (showFacts) Text('${p.species == Species.dog ? (p.breed.isEmpty ? 'Mixed breed' : p.breed) : 'Cat'} · ${ageLabel(view.summary.ageMonths)}', style: context.text.bodySmall, overflow: TextOverflow.ellipsis),
        ]),
      ),
      if (action != null) action! else if (showFacts && streak >= 2) StatusBadge('$streak weigh-ins', state: 'good', icon: PhosphorIconsRegular.flame),
    ]);
  }

  void _switchSheet(BuildContext context, WidgetRef ref) {
    final pets = ref.read(petsProvider).value?.pets ?? const <Pet>[];
    showAppSheet<void>(context, title: 'Your pets', builder: (ctx) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final p in pets)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(PhosphorIconsRegular.pawPrint, color: p.id == view.pet.id ? ctx.colors.primary : null),
            title: Text(p.name, style: ctx.text.titleMedium),
            trailing: p.id == view.pet.id ? Icon(PhosphorIconsRegular.check, color: ctx.colors.primary) : null,
            onTap: () {
              HapticFeedback.selectionClick();
              ref.read(petsProvider.notifier).setActive(p.id);
              Navigator.pop(ctx);
            },
          ),
        const SizedBox(height: AppSpace.s2),
        AppButton(label: 'Add pet', icon: PhosphorIconsRegular.plus, variant: AppButtonVariant.secondary, block: true, onPressed: () {
          Navigator.pop(ctx);
          context.push('/onboarding?add=1');
        }),
      ]);
    });
  }
}

/// Safety information is never hidden: shown on every signed-in screen when it applies.
/// `compact` is one tappable line that opens the full text in a sheet (for screens where the chart and the next step come first).
class SafetyBanner extends StatelessWidget {
  const SafetyBanner({super.key, required this.view, this.compact = false});
  final PetView view;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final p = view.pet;
    final String title, text;
    if (view.plan.vetHold) {
      title = "Confirm ${p.name}'s calories with your vet";
      text = '${p.name} is still growing and is ${p.bcs >= 7 ? 'carrying extra weight' : 'above the top of the growth chart'}. The calories and portions here are approximate. Please check them with your vet, and do not start a weight-loss diet for a growing pet without their advice.';
    } else if (view.plan.needsVet || p.health.isNotEmpty || (p.species == Species.dog && view.growing && p.bcs >= 6)) {
      title = 'Best to check in with your vet';
      text = 'Your answers suggest a vet should guide the diet (a medical condition, pregnancy or nursing, very thin, or weight loss in a growing pet). You can still browse, but treat the numbers as general guidance.';
    } else {
      return const SizedBox.shrink();
    }
    if (!compact) return NoticeBanner(state: 'caution', title: title, text: text);
    final c = context.colors;
    return Material(
      color: c.cautionBg,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => showAppSheet<void>(context, title: title, builder: (ctx) => Text(text, style: ctx.text.bodyLarge)),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.s4, vertical: AppSpace.s3),
          child: Row(children: [
            Icon(PhosphorIconsRegular.stethoscope, color: c.caution),
            const SizedBox(width: AppSpace.s3),
            Expanded(child: Text(view.plan.vetHold ? 'Check calories with your vet' : 'Best to check in with your vet', style: context.text.titleSmall!.copyWith(color: c.caution))),
            Icon(PhosphorIconsRegular.caretRight, color: c.caution, size: 18),
          ]),
        ),
      ),
    );
  }
}

/// The one-tap weigh-in: a big number with minus and plus, kg or lb.
Future<void> showLogWeightSheet(BuildContext context, WidgetRef ref) async {
  final view = ref.read(petViewProvider);
  if (view == null) return;
  final pet = view.pet;
  var unit = ref.read(settingsProvider).unit;
  String show(double kg) => kgText(roundTo(unit == 'lb' ? kgToLb(kg) : kg, 1));
  final ctl = TextEditingController(text: show(pet.weightKg));
  String? error;
  var saving = false;
  final last = sortedLogs(pet.logs).lastOrNull;
  await showAppSheet<void>(context, title: "Log ${pet.name}'s weight", builder: (ctx) {
    return StatefulBuilder(builder: (ctx, set) {
      double read() => double.tryParse(ctl.text.replaceAll(',', '.')) ?? 0;
      double toKg(double v) => unit == 'lb' ? lbToKg(v) : v;
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(last == null ? 'First weigh-in.' : 'Last weigh-in: ${kgText(last.kg)} kg on ${fmtDay(last.on)}.', style: ctx.text.bodyMedium),
        const Gap(AppSpace.s4),
        Row(children: [
          IconButton.filledTonal(onPressed: () => set(() => ctl.text = kgText(roundTo(math.max(0.1, read() - (unit == 'lb' ? 0.2 : 0.1)), 1))), icon: const Icon(Icons.remove), tooltip: 'Less'),
          Expanded(child: TextField(controller: ctl, textAlign: TextAlign.center, style: ctx.text.displaySmall, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(suffixText: unit))),
          IconButton.filledTonal(onPressed: () => set(() => ctl.text = kgText(roundTo(read() + (unit == 'lb' ? 0.2 : 0.1), 1))), icon: const Icon(Icons.add), tooltip: 'More'),
        ]),
        const Gap(AppSpace.s3),
        SegmentTabs<String>(options: const [('kg', 'kg'), ('lb', 'lb')], value: unit, onChanged: (u) {
          final kg = toKg(read());
          unit = u;
          ref.read(settingsProvider.notifier).setUnit(u);
          set(() => ctl.text = kg > 0 ? show(kg) : ctl.text);
        }),
        const Gap(AppSpace.s3),
        ErrorText(error),
        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          AppButton(label: 'Cancel', variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(ctx)),
          const SizedBox(width: AppSpace.s3),
          AppButton(
            label: 'Save weight',
            icon: PhosphorIconsRegular.check,
            loading: saving,
            onPressed: () async {
              final kg = toKg(read());
              if (!(kg > 0.1)) {
                set(() => error = 'Enter a weight.');
                return;
              }
              set(() => saving = true);
              final msg = await ref.read(petsProvider.notifier).logWeight(roundTo(kg, 2));
              if (!ctx.mounted) return;
              if (msg != null) {
                set(() {
                  error = msg;
                  saving = false;
                });
                return;
              }
              HapticFeedback.mediumImpact();
              Navigator.pop(ctx);
              showToast(context, 'Saved ${show(kg)} $unit');
            },
          ),
        ]),
      ]);
    });
  });
  ctl.dispose();
}
