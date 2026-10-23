import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../../domain/domain.dart';
import '../../providers/calc_api.dart';
import '../../providers/providers.dart';
import '../../widgets/app_button.dart';
import '../diet/add_food_sheet.dart';
import '../../widgets/app_card.dart';
import '../../widgets/chips.dart';
import '../../widgets/nutrient_meter.dart';
import '../../widgets/page.dart';
import '../../widgets/states.dart';
import '../../widgets/status_badge.dart';
import 'foods_screen.dart' show matchPetProvider;

/// One food: label nutrients, fit for the pet, ingredients and credit. Missing numbers say "not reported".
class FoodDetailScreen extends ConsumerWidget {
  const FoodDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final all = [...?ref.watch(foodsProvider).value, ...?ref.watch(treatsProvider).value];
    final f = all.where((x) => x.id == id).firstOrNull;
    if (f == null) return Scaffold(appBar: AppBar(), body: ref.watch(foodsProvider).isLoading ? const LoadingView() : const EmptyState(title: 'Food not found', text: 'It may have been removed.'));
    final pet = ref.watch(matchPetProvider);
    final fit = pet == null || pet.species.name != f.species && f.species != 'both' ? null : ref.calc.foodFit(pet, f);
    final region = ref.watch(settingsProvider).region;
    String pct(double? v) => v == null ? 'not reported' : '${v.toStringAsFixed(v < 10 ? 2 : 1)}%';
    final rows = [('Protein', pct(f.protein)), ('Fat', pct(f.fat)), ('Fibre', pct(f.fibre)), ('Moisture', pct(f.moisture)), ('Ash', pct(f.ash)), ('Calcium', pct(f.calcium)), ('Phosphorus', pct(f.phosphorus))];
    final kcal = f.kcalPerKg ?? (f.protein != null ? ref.calc.estimate(f)?.kcalPerKg : null);
    return Scaffold(
      appBar: AppBar(title: Text(f.brand)),
      bottomNavigationBar: fit == null ? null : SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(AppSpace.s4, AppSpace.s2, AppSpace.s4, AppSpace.s2), child: SizedBox(height: AppSize.touchMin + 4, child: AppButton(label: 'Add to diet', icon: PhosphorIconsRegular.plus, cta: true, block: true, onPressed: () => showChangeDietSheet(context, kind: f.isTreat ? DietKind.treat : DietKind.food, prefill: f))))),
      body: AppPage(children: [
        if (f.photo != null) Container(height: 220, decoration: BoxDecoration(color: context.colors.surface2, borderRadius: BorderRadius.circular(AppRadius.lg)), padding: const EdgeInsets.all(AppSpace.s3), child: Image.network(f.photo!, fit: BoxFit.contain, errorBuilder: (_, __, ___) => const SizedBox.shrink())),
        if (f.photo != null) const Gap(AppSpace.s4),
        Text(f.name, style: context.text.headlineMedium),
        const Gap(AppSpace.s3),
        if (fit != null) ...[
          StatusBadge(const {'good': 'Fits your pet', 'caution': 'Check a few things', 'bad': 'Not a fit'}[fit.verdict] ?? '', state: fit.verdict),
          const Gap(AppSpace.s2),
        ] else
          Text('Add your pet to see if this fits.', style: context.text.bodyMedium),
        const Gap(AppSpace.s4),
        _BowlCard(food: f, fit: fit, petName: pet?.name, dailyKcal: ref.watch(petViewProvider)?.plan.kcal, kcalPerKg: kcal, estimated: f.kcalPerKg == null),
        const Gap(AppSpace.s3),
        AppCard(
          padding: EdgeInsets.zero,
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              tilePadding: const EdgeInsets.symmetric(horizontal: AppSpace.s4),
              childrenPadding: const EdgeInsets.fromLTRB(AppSpace.s4, 0, AppSpace.s4, AppSpace.s4),
              title: Text('Label values', style: context.text.titleMedium),
              subtitle: Text('Percent, as printed on the bag', style: context.text.bodySmall),
              children: [
                for (final (k, v) in rows) Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Row(children: [Expanded(child: Text(k)), Text(v, style: v == 'not reported' ? context.text.bodySmall : context.text.titleSmall)])),
                const Divider(),
                Row(children: [const Expanded(child: Text('Calories')), Text(kcal == null ? 'not reported' : '${kcal.round()} kcal/kg${f.kcalPerKg == null ? ' (estimate)' : ''}', style: context.text.titleSmall)]),
                Padding(padding: const EdgeInsets.only(top: AppSpace.s2), child: Text('Labels list minimums and maximums, not exact amounts.${f.calcium == null ? ' Calcium not verified.' : ''}', style: context.text.bodySmall)),
              ],
            ),
          ),
        ),
        if (fit != null && fit.warn.isNotEmpty) ...[
          const Gap(AppSpace.s4),
          Text('Things to check', style: context.text.titleMedium),
          const Gap(AppSpace.s2),
  for (final w in fit.warn) Padding(padding: const EdgeInsets.only(bottom: AppSpace.s2), child: NoticeBanner(state: w.level, title: w.level == 'bad' ? 'Not suitable' : 'Check', text: w.text)),
        ],
        if (f.ingredients.isNotEmpty) ...[
          const Gap(AppSpace.s4),
          Text('Ingredients', style: context.text.titleMedium),
          const Gap(AppSpace.s1),
          Text(f.ingredients.join(', '), style: context.text.bodyMedium),
        ],
        if (f.pricePerKg != null && region != 'US') ...[const Gap(AppSpace.s3), Text('About \$${f.pricePerKg!.toStringAsFixed(2)} CAD per kg', style: context.text.bodyMedium)],
        const Gap(AppSpace.s4),
        if (f.buyUrl != null) AppButton(label: f.buyRetailer == null ? 'Where to buy' : 'View at ${f.buyRetailer}', block: true, variant: AppButtonVariant.secondary, onPressed: () => launchUrl(Uri.parse(f.buyUrl!), mode: LaunchMode.externalApplication)),
        const Gap(AppSpace.s3),
        Text('Numbers come from the maker\'s label${f.credit == null ? '' : '. ${f.credit}'}. Always check the bag, since recipes change.', style: context.text.bodySmall),
        if (f.sourceUrl != null) TextButton(onPressed: () => launchUrl(Uri.parse(f.sourceUrl!), mode: LaunchMode.externalApplication), child: const Text('Source')),
        const EstimateNote(),
      ]),
    );
  }
}

