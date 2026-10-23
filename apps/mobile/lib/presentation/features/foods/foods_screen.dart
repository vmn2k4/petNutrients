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
import '../../widgets/chips.dart';
import '../../widgets/page.dart';
import '../../widgets/pet_widgets.dart';
import '../../widgets/sheet.dart' show showToast;
import '../../widgets/states.dart';
import '../../widgets/status_badge.dart';
import 'food_card.dart';

/// The pet foods are matched against: the owner's active pet.
final matchPetProvider = Provider<Pet?>((ref) => ref.watch(petsProvider).value?.active);

const _priorities = [('cost', 'Lower cost'), ('protein', 'High protein'), ('lean', 'Lean (less fat)'), ('fibre', 'Fibre-rich'), ('lighter', 'Lighter food'), ('small', 'Small portions')];
const _quick = [('dry', 'Dry food'), ('wet', 'Wet food'), ('kcal', 'Calories on label'), ('budget', 'Under \$2 a day')];
const _needs = [('joints', 'Joints (glucosamine, chondroitin)'), ('collagen', 'Collagen'), ('omega3', 'Omega-3 (skin and coat)'), ('probiotics', 'Probiotics (gut)'), ('antioxidants', 'Antioxidants (vitamins E, C)')];
const _maxPriorities = 2;
const _page = 12;

/// Find food, like the website: pick up to two priorities, narrow quickly, open "More options" for special needs and allergies, then a
/// ranked list. The server filters, scores and sorts (`rankFoods`); this screen asks and draws.
class FoodsScreen extends ConsumerStatefulWidget {
  const FoodsScreen({super.key, this.species, this.stage});
  final String? species;
  final String? stage;

  @override
  ConsumerState<FoodsScreen> createState() => _FoodsScreenState();
}

class _FoodsScreenState extends ConsumerState<FoodsScreen> {
  late String species;
  final priority = <String>{};
  final quick = <String>{};
  final needs = <String>{};
  bool hideAllergy = true;
  final targets = <String, ({double v, String op})>{};
  String q = '';
  int shown = _page;

  @override
  void initState() {
    super.initState();
    species = widget.species == 'cat' ? 'cat' : 'dog';
  }

  @override
  void didUpdateWidget(FoodsScreen old) {
    super.didUpdateWidget(old);
    if (widget.species != old.species && widget.species != null) species = widget.species == 'cat' ? 'cat' : 'dog';
  }

  /// Every nutrient always has a number: the owner's own, or the ideal for this pet (AAFCO), or the typical value when there is no standard.
  Map<String, ({double v, String op})> _effective(OwnNumbers? own, Map<String, double>? ideal) {
    if (own == null) return const {};
    return {
      for (final e in own.bounds.entries)
        e.key: targets[e.key] ?? (v: (ideal?[e.key] ?? e.value.mid).clamp(e.value.lo, e.value.hi).toDouble(), op: 'about'),
    };
  }

  StateSetter? _sheetSet;
  void _rebuild(VoidCallback f) {
    setState(f);
    _sheetSet?.call(() {});
  }

  void _toggle(Set<String> set, String id, {int? max}) {
    _rebuild(() {
      if (set.contains(id)) {
        set.remove(id);
      } else if (max != null && set.length >= max) {
        showToast(context, 'Pick up to $max. Tap one to remove it first.');
        return;
      } else {
        set.add(id);
      }
      shown = _page;
    });
  }

