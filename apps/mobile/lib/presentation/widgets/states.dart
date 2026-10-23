import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';
import 'app_button.dart';

/// Placeholder blocks shown while a screen loads (the shape of the page, gently pulsing), so a slow start is never a blank page or a lone spinner.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key});
  @override
  Widget build(BuildContext context) => const SafeArea(
        bottom: false,
        child: Padding(
          padding: EdgeInsets.all(AppSpace.s4),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Skeleton(width: 180, height: 28),
            SizedBox(height: AppSpace.s4),
            Skeleton(height: 220, radius: AppRadius.lg),
            SizedBox(height: AppSpace.s3),
            Skeleton(height: 84, radius: AppRadius.lg),
            SizedBox(height: AppSpace.s3),
            Skeleton(height: 84, radius: AppRadius.lg),
          ]),
        ),
      );
}

class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.width, required this.height, this.radius = AppRadius.sm});
  final double? width;
  final double height;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final still = MediaQuery.disableAnimationsOf(context);
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) => Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(color: Color.lerp(c.surface2, c.border, still ? 0 : _c.value), borderRadius: BorderRadius.circular(widget.radius)),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.s5),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('Something went wrong', style: context.text.titleLarge),
            const SizedBox(height: AppSpace.s2),
            Text(message, textAlign: TextAlign.center, style: context.text.bodyMedium),
            if (onRetry != null) ...[const SizedBox(height: AppSpace.s4), AppButton(label: 'Try again', onPressed: onRetry)],
          ]),
        ),
      );
}

/// An empty state with a call to action.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, required this.text, this.action, this.image});
  final String? image; // an asset in assets/images, like cut-kitten
  final String title;
  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.s6),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            if (image != null) Padding(padding: const EdgeInsets.only(bottom: AppSpace.s3), child: Image.asset('assets/images/$image.webp', height: 120, errorBuilder: (_, __, ___) => const SizedBox.shrink())),
            Text(title, textAlign: TextAlign.center, style: context.text.headlineSmall),
            const SizedBox(height: AppSpace.s2),
            Text(text, textAlign: TextAlign.center, style: context.text.bodyLarge!.copyWith(color: context.colors.fgMuted)),
            if (action != null) ...[const SizedBox(height: AppSpace.s5), action!],
          ]),
        ),
      );
}
