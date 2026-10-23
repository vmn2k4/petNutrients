import 'dart:async';

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
import '../../widgets/growth_card.dart' show kgText, thousands;
import '../../widgets/ingredient_picker.dart';
import '../../widgets/labels.dart';
import '../../widgets/page.dart';
import '../../widgets/sheet.dart';
import '../../widgets/typeahead.dart';

const _modes = [('replace', 'Replace a food'), ('add', 'Add a food'), ('amount', 'Change amount'), ('stop', 'Stop a food')];
const _commonSupplements = ['Collagen', 'Turmeric (curcumin)', 'Glucosamine and chondroitin', 'Fish oil (omega-3)', 'Probiotic', 'Digestive enzymes', 'Joint support blend', 'Multivitamin', 'Calcium supplement', 'Vitamin E'];

enum DietKind { food, treat, supplement }

/// The one sheet for every diet change (same as the website): when it changed, what changed, which food (a dropdown of foods that fit
/// this pet, or type any name, or build a homemade mix), how much, how often, and a live calorie line before saving.
Future<void> showChangeDietSheet(BuildContext context, {String mode = 'add', String? itemId, DietKind kind = DietKind.food, Food? prefill}) {
  final title = kind == DietKind.supplement ? 'Add a supplement' : kind == DietKind.treat ? 'Add a treat' : 'Change what they eat';
  return showAppSheet<void>(context, title: title, builder: (_) => _ChangeSheet(mode: mode, itemId: itemId, kind: kind, prefill: prefill));
}

class _ChangeSheet extends ConsumerStatefulWidget {
  const _ChangeSheet({required this.mode, required this.itemId, required this.kind, required this.prefill});
  final String mode;
  final String? itemId;
  final DietKind kind;
  final Food? prefill;

  @override
  ConsumerState<_ChangeSheet> createState() => _ChangeSheetState();
}

class _ChangeSheetState extends ConsumerState<_ChangeSheet> {
  late String mode = widget.mode;
  String? itemId;
  String tab = 'food';
  String date = todayStr();
  final foodCtl = TextEditingController();
  final amountCtl = TextEditingController();
  final timesCtl = TextEditingController(text: '2');
  final kcalCtl = TextEditingController();
  final gpcCtl = TextEditingController();
  final mixName = TextEditingController();
  late String unit = widget.kind == DietKind.supplement ? 'scoop' : widget.kind == DietKind.treat ? 'piece' : 'g';
  late String role = widget.kind == DietKind.supplement ? 'supplement' : widget.kind == DietKind.treat ? 'treat' : 'main';
  final mixRows = <({String id, TextEditingController grams})>[];
  DietLive? live;
  String? hint;
  String? error;
  bool saving = false;
  int _seq = 0;
  Timer? _debounce;

  DietKind get kind => widget.kind;

