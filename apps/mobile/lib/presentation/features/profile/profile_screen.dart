import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../../domain/domain.dart';
import '../../providers/providers.dart';
import '../../widgets/app_button.dart';
import '../../widgets/chips.dart';
import '../../widgets/growth_card.dart' show ageLabel;
import '../../widgets/inset_list.dart';
import '../../widgets/form_fields.dart';
import '../../widgets/pet_widgets.dart' show showLogWeightSheet;
import '../../widgets/page.dart';
import '../../widgets/progress_ring.dart';
import '../../widgets/sheet.dart';
import '../../providers/calc_api.dart';
import '../onboarding/onboarding_screen.dart' show healthOptions;

const _regions = [('US', 'United States'), ('CA', 'Canada'), ('all', 'Both')];

/// Profile: the pet's answers, the account's region, units and reminders, and sign out.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final view = ref.watch(petViewProvider);
    final user = ref.watch(currentUserProvider);
    final s = ref.watch(settingsProvider);
    final c = ref.read(settingsProvider.notifier);
    return AppPage(children: [
      if (view != null) ...[
        _Hero(view: view),
        const Gap(AppSpace.s4),
        InsetSection(children: [
          RowTile(
            leading: ProgressRing(size: 44, stroke: 5, value: view.summary.completeness / 100, child: Text('${view.summary.completeness}', style: context.text.labelSmall)),
            title: view.summary.completeness >= 100 ? '${view.pet.name}\'s profile is complete' : 'Profile ${view.summary.completeness}% answered',
            subtitle: 'Calories are still an estimate',
          ),
        ]),
        const Gap(AppSpace.s5),
        InsetSection(title: view.pet.name, children: _fieldRows(context, ref, view)),
        const Gap(AppSpace.s5),
      ],
      InsetSection(title: 'Preferences', children: [
        Padding(padding: const EdgeInsets.all(AppSpace.s4), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Where you shop', style: context.text.titleSmall), const Gap(AppSpace.s2), SegmentTabs<String>(options: _regions, value: s.region, onChanged: c.setRegion)])),
        Padding(padding: const EdgeInsets.all(AppSpace.s4), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Weight units', style: context.text.titleSmall), const Gap(AppSpace.s2), SegmentTabs<String>(options: const [('kg', 'kg'), ('lb', 'lb')], value: s.unit, onChanged: c.setUnit)])),
        RowTile(leading: IconBubble(PhosphorIconsRegular.bell), title: 'Weigh-in reminder', subtitle: 'Email, at most weekly', trailing: Switch.adaptive(value: s.reminders, onChanged: (v) {
          HapticFeedback.selectionClick();
          c.setReminders(v);
        })),
      ]),
      const Gap(AppSpace.s5),
      InsetSection(title: 'Learn', children: [
        RowTile(leading: IconBubble(PhosphorIconsRegular.bookOpen), title: 'Guides', chevron: true, onTap: () => context.push('/guides')),
        RowTile(leading: IconBubble(PhosphorIconsRegular.wrench), title: 'Tools', subtitle: 'Can my pet eat this?', chevron: true, onTap: () => context.push('/tools')),
        RowTile(leading: IconBubble(PhosphorIconsRegular.info), title: 'Disclaimer, privacy and terms', chevron: true, onTap: () => context.push('/disclaimer')),
      ]),
      const Gap(AppSpace.s5),
      InsetSection(title: 'Account', footer: user?.email, children: [
        RowTile(leading: IconBubble(PhosphorIconsRegular.signOut), title: 'Sign out', onTap: () => ref.read(authRepoProvider).signOut()),
        if (view != null) RowTile(leading: IconBubble(PhosphorIconsRegular.trash, color: context.colors.bad, background: context.colors.badBg), title: 'Remove ${view.pet.name}', destructive: true, onTap: () => _confirm(context, 'Remove ${view.pet.name}?', 'Their weights and diet history will be deleted.', () => ref.read(petsProvider.notifier).removeActive())),
        RowTile(leading: IconBubble(PhosphorIconsRegular.userMinus, color: context.colors.bad, background: context.colors.badBg), title: 'Delete my account and data', destructive: true, onTap: () => _confirm(context, 'Delete your account?', 'Every pet, weight and diet entry is deleted. This cannot be undone.', () => ref.read(authRepoProvider).deleteMyAccount())),
      ]),
    ]);
  }

  static const _bcsDog = {1: 'Very thin', 3: 'Thin', 4: 'Slightly lean', 5: 'Ideal', 6: 'Slightly heavy', 7: 'Heavy', 9: 'Obese'};
  static const _bcsCat = {3: 'Thin', 5: 'Healthy weight', 6: 'A bit heavy'};

  /// One row per question about the pet, with its answer; tap a row to change just that answer (same list as the website).
  List<Widget> _fieldRows(BuildContext context, WidgetRef ref, PetView view) {
    final p = view.pet;
    final unit = ref.watch(settingsProvider).unit;
    final bcs = (p.species == Species.dog ? _bcsDog : _bcsCat);
    String bcsText() {
      final near = bcs.keys.reduce((a, b) => (a - p.bcs).abs() <= (b - p.bcs).abs() ? a : b);
      return '${p.species == Species.dog ? '$near. ' : ''}${bcs[near]}';
    }

    String list(List<String> l) => l.isEmpty ? 'None' : l.join(', ');
    Widget row(String label, String value, VoidCallback go) => RowTile(title: label, trailing: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 190), child: Text(value, textAlign: TextAlign.end, style: context.text.bodyMedium!.copyWith(color: context.colors.fgMuted), maxLines: 2, overflow: TextOverflow.ellipsis)), chevron: true, onTap: go);
    return [
      row('Name', p.name, () => _editName(context, ref, p)),
      row('Date of birth', fmtDay(p.birth), () => _editBirth(context, ref, p)),
      if (p.species == Species.dog) row('Breed', p.breed.isEmpty ? 'Mixed breed' : p.breed, () => _editBreed(context, ref, p)),
      row('Weight', unit == 'lb' ? '${(p.weightKg * 2.20462).toStringAsFixed(1)} lb' : '${(p.weightKg * 10).round() / 10} kg', () => showLogWeightSheet(context, ref)),
      row('Spayed or neutered', p.neutered ? 'Yes' : 'No', () => _pickOne(context, ref, p, 'Spayed or neutered?', 'Spayed and neutered pets usually need fewer calories.', [('yes', 'Yes'), ('no', 'No')], p.neutered ? 'yes' : 'no', (v) => p.copyWith(neutered: v == 'yes', answered: {...p.answered, 'neutered': true}))),
      row('Walking or play a day', view.summary.activityLabel.isEmpty ? p.activity : view.summary.activityLabel, () => _editActivity(context, ref, p, view)),
      row('Body shape', bcsText(), () => _pickOne(context, ref, p, 'How does the body look?', 'Helps us find their ideal weight and the right calories.', [for (final e in bcs.entries) ('${e.key}', p.species == Species.dog ? '${e.key}. ${e.value}' : e.value)], '${bcs.keys.reduce((a, b) => (a - p.bcs).abs() <= (b - p.bcs).abs() ? a : b)}', (v) => p.copyWith(bcs: int.parse(v), answered: {...p.answered, 'bcs': true}))),
      row('Ingredients to avoid', list(p.allergies), () => _pickMany(context, ref, p, 'Any ingredients to avoid?', 'We flag or hide foods that contain them.', [for (final a in allergens) (a, a[0].toUpperCase() + a.substring(1))], p.allergies.toSet(), (s) => p.copyWith(allergies: s.toList(), answered: {...p.answered, 'allergies': true}))),
      row('Health notes', list(p.health), () => _pickMany(context, ref, p, 'Anything we should know?', 'Only if a vet has told you. We will suggest checking the plan with them.', [for (final h in healthOptions) (h, h)], p.health.toSet(), (s) => p.copyWith(health: s.toList()))),
      if (p.species == Species.dog && p.breed.isNotEmpty) RowTile(title: 'About the ${p.breed}', chevron: true, onTap: () => _aboutBreed(context, ref, p)),
    ];
  }

  Future<void> _save(WidgetRef ref, Pet updated) => ref.read(petsProvider.notifier).updateProfile(updated);

  Future<void> _editName(BuildContext context, WidgetRef ref, Pet p) async {
    final ctl = TextEditingController(text: p.name);
    await showAppSheet<void>(context, title: 'Name', builder: (ctx) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextField(controller: ctl, autofocus: true, textCapitalization: TextCapitalization.words),
          const Gap(AppSpace.s4),
          AppButton(label: 'Save', cta: true, block: true, onPressed: () async {
            final n = ctl.text.trim();
            if (n.isNotEmpty) await _save(ref, p.copyWith(name: n));
            if (ctx.mounted) Navigator.pop(ctx);
          }),
        ]));
    ctl.dispose();
  }

  Future<void> _editBirth(BuildContext context, WidgetRef ref, Pet p) async {
    final d = await showDatePicker(context: context, initialDate: DateTime.parse(p.birth), firstDate: DateTime.now().subtract(const Duration(days: 365 * 30)), lastDate: DateTime.now(), helpText: 'Date of birth (or an estimate)');
    if (d != null) await _save(ref, p.copyWith(birth: isoDay(d)));
  }

  Future<void> _editBreed(BuildContext context, WidgetRef ref, Pet p) async {
    var breed = p.breed;
    var size = p.sizeCat;
    final breeds = ref.read(referenceProvider).breeds;
    await showAppSheet<void>(context, title: 'Breed', builder: (ctx) => StatefulBuilder(builder: (ctx, set) {
          final known = breed.isEmpty ? null : ref.calc.breedSize(breed);
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            BreedField(breeds: breeds, value: breed, onChanged: (v) => set(() => breed = v)),
            Text('We use it for the growth curve and usual adult weight. Mixed breed or not sure? Leave it blank.', style: ctx.text.bodySmall),
            if (known == null) FieldBlock(label: 'Expected adult size', child: SizeSelect(value: size ?? 'IV', onChanged: (v) => set(() => size = v))),
            const Gap(AppSpace.s4),
            AppButton(label: 'Save', cta: true, block: true, onPressed: () async {
              await _save(ref, p.copyWith(breed: breed.trim(), sizeCat: size ?? p.sizeCat));
              if (ctx.mounted) Navigator.pop(ctx);
            }),
          ]);
        }));
  }

  Future<void> _editActivity(BuildContext context, WidgetRef ref, Pet p, PetView view) async {
    final opts = view.summary.activityOptions;
    if (opts.isEmpty) return;
    await showAppSheet<void>(context, title: 'How active are they?', builder: (ctx) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('A rough guess is fine. Busy pets burn more energy, so we adjust their daily kcal.', style: ctx.text.bodySmall),
          const Gap(AppSpace.s3),
          InsetSection(children: [
            for (final o in opts)
              RowTile(title: o.label, subtitle: o.sub, trailing: o.label == view.summary.activityLabel ? Icon(Icons.check, color: ctx.colors.primary) : null, onTap: () async {
                await _save(ref, p.copyWith(exerciseMin: o.exerciseMin, activity: o.activity, answered: {...p.answered, 'activity': true}));
                if (ctx.mounted) Navigator.pop(ctx);
              }),
          ]),
        ]));
  }

  Future<void> _pickOne(BuildContext context, WidgetRef ref, Pet p, String title, String why, List<(String, String)> options, String current, Pet Function(String) apply) async {
    await showAppSheet<void>(context, title: title, builder: (ctx) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(why, style: ctx.text.bodySmall),
          const Gap(AppSpace.s3),
          InsetSection(children: [
            for (final (v, l) in options)
              RowTile(title: l, trailing: v == current ? Icon(Icons.check, color: ctx.colors.primary) : null, onTap: () async {
                HapticFeedback.selectionClick();
                await _save(ref, apply(v));
                if (ctx.mounted) Navigator.pop(ctx);
              }),
          ]),
        ]));
  }

  Future<void> _pickMany(BuildContext context, WidgetRef ref, Pet p, String title, String why, List<(String, String)> options, Set<String> current, Pet Function(Set<String>) apply) async {
    final sel = {...current};
    await showAppSheet<void>(context, title: title, builder: (ctx) => StatefulBuilder(builder: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(why, style: ctx.text.bodySmall),
          const Gap(AppSpace.s3),
          ChoiceWrap<String>(options: options, selected: sel, onToggle: (v) => set(() => sel.contains(v) ? sel.remove(v) : sel.add(v))),
          const Gap(AppSpace.s4),
          AppButton(label: 'Save', cta: true, block: true, onPressed: () async {
            await _save(ref, apply(sel));
            if (ctx.mounted) Navigator.pop(ctx);
          }),
        ])));
  }

  Future<void> _aboutBreed(BuildContext context, WidgetRef ref, Pet p) async {
    final b = ref.read(referenceProvider).breeds.where((x) => x.name == p.breed).firstOrNull;
    await showAppSheet<void>(context, title: 'About the ${p.breed}', builder: (ctx) => Text(b == null ? 'No details for this breed yet.' : 'Adults usually weigh about ${b.min.round()} to ${b.max.round()} kg. Breed does not set daily calories: they come from weight, age, neutering and activity.', style: ctx.text.bodyLarge));
  }

  Future<void> _confirm(BuildContext context, String title, String text, Future<void> Function() go) async {
    final ok = await showAdaptiveDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog.adaptive(title: Text(title), content: Text(text), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete'))]),
    );
    if (ok == true) await go();
  }
}

