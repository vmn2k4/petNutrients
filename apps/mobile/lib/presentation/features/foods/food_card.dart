import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../../domain/domain.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/inset_list.dart';
import '../../widgets/status_badge.dart';
import '../diet/add_food_sheet.dart';

/// A food in a list. Tapping opens its detail.
class FoodCard extends StatelessWidget {
  const FoodCard({super.key, required this.food, this.compact = false, this.footer});
  final Food food;
  final bool compact;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final f = food;
    final facts = <String>[
      if (f.protein != null) 'Protein ${f.protein!.toStringAsFixed(0)}%',
      if (f.fat != null) 'Fat ${f.fat!.toStringAsFixed(0)}%',
      if (!compact && f.kcalPerKg != null) '${f.kcalPerKg!.round()} kcal/kg',
    ];
    return AppCard(
      tight: true,
      padding: const EdgeInsets.all(AppSpace.s3),
      onTap: () => context.push('/foods/${Uri.encodeComponent(f.id)}'),
      child: Row(children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: Container(
            width: 76,
            height: 76,
            color: context.colors.surface2,
            padding: const EdgeInsets.all(4),
            child: f.photo == null ? const Icon(Icons.pets_outlined) : Image.network(f.photo!, fit: BoxFit.contain, errorBuilder: (_, __, ___) => const Icon(Icons.pets_outlined)),
          ),
        ),
        const SizedBox(width: AppSpace.s3),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(f.brand, style: context.text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
            Text(f.name, style: context.text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
            if (facts.isNotEmpty) Text(facts.join(' · '), style: context.text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
            if (footer != null) ...[const SizedBox(height: AppSpace.s1), footer!],
          ]),
        ),
      ]),
    );
  }
}


/// A food in the Find food list as one compact row: picture, name, fit, the grams in the bowl, and a round add button.
class FoodRow extends StatelessWidget {
  const FoodRow({super.key, required this.food, required this.rank, this.hasPet = true});
  final Food food;
  final RankedFood rank;
  final bool hasPet;

  @override
  Widget build(BuildContext context) {
    final f = food;
    final r = rank;
    final c = context.colors;
    final k = (r.kcal ?? 1000) / 1000;
    final bits = <String>[
      if (r.protein != null) 'Protein ${(r.protein! * k).round()} g',
      if (r.fat != null) 'Fat ${(r.fat! * k).round()} g',
      if (r.grams != null && f.kcalPerKg != null) '${r.grams!.round()} g a day',
    ];
    final v = r.fit?.verdict;
    return InkWell(
      onTap: () => context.push('/foods/${Uri.encodeComponent(f.id)}'),
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.s3),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: Container(width: 72, height: 88, color: c.surface2, padding: const EdgeInsets.all(5), child: f.photo == null ? const Icon(Icons.pets_outlined) : Image.network(f.photo!, fit: BoxFit.contain, errorBuilder: (_, __, ___) => const Icon(Icons.pets_outlined))),
          ),
          const SizedBox(width: AppSpace.s3),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(f.brand, style: context.text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
              Text(f.name, style: context.text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Wrap(spacing: AppSpace.s2, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                if (v != null) StatusBadge(_verdictText[v] ?? '', state: v, icon: v == 'good' ? PhosphorIconsRegular.checkCircle : PhosphorIconsRegular.warning),
                if (r.top) StatusBadge('Top pick', state: 'good', icon: PhosphorIconsRegular.star),
                if (v == null) Text(hasPet ? 'Fit unknown' : f.format, style: context.text.bodySmall),
              ]),
              if (bits.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(bits.join(' · '), style: context.text.bodySmall, maxLines: 2)),
              if (r.reasons.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 2), child: Text(r.reasons.first, style: context.text.bodySmall!.copyWith(color: c.good), maxLines: 1, overflow: TextOverflow.ellipsis)),
            ]),
          ),
          const SizedBox(width: AppSpace.s2),
          AddButton(label: 'Add to diet', onPressed: () => showChangeDietSheet(context, kind: f.isTreat ? DietKind.treat : DietKind.food, prefill: f)),
        ]),
      ),
    );
  }
}

const _verdictText = {'good': 'Meets targets', 'caution': 'Check details', 'bad': 'Not a fit'};

/// A food in the Find food list, like the website's card: picture, fit and top-pick badges, why it matched, the grams in the pet's bowl,
/// the first warning, then Add to diet and Buy.
class RankedFoodCard extends StatelessWidget {
  const RankedFoodCard({super.key, required this.food, required this.rank, this.hasPet = true});
  final Food food;
  final RankedFood rank;
  final bool hasPet;

