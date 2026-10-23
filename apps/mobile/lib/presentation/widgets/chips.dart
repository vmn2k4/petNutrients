import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';

/// A pill you can switch on and off (filters, priorities, pet switcher).
class ToggleChip extends StatelessWidget {
  const ToggleChip({super.key, required this.label, required this.selected, required this.onTap, this.icon, this.dashed = false});
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;
  final bool dashed;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bg = selected ? c.primary : c.surface;
    final fg = selected ? c.onPrimary : c.fg;
    return Semantics(
      button: true,
      selected: selected,
      child: Material(
        color: bg,
        shape: StadiumBorder(side: BorderSide(color: selected ? c.primary : c.border, width: 1.5)),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: () {
            HapticFeedback.selectionClick();
            onTap();
          },
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: AppSize.touchMin),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.s4),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (icon != null) ...[Icon(icon, size: 18, color: fg), const SizedBox(width: AppSpace.s2)],
                Flexible(child: Text(label, style: context.text.labelLarge!.copyWith(color: fg))),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// A row of equal-width choices (a segmented control).
class SegmentTabs<T> extends StatelessWidget {
  const SegmentTabs({super.key, required this.options, required this.value, required this.onChanged});
  final List<(T, String)> options;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(AppSpace.s1),
      decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Row(children: [
        for (final (v, label) in options)
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                if (v != value) HapticFeedback.selectionClick();
                onChanged(v);
              },
              child: AnimatedContainer(
                duration: AppMotion.fast,
                height: AppSize.touchMin - 4,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: v == value ? c.primary : Colors.transparent, borderRadius: BorderRadius.circular(AppRadius.pill)),
                child: Text(label, textAlign: TextAlign.center, style: context.text.labelMedium!.copyWith(color: v == value ? c.onPrimary : c.fg)),
              ),
            ),
          ),
      ]),
    );
  }
}

/// A group of options that wrap onto lines (single or multiple choice).
class ChoiceWrap<T> extends StatelessWidget {
  const ChoiceWrap({super.key, required this.options, required this.selected, required this.onToggle});
  final List<(T, String)> options;
  final Set<T> selected;
  final ValueChanged<T> onToggle;

  @override
  Widget build(BuildContext context) => Wrap(
        spacing: AppSpace.s2,
        runSpacing: AppSpace.s2,
        children: [for (final (v, label) in options) ToggleChip(label: label, selected: selected.contains(v), onTap: () => onToggle(v))],
      );
}