/// The pet at the top of Profile: a yellow card with the pet peeking up, the name and three quick facts.
class _Hero extends ConsumerWidget {
  const _Hero({required this.view});
  final PetView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = view.pet;
    final unit = ref.watch(settingsProvider).unit;
    final w = unit == 'lb' ? '${(p.weightKg * 2.20462).toStringAsFixed(1)} lb' : '${(p.weightKg * 10).round() / 10} kg';
    final img = p.species == Species.cat ? (view.growing ? 'cut-kitten' : 'cut-cat') : (view.growing ? 'cut-puppy' : 'cut-beagle');
    final kcal = view.target?.kcal ?? view.plan.kcal.round();
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: AppColors.brandYellow, borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(AppSpace.s4),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p.name, style: context.text.headlineMedium!.copyWith(color: AppColors.brandInk)),
              Text(p.species == Species.dog ? (p.breed.isEmpty ? 'Mixed breed' : p.breed) : 'Cat', style: context.text.bodyMedium!.copyWith(color: AppColors.brandInk)),
              const Gap(AppSpace.s3),
              Wrap(spacing: AppSpace.s2, runSpacing: AppSpace.s2, children: [for (final t in [ageLabel(view.summary.ageMonths), w, '$kcal kcal']) Container(padding: const EdgeInsets.symmetric(horizontal: AppSpace.s3, vertical: 6), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(AppRadius.pill)), child: Text(t, style: context.text.labelMedium!.copyWith(color: AppColors.brandInk)))]),
            ]),
          ),
        ),
        Image.asset('assets/images/$img.webp', height: 130, errorBuilder: (_, __, ___) => const SizedBox(height: 130)),
      ]),
    );
  }
}