  @override
  Widget build(BuildContext context) {
    final f = food;
    final r = rank;
    final c = context.colors;
    final k = (r.kcal ?? 1000) / 1000;
    final tail = r.kcal != null ? 'in the daily bowl' : 'in a 1,000 kcal day';
    String g(double? v) => v == null ? 'not reported' : '${(v * k).round()} g';
    final stats = <(String, String)>[
      ('Protein', g(r.protein)),
      ('Fat', g(r.fat)),
      if ((r.grams ?? r.gramsRef) != null && f.kcalPerKg != null) (r.kcal != null ? 'Food per day' : 'Food for that', '${(r.grams ?? r.gramsRef)!.round()} g'),
      if (f.kcalPerKg != null) ('Energy', '${(f.kcalPerKg! / 10).round()} kcal/100 g'),
      if (r.cost != null) ('Cost', '\$${r.cost!.toStringAsFixed(2)}/day'),
    ];
    final warn = r.fit?.warn.firstOrNull;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      AppCard(
        padding: const EdgeInsets.all(AppSpace.s4),
        onTap: () => context.push('/foods/${Uri.encodeComponent(f.id)}'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: Container(width: 84, height: 100, color: c.surface2, padding: const EdgeInsets.all(6), child: f.photo == null ? const Icon(Icons.pets_outlined) : Image.network(f.photo!, fit: BoxFit.contain, errorBuilder: (_, __, ___) => const Icon(Icons.pets_outlined))),
            ),
            const SizedBox(width: AppSpace.s3),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(f.name, style: context.text.titleMedium, maxLines: 3, overflow: TextOverflow.ellipsis),
                const SizedBox(height: AppSpace.s1),
                const SizedBox(height: AppSpace.s1),
                Text('${f.brand}, ${f.species}', style: context.text.bodySmall),
                Text(f.reviews > 0 ? '${f.rating} (${f.reviews} reviews)' : 'No reviews yet', style: context.text.bodySmall),
              ]),
            ),
          ]),
          const SizedBox(height: AppSpace.s3),
          Row(children: [
            Expanded(child: Align(alignment: Alignment.centerLeft, child: r.fit != null ? StatusBadge(_verdictText[r.fit!.verdict] ?? '', state: r.fit!.verdict, icon: r.fit!.verdict == 'good' ? PhosphorIconsRegular.checkCircle : PhosphorIconsRegular.warning) : StatusBadge(hasPet ? 'Fit unknown' : 'Add your pet for fit'))),
            const SizedBox(width: AppSpace.s2),
            Expanded(child: Align(alignment: Alignment.centerRight, child: r.top ? StatusBadge('Top pick', state: 'good', icon: PhosphorIconsRegular.star) : StatusBadge(f.format, state: 'info'))),
          ]),
          if (r.reasons.isNotEmpty) ...[
            const SizedBox(height: AppSpace.s3),
            for (final x in r.reasons) Padding(padding: const EdgeInsets.only(bottom: 4), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(PhosphorIconsRegular.checkCircle, size: 20, color: c.good), const SizedBox(width: AppSpace.s2), Expanded(child: Text(x, style: context.text.bodyMedium))])),
          ],
          const SizedBox(height: AppSpace.s2),
          for (final (label, v) in stats) Container(padding: const EdgeInsets.symmetric(vertical: 7), decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))), child: Row(children: [Expanded(child: Text(label, style: context.text.bodyMedium!.copyWith(color: c.fgMuted))), Text(v, style: v == 'not reported' ? context.text.bodySmall : context.text.titleSmall)])),
          Text('Protein and fat $tail.', style: context.text.bodySmall),
          if (r.guideText != null) Padding(padding: const EdgeInsets.only(top: AppSpace.s2), child: Text("Maker's guide for ${r.guideLabel}: ${r.guideText}", style: context.text.bodySmall)),
          if (warn != null) Padding(padding: const EdgeInsets.only(top: AppSpace.s2), child: Text(warn.text, style: context.text.bodySmall!.copyWith(color: warn.level == 'bad' ? c.bad : c.caution), maxLines: 3, overflow: TextOverflow.ellipsis)),
        ]),
      ),
      const SizedBox(height: AppSpace.s2),
      AppButton(label: 'Add to diet', icon: PhosphorIconsRegular.plus, cta: true, block: true, onPressed: () => showChangeDietSheet(context, kind: f.isTreat ? DietKind.treat : DietKind.food, prefill: f)),
      if (f.buyUrl != null) Align(alignment: Alignment.centerLeft, child: TextButton.icon(onPressed: () => launchUrl(Uri.parse(f.buyUrl!), mode: LaunchMode.externalApplication), icon: Icon(PhosphorIconsRegular.shoppingCart, size: 18), label: Text('Buy at ${f.buyRetailer ?? 'a retailer'}'))),
    ]);
  }
}