  @override
  Widget build(BuildContext context) {
    final foods = ref.watch(regionFoodsProvider);
    final treats = ref.watch(treatsProvider);
    final pet = ref.watch(matchPetProvider);
    final pv0 = ref.watch(petViewProvider);
    // Switching pets (the avatar at the top) shows that pet's species and ranks foods for them.
    if (pet != null) species = pet.species.name;
    final matched = pet;
    final region = ref.watch(settingsProvider).region;
    final suggested = matched == null ? const <String>[] : (ref.calc.suggestedNeeds(matched) ?? const <String>[]);
    final searching = q.trim().isNotEmpty;
    final eff = _effective(ref.calc.ownNumbers(species), matched == null ? null : ref.calc.idealPer1000(matched));
    final rank = ref.calc.rankFoods(pet: matched, species: species, region: region, quick: quick.toList(), needs: needs.toList(), priority: priority.toList(), targets: eff, hideAllergy: hideAllergy, limit: searching ? 2000 : shown);
    final byId = {for (final f in [...?foods.value, ...?treats.value]) f.id: f};

    return AppPage(onRefresh: () async => ref.invalidate(foodsProvider), children: [
      if (pv0 != null) AppHeader(view: pv0, title: 'Find food', showFacts: false) else Text('Find food', style: context.text.headlineMedium),
      const Gap(AppSpace.s3),
      if (pet == null) ...[
      SegmentTabs<String>(options: const [('dog', 'Dogs'), ('cat', 'Cats')], value: species, onChanged: (v) => _rebuild(() {
            species = v;
            shown = _page;
          })),
      const Gap(AppSpace.s3),
      ],
      Row(children: [
        Expanded(child: TextField(decoration: const InputDecoration(hintText: 'Search brand or name', prefixIcon: Icon(Icons.search)), onChanged: (v) => _rebuild(() {
              q = v;
              shown = _page;
            }))),
        const SizedBox(width: AppSpace.s2),
        _filterButton(context, matched, suggested, needs.length + targets.length + (matched != null && matched.allergies.isNotEmpty && hideAllergy ? 1 : 0)),
      ]),
      const Gap(AppSpace.s4),
      Row(children: [Expanded(child: Text('What matters most?', style: context.text.titleMedium)), Text('${priority.length} of $_maxPriorities chosen', style: context.text.bodySmall)]),
      const Gap(AppSpace.s2),
      _chipRow([for (final (id, label) in _priorities) ToggleChip(label: label, selected: priority.contains(id), onTap: () => _toggle(priority, id, max: _maxPriorities))]),
      const Gap(AppSpace.s2),
      _chipRow([for (final (id, label) in _quick) ToggleChip(label: label, selected: quick.contains(id), onTap: () => _toggle(quick, id))]),
      const Gap(AppSpace.s4),
      if (foods.isLoading || rank == null)
        const Padding(padding: EdgeInsets.all(AppSpace.s5), child: Center(child: CircularProgressIndicator.adaptive()))
      else
        _results(context, rank, byId, matched, searching),
    ]);
  }

  /// One scrolling row of chips, so the list of foods is not pushed down the screen.
  Widget _chipRow(List<Widget> chips) => SizedBox(
        height: AppSize.touchMin + 4,
        child: ListView(scrollDirection: Axis.horizontal, children: [for (final c in chips) Padding(padding: const EdgeInsets.only(right: AppSpace.s2), child: c)]),
      );

  Widget _filterButton(BuildContext context, Pet? pet, List<String> suggested, int on) {
    final c = context.colors;
    return Badge(
      isLabelVisible: on > 0,
      label: Text('$on'),
      backgroundColor: c.primary,
      child: Material(
        color: c.surface,
        shape: CircleBorder(side: BorderSide(color: c.border, width: 1.5)),
        child: InkWell(customBorder: const CircleBorder(), onTap: () => _openFilters(context, pet, suggested), child: SizedBox(width: 52, height: 52, child: Icon(PhosphorIconsRegular.slidersHorizontal, color: c.fg))),
      ),
    );
  }

