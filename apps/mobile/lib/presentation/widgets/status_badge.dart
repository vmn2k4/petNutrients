import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';

/// A pill with a status colour and an icon, so state is never colour alone. `state`: good, caution, bad or info (default neutral).
class StatusBadge extends StatelessWidget {
  const StatusBadge(this.text, {super.key, this.state, this.icon});
  final String text;
  final String? state;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (bg, fg) = switch (state) {
      'good' => (c.goodBg, c.good),
      'caution' => (c.cautionBg, c.caution),
      'bad' => (c.badBg, c.bad),
      'info' => (c.infoBg, c.info),
      _ => (c.surface2, c.fgMuted),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.s3, vertical: AppSpace.s1 + 1),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 14, color: fg), const SizedBox(width: 4)],
        Flexible(child: Text(text, style: context.text.labelMedium!.copyWith(color: fg))),
      ]),
    );
  }
}

/// A message block (verdict) for safety information: a coloured card with an icon, a title and text.
class NoticeBanner extends StatelessWidget {
  const NoticeBanner({super.key, required this.state, required this.title, required this.text, this.icon});
  final String state; // good, caution, bad, info
  final String title;
  final String text;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (bg, fg) = switch (state) {
      'good' => (c.goodBg, c.good),
      'bad' => (c.badBg, c.bad),
      'info' => (c.infoBg, c.info),
      _ => (c.cautionBg, c.caution),
    };
    return Container(
      padding: const EdgeInsets.all(AppSpace.s4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon ?? Icons.warning_amber_rounded, color: fg),
        const SizedBox(width: AppSpace.s3),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: context.text.titleMedium!.copyWith(color: fg)),
            const SizedBox(height: AppSpace.s1),
            Text(text, style: context.text.bodyMedium),
          ]),
        ),
      ]),
    );
  }
}

/// A short note under an estimate: "Estimates only, not veterinary advice."
class EstimateNote extends StatelessWidget {
  const EstimateNote({super.key, this.extra = ''});
  final String extra;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpace.s3),
        child: Text('Estimates only, not veterinary advice.${extra.isEmpty ? '' : ' $extra'}', style: context.text.bodySmall),
      );
}
