import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';

enum AppButtonVariant { primary, secondary, dark, ghost }

/// The one button. One filled (primary) button per screen; everything else is secondary, dark or ghost. `cta` adds the soft ring
/// around the single action the screen wants next.
class AppButton extends StatelessWidget {
  const AppButton({super.key, required this.label, required this.onPressed, this.variant = AppButtonVariant.primary, this.icon, this.small = false, this.block = false, this.cta = false, this.loading = false});

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool small;
  final bool block;
  final bool cta;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (bg, fg, border) = switch (variant) {
      AppButtonVariant.primary => (AppColors.brandYellow, AppColors.brandInk, Colors.transparent),
      AppButtonVariant.secondary => (c.surface, c.fg, c.border),
      AppButtonVariant.dark => (c.ink, c.onInk, Colors.transparent),
      AppButtonVariant.ghost => (Colors.transparent, c.fgMuted, Colors.transparent),
    };
    final enabled = onPressed != null && !loading;
    final height = small ? 40.0 : AppSize.touchMin + 4;
    final child = Row(
      mainAxisSize: block ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading)
          SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: fg))
        else if (icon != null) ...[Icon(icon, size: small ? 18 : 20, color: fg), const SizedBox(width: AppSpace.s2)],
        Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: context.text.labelLarge!.copyWith(color: fg, fontSize: small ? AppText.xs + 1 : AppText.sm))),
      ],
    );
    final btn = Material(
      color: enabled ? bg : bg.withValues(alpha: 0.5),
      shape: StadiumBorder(side: BorderSide(color: border, width: 1.5)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: enabled ? () {
          if (cta || variant == AppButtonVariant.primary) HapticFeedback.lightImpact();
          onPressed!();
        } : null,
        child: Container(constraints: BoxConstraints(minHeight: height, minWidth: small ? 44 : 64), padding: EdgeInsets.symmetric(horizontal: small ? AppSpace.s4 : AppSpace.s5), alignment: Alignment.center, child: child),
      ),
    );
    final ringed = cta
        ? DecoratedBox(decoration: BoxDecoration(shape: BoxShape.rectangle, borderRadius: BorderRadius.circular(AppRadius.pill + 4), boxShadow: [BoxShadow(color: AppColors.brandYellow.withValues(alpha: 0.4), spreadRadius: 4)]), child: btn)
        : btn;
    return block ? SizedBox(width: double.infinity, child: ringed) : ringed;
  }
}