  /// Special needs, allergies and own numbers live in one sheet, so the list stays above the fold.
  Future<void> _openFilters(BuildContext context, Pet? pet, List<String> suggested) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (ctx) => StatefulBuilder(builder: (ctx, set) {
        _sheetSet = set;
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          builder: (ctx, scroll) => ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(AppSpace.s5, 0, AppSpace.s5, AppSpace.s5), children: [
            Text('Filters', style: ctx.text.headlineSmall),
            const Gap(AppSpace.s3),
            _expander(ctx, 'Special needs', needs.length, _needsBody(ctx, suggested)),
            if (pet != null) ...[const Gap(AppSpace.s2), _expander(ctx, 'Allergies to avoid', pet.allergies.isEmpty || !hideAllergy ? 0 : pet.allergies.length, _allergyBody(ctx, pet))],
            const Gap(AppSpace.s2),
            _expander(ctx, 'Your own numbers', targets.length, _numbersBody(ctx, pet)),
            const Gap(AppSpace.s4),
            AppButton(label: 'Show foods', icon: PhosphorIconsRegular.check, cta: true, block: true, onPressed: () => Navigator.pop(ctx)),
          ]),
        );
      }),
    );
    _sheetSet = null;
  }

  /// A collapsed row with a count of what is switched on; tap to open it.
  Widget _expander(BuildContext context, String title, int on, Widget body) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(AppRadius.lg), border: Border.all(color: c.border)),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: AppSpace.s4),
          childrenPadding: const EdgeInsets.fromLTRB(AppSpace.s4, 0, AppSpace.s4, AppSpace.s4),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          title: Row(children: [Text(title, style: context.text.titleSmall), if (on > 0) ...[const SizedBox(width: AppSpace.s2), StatusBadge('$on on', state: 'info')]]),
          children: [body],
        ),
      ),
    );
  }

  Widget _needsBody(BuildContext context, List<String> suggested) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Only foods that include them.', style: context.text.bodySmall),
        const Gap(AppSpace.s2),
        Wrap(spacing: AppSpace.s2, runSpacing: AppSpace.s2, children: [for (final (id, label) in _needs) ToggleChip(label: suggested.contains(id) ? '$label · Suggested' : label, selected: needs.contains(id), onTap: () => _toggle(needs, id))]),
      ]);

  Widget _allergyBody(BuildContext context, Pet pet) {
    if (pet.allergies.isEmpty) return Text('None listed for ${pet.name}. Add allergies in the profile and we hide those foods.', style: context.text.bodySmall);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(spacing: AppSpace.s2, runSpacing: AppSpace.s1, children: [for (final a in pet.allergies) StatusBadge(a, state: 'bad')]),
      SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, title: Text('Hide foods that contain them', style: context.text.bodyMedium), subtitle: Text('from ${pet.name}\'s profile', style: context.text.bodySmall), value: hideAllergy, onChanged: (v) {
        HapticFeedback.selectionClick();
        _rebuild(() => hideAllergy = v);
      }),
    ]);
  }

  /// Draggable grams a day for each nutrient. Numbers are kept per 1,000 kcal (a fair comparison for wet and dry food) and shown as grams a day
  /// for this pet, by scaling with its daily calories. Dragging a slider turns it on; the server ranks the closest foods first.
  Widget _numbersBody(BuildContext context, Pet? pet) {
    final own = ref.calc.ownNumbers(species);
    if (own == null) return const Padding(padding: EdgeInsets.all(AppSpace.s3), child: Center(child: CircularProgressIndicator.adaptive()));
    final pv = ref.watch(petViewProvider);
    final kcalDay = pv?.target?.kcal.toDouble() ?? pv?.plan.kcal; // the daily goal shown everywhere else
    final f = pet != null && kcalDay != null && kcalDay > 0 ? kcalDay / 1000 : 1.0;
    const rows = [('protein', 'Protein'), ('fat', 'Fat'), ('fibre', 'Fibre'), ('calcium', 'Calcium'), ('phosphorus', 'Phosphorus'), ('energy', 'Calories in the food')];
    const presetLabels = [('lose', 'Weight loss'), ('maintain', 'Keep steady'), ('gain', 'Weight gain'), ('grow', 'Growing'), ('active', 'Very active'), ('senior', 'Senior or less active')];
    final eff = _effective(own, pet == null ? null : ref.calc.idealPer1000(pet));
    final unit = f == 1 ? 'g per 1,000 kcal' : 'g a day';
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Start from a suggestion', style: context.text.labelMedium),
      const Gap(AppSpace.s1),
      _chipRow([
        for (final (id, label) in presetLabels)
          if (own.presets[id] != null) ToggleChip(label: label, selected: false, onTap: () => _rebuild(() {
                targets
                  ..clear()
                  ..addEntries([for (final it in own.presets[id]!) if (own.bounds[it.key] != null) MapEntry(it.key, (v: it.v, op: 'about'))]);
                shown = _page;
              })),
      ]),
      const Gap(AppSpace.s2),
      for (final (key, label) in rows)
        if (own.bounds[key] != null) _numberRow(context, key, label, own.bounds[key]!, key == 'energy' ? 1 : f, key == 'energy' ? 'kcal per 100 g' : unit, eff[key]!.v),
      if (targets.isNotEmpty) Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: () => _rebuild(() => targets.clear()), child: const Text('Back to ideal numbers'))),
    ]);
  }

  Widget _numberRow(BuildContext context, String key, String label, NumBound b, double f, String unit, double current) {
    final custom = targets.containsKey(key);
    double r(double v) => (v * f * 10).round() / 10;
    final lo = r(b.lo), hi = r(b.hi);
    final step = f == 1 ? b.step : (b.step * f >= 1 ? 1.0 : 0.1);
    final shownV = r(current).clamp(lo, hi).toDouble();
    final divisions = ((hi - lo) / step).round().clamp(1, 400);
    String fmt(double v) => v == v.roundToDouble() ? '${v.round()}' : v.toStringAsFixed(1);
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.s2),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(child: Text(label, style: context.text.titleSmall)),
          Text('${fmt(shownV)} $unit', style: context.text.titleSmall!.copyWith(color: c.primary)),
          if (custom) TextButton(style: TextButton.styleFrom(minimumSize: const Size(0, 32), padding: const EdgeInsets.symmetric(horizontal: AppSpace.s2)), onPressed: () => _rebuild(() => targets.remove(key)), child: const Text('Back to ideal')),
        ]),
        Slider(
          min: lo,
          max: hi > lo ? hi : lo + step,
          divisions: divisions,
          value: shownV,
          label: fmt(shownV),
          onChanged: (v) => _rebuild(() {
            targets[key] = (v: v / f, op: 'about');
            shown = _page;
          }),
        ),
      ]),
    );
  }

  Widget _results(BuildContext context, RankedFoods r, Map<String, Food> byId, Pet? pet, bool searching) {
    var items = r.items.where((i) => byId.containsKey(i.id)).toList();
    if (searching) {
      final words = q.toLowerCase().split(' ').where((w) => w.isNotEmpty);
      items = items.where((i) => words.every((w) => byId[i.id]!.label.toLowerCase().contains(w))).toList();
    }
    final total = searching ? items.length : r.total;
    if (items.isEmpty) return EmptyState(image: species == 'cat' ? 'cut-cat' : 'cut-beagle', title: 'No foods match, yet', text: 'Try removing a filter.');
    final list = searching ? items.take(shown).toList() : items;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('$total food${total == 1 ? '' : 's'}${pet == null ? '' : ' for ${pet.name}'}', style: context.text.bodySmall),
      const Gap(AppSpace.s3),
      for (final i in list) Padding(padding: const EdgeInsets.only(bottom: AppSpace.s5), child: RankedFoodCard(food: byId[i.id]!, rank: i, hasPet: pet != null)),
      if (total > list.length) AppButton(label: 'Show ${total - list.length < _page ? total - list.length : _page} more (${list.length} of $total)', variant: AppButtonVariant.secondary, block: true, onPressed: () => _rebuild(() => shown += _page)),
      const EstimateNote(),
    ]);
  }
}