/// What is in each bowl: the nutrients in grams (one day's bowl for this pet, or per 1,000 kcal so wet and dry foods compare), against the AAFCO band.
class _BowlCard extends StatefulWidget {
  const _BowlCard({required this.food, required this.fit, required this.petName, required this.dailyKcal, required this.kcalPerKg, required this.estimated});
  final Food food;
  final FoodFit? fit;
  final String? petName;
  final double? dailyKcal;
  final double? kcalPerKg;
  final bool estimated;

  @override
  State<_BowlCard> createState() => _BowlCardState();
}

class _BowlCardState extends State<_BowlCard> {
  bool bowl = true;

  @override
  Widget build(BuildContext context) {
    final fit = widget.fit;
    final kcalDay = widget.dailyKcal;
    final perKg = widget.kcalPerKg;
    final canBowl = fit != null && kcalDay != null && perKg != null && perKg > 0 && widget.petName != null;
    final showBowl = canBowl && bowl;
    final scale = showBowl ? kcalDay / 1000 : 1.0; // values are grams per 1,000 kcal; a day's bowl is that times kcal / 1000
    final gramsDay = canBowl ? kcalDay / perKg * 1000 : null;
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('What is in each bowl', style: context.text.titleMedium),
        const Gap(AppSpace.s2),
        if (canBowl) ...[
          SegmentTabs<bool>(options: const [(true, 'Daily bowl'), (false, 'Per 1,000 kcal')], value: bowl, onChanged: (v) => setState(() => bowl = v)),
          const Gap(AppSpace.s2),
          Text(showBowl ? '${widget.petName}\'s daily bowl: ${gramsDay!.round()} g a day (${kcalDay.round()} kcal).${widget.estimated ? ' Calories are an estimate.' : ''}' : 'Per 1,000 kcal, so wet and dry foods compare fairly.', style: context.text.bodySmall),
          const Gap(AppSpace.s3),
        ],
        if (fit == null)
          Text('Add your pet to see the grams in each bowl.', style: context.text.bodyMedium)
        else
          for (final k in fit.checks) NutrientMeter(label: k.label, value: k.value == null ? null : k.value! * scale, min: k.min == null ? null : k.min! * scale, max: k.max == null ? null : k.max! * scale, state: k.state),
      ]),
    );
  }
}
