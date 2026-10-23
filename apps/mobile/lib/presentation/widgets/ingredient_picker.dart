import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';
import '../../domain/domain.dart';

String ingredientLabel(Ingredient i) => '${i.name}${i.state == 'raw' ? ' (raw)' : i.state == 'cooked' ? ' (cooked)' : i.state == 'canned' ? ' (canned)' : ''}';

/// One ingredient row: tap to open a searchable list grouped like the website (Meat, Vegetables, ...).
class IngredientPicker extends StatelessWidget {
  const IngredientPicker({super.key, required this.value, required this.lib, required this.labelOf, required this.onPick});
  final Ingredient value;
  final List<Ingredient> lib;
  final String Function(Ingredient) labelOf;
  final ValueChanged<Ingredient> onPick;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () async {
        final r = await showModalBottomSheet<Ingredient>(
          context: context,
          isScrollControlled: true,
          showDragHandle: true,
          useSafeArea: true,
          builder: (ctx) => IngredientList(lib: lib, labelOf: labelOf),
        );
        if (r != null) onPick(r);
      },
      child: InputDecorator(
        decoration: const InputDecoration(suffixIcon: Icon(Icons.arrow_drop_down)),
        child: Text(labelOf(value), maxLines: 2, overflow: TextOverflow.ellipsis),
      ),
    );
  }
}

class IngredientList extends StatefulWidget {
  const IngredientList({super.key, required this.lib, required this.labelOf});
  final List<Ingredient> lib;
  final String Function(Ingredient) labelOf;

  @override
  State<IngredientList> createState() => IngredientListState();
}

class IngredientListState extends State<IngredientList> {
  String q = '';

  @override
  Widget build(BuildContext context) {
    final words = q.toLowerCase().split(' ').where((w) => w.isNotEmpty);
    final list = widget.lib.where((i) => words.every((w) => '${i.group} ${widget.labelOf(i)}'.toLowerCase().contains(w))).toList();
    final groups = <String>[];
    for (final i in list) {
      if (!groups.contains(i.group)) groups.add(i.group);
    }
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Column(children: [
        Padding(padding: const EdgeInsets.fromLTRB(AppSpace.s4, 0, AppSpace.s4, AppSpace.s2), child: TextField(autofocus: true, decoration: const InputDecoration(hintText: 'Search, like chicken or rice', prefixIcon: Icon(Icons.search)), onChanged: (v) => setState(() => q = v))),
        Expanded(
          child: ListView(children: [
            for (final g in groups) ...[
              Padding(padding: const EdgeInsets.fromLTRB(AppSpace.s4, AppSpace.s3, AppSpace.s4, AppSpace.s1), child: Text(g, style: context.text.labelMedium!.copyWith(color: context.colors.fgMuted))),
              for (final i in list.where((x) => x.group == g)) ListTile(dense: true, title: Text(widget.labelOf(i)), onTap: () => Navigator.pop(context, i)),
            ],
            if (list.isEmpty) Padding(padding: const EdgeInsets.all(AppSpace.s5), child: Text('No ingredient matches.', style: context.text.bodyMedium)),
          ]),
        ),
      ]),
    );
  }
}
