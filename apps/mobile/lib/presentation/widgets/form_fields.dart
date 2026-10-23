import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';
import '../../domain/domain.dart';
import 'chips.dart';
import 'sheet.dart';

/// Breed search: type to filter the list; leave empty for a mixed breed.
class BreedField extends StatelessWidget {
  const BreedField({super.key, required this.breeds, required this.value, required this.onChanged});
  final List<Breed> breeds;
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Autocomplete<String>(
      initialValue: TextEditingValue(text: value),
      optionsBuilder: (v) {
        final words = v.text.toLowerCase().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
        if (words.isEmpty) return breeds.take(40).map((b) => b.name);
        return breeds.map((b) => b.name).where((n) => words.every((w) => n.toLowerCase().contains(w))).take(40);
      },
      onSelected: onChanged,
      fieldViewBuilder: (ctx, ctl, focus, submit) => TextField(
        controller: ctl,
        focusNode: focus,
        decoration: const InputDecoration(hintText: 'Start typing, like Labrador'),
        onChanged: (t) => onChanged(breeds.any((b) => b.name == t) ? t : ''),
      ),
      optionsViewBuilder: (ctx, onSelected, options) => Align(
        alignment: Alignment.topLeft,
        child: Material(
          elevation: 4,
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 260, maxWidth: 520),
            child: ListView(shrinkWrap: true, padding: EdgeInsets.zero, children: [for (final o in options) ListTile(dense: true, title: Text(o), onTap: () => onSelected(o))]),
          ),
        ),
      ),
    );
  }
}

/// A date shown as text; tapping opens the date picker.
class DateField extends StatelessWidget {
  const DateField({super.key, required this.value, required this.onChanged, this.hint = 'Pick a date', this.firstYearsAgo = 30});
  final String value;
  final ValueChanged<String> onChanged;
  final String hint;
  final int firstYearsAgo;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () async {
        final now = DateTime.now();
        final initial = value.isEmpty ? now.subtract(const Duration(days: 180)) : DateTime.parse(value);
        final d = await showDatePicker(context: context, initialDate: initial, firstDate: DateTime(now.year - firstYearsAgo), lastDate: now, helpText: hint);
        if (d != null) onChanged(isoDay(DateTime.utc(d.year, d.month, d.day)));
      },
      child: InputDecorator(
        decoration: const InputDecoration(suffixIcon: Icon(Icons.calendar_today_outlined, size: 20)),
        child: Text(value.isEmpty ? hint : fmtDay(value), style: value.isEmpty ? context.text.bodyLarge!.copyWith(color: context.colors.fgMuted) : context.text.bodyLarge),
      ),
    );
  }
}

/// A weight in kg or lb. The text is what the owner typed; read it with [WeightInput.toKg].
class WeightInput extends StatelessWidget {
  const WeightInput({super.key, required this.controller, required this.unit, required this.onUnit});
  final TextEditingController controller;
  final String unit;
  final ValueChanged<String> onUnit;

  static double? toKg(String text, String unit) {
    final v = double.tryParse(text.replaceAll(',', '.'));
    if (v == null || v <= 0) return null;
    return unit == 'lb' ? lbToKg(v) : v;
  }

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(child: TextField(controller: controller, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: 'Current weight'))),
        const SizedBox(width: AppSpace.s3),
        SizedBox(width: 130, child: SegmentTabs<String>(options: const [('kg', 'kg'), ('lb', 'lb')], value: unit, onChanged: onUnit)),
      ]);
}

/// Adult size group, used when no breed is known.
class SizeSelect extends StatelessWidget {
  const SizeSelect({super.key, required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => DropdownButtonFormField<String>(
        initialValue: value,
        isExpanded: true,
        items: [for (final (id, label) in sizeCategories) DropdownMenuItem(value: id, child: Text(label))],
        onChanged: (v) => onChanged(v ?? value),
      );
}

/// Dog or cat.
class SpeciesPicker extends StatelessWidget {
  const SpeciesPicker({super.key, required this.value, required this.onChanged});
  final Species value;
  final ValueChanged<Species> onChanged;

  @override
  Widget build(BuildContext context) => SegmentTabs<Species>(options: const [(Species.dog, 'Dog'), (Species.cat, 'Cat')], value: value, onChanged: onChanged);
}

/// A short form field label + input.
Widget labelled(BuildContext context, String label, Widget child, {String? hint}) => FieldBlock(label: label, hint: hint, child: child);
