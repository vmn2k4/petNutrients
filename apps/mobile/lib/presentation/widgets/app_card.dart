import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';

/// A rounded surface with a border. `tight` is the slim variant for one-line cards.
class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.tight = false, this.onTap, this.color, this.padding});
  final Widget child;
  final bool tight;
  final VoidCallback? onTap;
  final Color? color;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final pad = padding ?? (tight ? const EdgeInsets.symmetric(horizontal: AppSpace.s4, vertical: AppSpace.s3) : const EdgeInsets.all(AppSpace.s5));
    final light = Theme.of(context).brightness == Brightness.light;
    // A soft lift instead of a hard outline (a hairline stays for contrast); the shadow is part of the container so a press never moves it.
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: light && color == null ? [BoxShadow(color: c.ink.withValues(alpha: 0.06), blurRadius: 18, offset: const Offset(0, 6))] : const [],
      ),
      child: Material(
        color: color ?? c.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg), side: BorderSide(color: c.border.withValues(alpha: light ? 0.7 : 1))),
        clipBehavior: Clip.antiAlias,
        child: InkWell(onTap: onTap, child: Padding(padding: pad, child: child)),
      ),
    );
  }
}

/// A heading row inside a card or page: a title and an optional trailing widget.
class TitleRow extends StatelessWidget {
  const TitleRow(this.title, {super.key, this.trailing});
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(child: Text(title, style: context.text.titleLarge)),
        if (trailing != null) trailing!,
      ]);
}