  @override
  void initState() {
    super.initState();
    if (kind == DietKind.treat) timesCtl.text = '1';
    final f = widget.prefill;
    if (f != null) {
      foodCtl.text = f.label;
      WidgetsBinding.instance.addPostFrameCallback((_) => _picked());
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final items = _items;
      if (items.isEmpty && mode != 'add') mode = 'add';
      itemId ??= widget.itemId ?? items.firstOrNull?.id;
      _syncMode();
      _recalc();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    for (final c in [foodCtl, amountCtl, timesCtl, kcalCtl, gpcCtl, mixName]) {
      c.dispose();
    }
    for (final r in mixRows) {
      r.grams.dispose();
    }
    super.dispose();
  }

  Pet get pet => ref.read(petViewProvider)!.pet;
  List<DietItem> get _items => pet.diet.where((d) => d.endedOn == null).toList();
  double _n(TextEditingController c) => double.tryParse(c.text.replaceAll(',', '.')) ?? 0;
  DietItem? get _item => _items.where((i) => i.id == itemId).firstOrNull;

  List<Food> _foodList() {
    final sp = pet.species.name;
    if (kind == DietKind.treat) return [...?ref.read(treatsProvider).value].where((f) => f.species == sp || f.species == 'both').toList();
    return [...?ref.read(regionFoodsProvider).value].where((f) => f.species == sp || f.species == 'both').toList();
  }

  Food? get _hit {
    final t = foodCtl.text.trim().toLowerCase();
    if (t.isEmpty || kind == DietKind.supplement) return null;
    for (final f in _foodList()) {
      if (f.label.toLowerCase() == t) return f;
    }
    return null;
  }

  Food? _foodOf(DietItem? it) {
    if (it?.foodId == null) return null;
    for (final f in [...?ref.read(foodsProvider).value, ...?ref.read(treatsProvider).value]) {
      if (f.id == it!.foodId) return f;
    }
    return null;
  }

  void _syncMode() {
    final it = _item;
    if (mode == 'amount' && it != null) {
      amountCtl.text = kgText(it.amount);
      timesCtl.text = kgText(it.timesPerDay);
    } else if (mode == 'replace' && it != null) {
      role = it.role;
      unit = it.unit;
      if (amountCtl.text.isEmpty) amountCtl.text = kgText(it.amount);
      timesCtl.text = kgText(it.timesPerDay);
    }
    setState(() {});
  }

  /// A food was picked from the dropdown: suggest an amount from the calorie plan (foods) or read out how many fit (treats).
  Future<void> _picked() async {
    final f = _hit;
    if (f == null) {
      _recalc();
      return;
    }
    final calc = ref.read(calcActionsProvider);
    if (kind == DietKind.treat) {
      final h = await calc.treatHint(pet, f);
      if (!mounted) return;
      final each = f.kcalPerTreat != null ? '${(f.kcalPerTreat! * 10).round() / 10} kcal each' : f.kcalPerKg != null ? '${(f.kcalPerKg! / 10).round()} kcal per 100 g, so count in grams' : 'calories not stated, so we cannot count it';
      final count = h.count == 0 ? 'one of these is more than 10% of ${pet.name}\'s day, so it is best as a rare, shared treat' : h.count != null ? '${pet.name} could have up to ${h.count} a day if treats are all they get, 10% of the day' : null;
      setState(() {
        hint = '${f.label}: ${[each, if (count != null) count].join('. ')}.${h.badText == null ? '' : ' Warning: ${h.badText}'}';
        if (f.kcalPerTreat == null && f.kcalPerKg != null) unit = 'g';
      });
    } else if (kind == DietKind.food && f.kcalPerKg != null && amountCtl.text.isEmpty) {
      final sg = await calc.suggestAmount(pet, f);
      if (!mounted || sg == null) return _recalc();
      setState(() {
        amountCtl.text = '${sg.perMeal}';
        unit = 'g';
        timesCtl.text = '${sg.meals}';
        hint = 'Suggested from ${pet.name}\'s calorie plan (about ${sg.kcal.round()} kcal a day): ${sg.perMeal} g, ${sg.meals} times a day. Change it if the bag or your vet says otherwise.';
      });
    }
    _recalc();
  }

  void _recalc() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 200), () async {
      if (!mounted || kind == DietKind.supplement) return;
      final it = _item;
      final m = mode;
      final unitNow = m == 'amount' && it != null ? it.unit : unit;
      final mine = ++_seq;
      final hit = m != 'amount' ? _hit : null;
      final v = await ref.read(calcActionsProvider).dietLive(pet, {
        'mode': m,
        'hit': hit?.toCalc(),
        'item': m == 'amount' ? it?.toCalc() : null,
        'itemFood': m == 'amount' ? _foodOf(it)?.toCalc() : null,
        'unit': unit,
        'amount': _n(amountCtl),
        'times': _n(timesCtl),
        'kcalTyped': kcalCtl.text.isEmpty ? null : _n(kcalCtl),
        'gpc': gpcCtl.text.isEmpty ? null : _n(gpcCtl),
      });
      if (!mounted || mine != _seq) return;
      setState(() {
        live = v;
        if (tab == 'food' && m != 'amount' && v.allowed != null && !v.allowed!.contains(unit)) unit = v.unit;
        if (unitNow != unit && m == 'amount') unit = unitNow;
      });
    });
  }

  Future<void> _save() async {
    setState(() => error = null);
    final it = _item;
    final amount = _n(amountCtl), times = _n(timesCtl);
    final notifier = ref.read(petsProvider.notifier);
    setState(() => saving = true);
    String? msg;
    if (mode == 'stop') {
      if (it == null) return _fail('Pick the food that stopped.');
      msg = await notifier.changeDiet(date: date, stops: [it.id]);
    } else if (mode == 'amount') {
      if (it == null) return _fail('Pick the food.');
      if (!(amount > 0) || !(times > 0)) return _fail('Enter an amount and how many times a day.');
      msg = await notifier.changeDiet(date: date, stops: [it.id], starts: [DietStart(foodName: it.foodName, foodId: it.foodId, role: it.role, amount: amount, unit: it.unit, timesPerDay: times, replacesId: it.id, kcalPerKg: it.kcalPerKg, kcalPerUnit: it.kcalPerUnit, recipe: it.recipe)]);
    } else {
      final typed = foodCtl.text.trim();
      final hit = _hit;
      final mix = tab == 'mix';
      MixResult? analysis;
      if (mix) {
        analysis = _mixAnalysis();
        if (analysis == null || analysis.grams <= 0) return _fail('Add at least one ingredient with its grams.');
      } else if (typed.isEmpty) {
        return _fail('Add the name of the new food.');
      }
      if (!(amount > 0) && !mix) return _fail('Enter how much each time.');
      if (!(times > 0)) return _fail('Enter how many times a day.');
      double? cupKcal;
      if (kind != DietKind.supplement) {
        final chk = await ref.read(calcActionsProvider).entryCheck(hit, unit: mix ? 'g' : unit, kcalTyped: kcalCtl.text.isEmpty ? null : kcalCtl.text, gpc: gpcCtl.text.isEmpty ? null : gpcCtl.text, mix: mix);
        if (!chk.ok) return _fail(chk.message ?? 'Check the calories.');
        cupKcal = chk.cupKcal;
      }
      final kHas = kcalCtl.text.isNotEmpty && !mix;
      final lib = ref.read(ingredientsProvider);
      final start = DietStart(
        foodName: mix ? (mixName.text.trim().isEmpty ? 'Homemade mix' : mixName.text.trim()) : (hit?.label ?? typed),
        foodId: mix ? null : hit?.id,
        role: role,
        amount: mix ? analysis!.grams.roundToDouble() : amount,
        unit: mix ? 'g' : unit,
        timesPerDay: times,
        replacesId: mode == 'replace' ? it?.id : null,
        kcalPerKg: mix ? analysis!.kcalPerKg : (kHas && unit == 'g' ? _n(kcalCtl) * 10 : null),
        kcalPerUnit: cupKcal ?? (kHas && unit != 'g' ? _n(kcalCtl) : null),
        recipe: mix ? [for (final r in mixRows) if (_n(r.grams) > 0) RecipeLine(id: r.id, name: lib.firstWhere((x) => x.id == r.id).name, grams: _n(r.grams))] : null,
      );
      msg = await notifier.changeDiet(date: date, stops: mode == 'replace' && it != null ? [it.id] : const [], starts: [start]);
    }
    if (!mounted) return;
    if (msg != null) return _fail(msg);
    HapticFeedback.mediumImpact();
    Navigator.pop(context);
    showToast(context, mode == 'stop' ? 'Food stopped' : 'Diet updated');
  }

  void _fail(String m) => setState(() {
        error = m;
        saving = false;
      });

  MixResult? _mixAnalysis() {
    final grams = <String, double>{};
    for (final r in mixRows) {
      final g = _n(r.grams);
      if (g > 0) grams[r.id] = (grams[r.id] ?? 0) + g;
    }
    return grams.isEmpty ? null : ref.calc.mix(pet, grams);
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(context: context, initialDate: DateTime.parse(date), firstDate: DateTime.parse(pet.birth), lastDate: DateTime.now());
    if (d != null) setState(() => date = isoDay(d));
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    final adding = mode == 'add' || mode == 'replace';
    final showForm = mode != 'stop';
    final isFood = kind == DietKind.food;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (isFood) ...[
        Text('What changed?', style: context.text.titleSmall),
        const Gap(AppSpace.s2),
        Wrap(spacing: AppSpace.s2, runSpacing: AppSpace.s2, children: [
          for (final (v, l) in _modes)
            if (items.isNotEmpty || v == 'add') ToggleChip(label: l, selected: mode == v, onTap: () {
                  mode = v;
                  _syncMode();
                  _recalc();
                }),
        ]),
        const Gap(AppSpace.s4),
      ],
      if (isFood && (mode == 'replace' || mode == 'amount' || mode == 'stop') && items.isNotEmpty) ...[
        FieldBlock(
          label: 'Which food?',
          child: DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: itemId,
            items: [for (final i in items) DropdownMenuItem(value: i.id, child: Text('${i.foodName} (${kgText(i.amount)} ${unitWords(i.unit, i.amount)} × ${kgText(i.timesPerDay)})', overflow: TextOverflow.ellipsis))],
            onChanged: (v) {
              itemId = v;
              _syncMode();
              _recalc();
            },
          ),
        ),
      ],
      if (isFood && adding)
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.s4),
          child: SegmentTabs<String>(options: const [('food', 'Choose a food'), ('mix', 'Select ingredients')], value: tab, onChanged: (v) {
            setState(() {
              tab = v;
              error = null;
              if (v == 'mix' && mixRows.isEmpty) _addRow();
            });
          }),
        ),
      if (adding && tab == 'food') _foodField(context),
      if (adding && tab == 'mix') _mixBlock(context),
      if (hint != null && adding && tab == 'food') Padding(padding: const EdgeInsets.only(bottom: AppSpace.s3), child: Text(hint!, style: context.text.bodySmall)),
      if (showForm && (mode == 'amount' || tab == 'food')) _amountRow(context),
      if (showForm && live?.hasOut == true && kind != DietKind.supplement) _livePanel(context),
      if (adding && tab == 'food' && live?.needGrams == true && isFood)
        FieldBlock(label: 'About how many grams in one cup?', hint: 'We have no cup size for this food. Weigh a level cup of it, or give your best guess (dry food is often 100 to 130 g a cup).', child: TextField(controller: gpcCtl, keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => _recalc())),
      if (adding && tab == 'food' && kind != DietKind.supplement) _kcalField(context),
      if (adding && tab == 'food' && isFood || (adding && tab == 'mix'))
        FieldBlock(label: 'This is their', child: DropdownButtonFormField<String>(initialValue: role, items: [for (final e in dietRoles.entries) DropdownMenuItem(value: e.key, child: Text(e.value))], onChanged: (v) => setState(() => role = v ?? role))),
      if (kind == DietKind.supplement) Padding(padding: const EdgeInsets.only(bottom: AppSpace.s3), child: Text('A supplement is listed but not counted in the calories. Ask your vet before starting one, especially if your pet takes medicine.', style: context.text.bodySmall)),
      if (mode == 'replace') Padding(padding: const EdgeInsets.only(bottom: AppSpace.s3), child: Text('Most pets do better switching slowly over about a week, mixing the old and new food. Add the new food first and stop the old one a few days later if you are mixing.', style: context.text.bodySmall)),
      FieldBlock(
        label: 'When did it change?',
        hint: 'Today, or the day it really changed.',
        child: OutlinedButton.icon(onPressed: _pickDate, icon: Icon(PhosphorIconsRegular.calendarBlank), label: Text(date == todayStr() ? 'Today · ${fmtDay(date)}' : fmtDay(date))),
      ),
      ErrorText(error),
      Row(children: [
        Expanded(child: AppButton(label: 'Cancel', variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(context))),
        const SizedBox(width: AppSpace.s3),
        Expanded(flex: 2, child: AppButton(label: 'Save change', icon: PhosphorIconsRegular.check, cta: true, block: true, loading: saving, onPressed: _save)),
      ]),
    ]);
  }

  Widget _foodField(BuildContext context) {
    final String label, hintText;
    final List<String> options;
    switch (kind) {
      case DietKind.supplement:
        final sups = [...?ref.read(supplementsProvider).value].where((s) => s.species == pet.species.name || s.speciesAll?.contains(pet.species.name) == true).map((s) => s.label).toList();
        options = [...sups, ..._commonSupplements.where((n) => !sups.any((s) => s.toLowerCase() == n.toLowerCase()))];
        label = 'Supplement';
        hintText = 'Pick one or type any supplement';
      case DietKind.treat:
        options = [for (final f in _foodList()) f.label];
        label = 'Treat';
        hintText = 'Pick a treat or type any treat';
      case DietKind.food:
        options = [for (final f in _foodList()) f.label];
        label = mode == 'replace' ? 'New food' : 'Food';
        hintText = 'Pick from the list or type any food';
    }
    return FieldBlock(
      label: label,
      hint: 'Not in the list? Just type the name.',
      child: TypeaheadField(controller: foodCtl, options: options, hint: hintText, onChanged: (_) => _picked()),
    );
  }

  Widget _amountRow(BuildContext context) {
    final isAmount = mode == 'amount';
    final it = _item;
    final allowed = (isAmount ? null : live?.allowed) ?? dietUnits.keys.toList();
    final unitShown = isAmount && it != null ? it.unit : (allowed.contains(unit) ? unit : allowed.first);
    final amountLabel = kind == DietKind.treat ? 'How many each time' : kind == DietKind.supplement ? 'How much each time' : 'How much each meal';
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      FieldBlock(label: amountLabel, child: TextField(controller: amountCtl, keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => _recalc())),
      Row(children: [
        if (!isAmount)
          Expanded(
            child: FieldBlock(
              label: 'Unit',
              child: DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: allowed.contains(unitShown) ? unitShown : null,
                items: [for (final u in allowed) DropdownMenuItem(value: u, child: Text(u == 'piece' && live?.pieceName != null ? live!.pieceName! : (dietUnits[u] ?? u)))],
                onChanged: (v) {
                  setState(() => unit = v ?? unit);
                  _recalc();
                },
              ),
            ),
          ),
        if (!isAmount) const SizedBox(width: AppSpace.s3),
        Expanded(child: FieldBlock(label: 'Times a day', child: TextField(controller: timesCtl, keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => _recalc()))),
      ]),
    ]);
  }

  Widget _livePanel(BuildContext context) {
    final v = live!;
    final c = context.colors;
    final src = v.source == 'label' ? 'from the label' : v.source == 'estimate' ? 'an estimate (about ${v.margin ?? 15}% either way): the maker does not state calories' : v.source == 'yours' ? 'from your number' : '';
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpace.s4),
      padding: const EdgeInsets.all(AppSpace.s4),
      decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${thousands(v.kcalDay!)} kcal a day', style: context.text.titleLarge),
          const SizedBox(width: AppSpace.s3),
          Text('${thousands(v.kcalMeal!)} kcal a meal', style: context.text.bodyMedium),
        ]),
        const Gap(AppSpace.s1),
        Text('${kgText((v.dayAmount ?? 0).toDouble())} ${unitWords(v.unit, v.dayAmount ?? 0)} a day${v.pct == null ? '' : ' · ${v.pct}% of ${pet.name}\'s goal'}${src.isEmpty ? '' : ' · $src'}. You can change the calories below.', style: context.text.bodySmall),
      ]),
    );
  }

  Widget _kcalField(BuildContext context) {
    final unitNow = mode == 'amount' ? (_item?.unit ?? unit) : unit;
    final label = unitNow == 'g' ? 'Calories in it, kcal per 100 g (optional)' : 'Calories in one ${dietUnits[unitNow] ?? unitNow}, kcal (optional)';
    final v = live;
    final ph = v?.placeholder;
    return FieldBlock(
      label: label,
      hint: _hit != null
          ? (v?.needGrams == true ? 'Calories come from the label per gram and your cup weight.' : v?.hasLabel == true ? 'From the label: $ph kcal per ${unitNow == 'g' ? '100 g' : unitNow}. Check it against your bag; leave blank to use it.' : 'No calories for this food per ${unitNow == 'g' ? 'gram' : unitNow}. Enter your own.')
          : 'Only if the food is not in our list, or you know better than the label. Making your own food? Use "Select ingredients".',
      child: TextField(controller: kcalCtl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(hintText: ph == null ? null : '$ph (from the label)'), onChanged: (_) => _recalc()),
    );
  }

  void _addRow() {
    final lib = ref.read(ingredientsProvider);
    final first = lib.firstWhere((x) => x.id == 'chicken-breast-raw', orElse: () => lib.first);
    mixRows.add((id: first.id, grams: TextEditingController()));
  }

  Widget _mixBlock(BuildContext context) {
    final lib = ref.watch(ingredientsProvider);
    final byLabel = {for (final i in lib) ingredientLabel(i): i};
    final a = _mixAnalysis();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      FieldBlock(label: 'Name (optional)', child: TextField(controller: mixName, decoration: const InputDecoration(hintText: 'Homemade mix'))),
      Text('Ingredients and grams in one meal', style: context.text.titleSmall),
      const Gap(AppSpace.s2),
      for (var i = 0; i < mixRows.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.s2),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              flex: 3,
              child: IngredientPicker(
                key: ValueKey('${mixRows[i].grams.hashCode}'),
                value: lib.firstWhere((x) => x.id == mixRows[i].id),
                lib: lib,
                labelOf: ingredientLabel,
                onPick: (ing) => setState(() => mixRows[i] = (id: ing.id, grams: mixRows[i].grams)),
              ),
            ),
            const SizedBox(width: AppSpace.s2),
            SizedBox(width: 84, child: TextField(controller: mixRows[i].grams, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: 'grams'), onChanged: (_) => setState(() {}))),
            if (mixRows.length > 1) IconButton(icon: Icon(PhosphorIconsRegular.trash), tooltip: 'Remove', onPressed: () => setState(() => mixRows.removeAt(i).grams.dispose())),
          ]),
        ),
      Align(alignment: Alignment.centerLeft, child: TextButton.icon(onPressed: () => setState(_addRow), icon: Icon(PhosphorIconsRegular.plus), label: const Text('Add ingredient'))),
      if (byLabel.isEmpty) const SizedBox.shrink(),
      if (a != null && a.grams > 0) ...[
        const Gap(AppSpace.s2),
        Text('One meal: ${a.grams.round()} g, about ${a.kcal.round()} kcal (${(a.kcalPerKg / 10).toStringAsFixed(1)} kcal per 100 g). Next: how many meals a day.', style: context.text.bodyMedium),
        const Gap(AppSpace.s1),
        for (final c in a.checks) Text('${c.state == 'good' ? '✓' : c.state == 'bad' ? '!' : '·'} ${c.label}${c.state == 'unknown' ? ' not verified' : ''}', style: context.text.bodySmall),
        const Gap(AppSpace.s1),
        Text('Nutrients from USDA FoodData Central, per 100 g as listed. Estimates; a complete home diet also needs vitamins and minerals, so ask your vet.', style: context.text.bodySmall),
      ],
      const Gap(AppSpace.s3),
      FieldBlock(label: 'Times a day', child: TextField(controller: timesCtl, keyboardType: const TextInputType.numberWithOptions(decimal: true))),
    ]);
  }
}

