import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';

/// An iOS-style grouped list: a bold title (with an optional action), then one rounded surface holding rows split by hairlines.
/// Use this instead of a card inside a card: one level of surface, many rows.
class InsetSection extends StatelessWidget {
  const InsetSection({super.key, this.title, this.action, required this.children, this.footer});
  final String? title;
  final Widget? action;
  final List<Widget> children;
  final String? footer;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (title != null)
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.s2, 0, 0, AppSpace.s2),
          child: Row(children: [Expanded(child: Text(title!, style: context.text.titleLarge)), if (action != null) action!]),
        ),
      Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(AppRadius.md + 6)),
        child: Column(children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) Divider(height: 1, indent: AppSpace.s4, color: c.border.withValues(alpha: 0.8)), children[i]]]),
      ),
      if (footer != null) Padding(padding: const EdgeInsets.fromLTRB(AppSpace.s2, AppSpace.s2, AppSpace.s2, 0), child: Text(footer!, style: context.text.bodySmall)),
    ]);
  }
}

/// One row of an [InsetSection]: a leading icon or picture, a title and subtitle, a trailing value or control. The whole row is the tap target.
class RowTile extends StatelessWidget {
  const RowTile({super.key, required this.title, this.subtitle, this.leading, this.trailing, this.onTap, this.destructive = false, this.chevron = false, this.subtitleColor});
  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool destructive;
  final bool chevron;
  final Color? subtitleColor;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 60),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.s4, vertical: AppSpace.s3),
          child: Row(children: [
            if (leading != null) ...[leading!, const SizedBox(width: AppSpace.s3)],
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: context.text.titleSmall!.copyWith(color: destructive ? c.bad : null), maxLines: 2, overflow: TextOverflow.ellipsis),
                if (subtitle != null) Text(subtitle!, style: context.text.bodySmall!.copyWith(color: subtitleColor), maxLines: 2, overflow: TextOverflow.ellipsis),
              ]),
            ),
            if (trailing != null) ...[const SizedBox(width: AppSpace.s2), trailing!],
            if (chevron) Icon(Icons.chevron_right, color: c.fgMuted),
          ]),
        ),
      ),
    );
  }
}

/// A round tinted bubble for a row's leading icon.
class IconBubble extends StatelessWidget {
  const IconBubble(this.icon, {super.key, this.color, this.background});
  final IconData icon;
  final Color? color;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(width: 40, height: 40, decoration: BoxDecoration(color: background ?? c.primarySoft, shape: BoxShape.circle), child: Icon(icon, size: 22, color: color ?? c.primary));
  }
}

/// A small round "+" button for a section header.
class AddButton extends StatelessWidget {
  const AddButton({super.key, required this.onPressed, this.label = 'Add'});
  final VoidCallback onPressed;
  final String label;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        child: Material(color: context.colors.primary, shape: const CircleBorder(), child: InkWell(customBorder: const CircleBorder(), onTap: onPressed, child: SizedBox(width: 40, height: 40, child: Icon(Icons.add, color: context.colors.onPrimary)))),
      );
}
