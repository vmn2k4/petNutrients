import 'package:flutter/material.dart';

import '../../core/theme/tokens.g.dart';

/// A scrolling page with the standard gutter, centred and limited in width on tablets.
class AppPage extends StatelessWidget {
  const AppPage({super.key, required this.children, this.padTop = true, this.onRefresh});
  final List<Widget> children;
  final bool padTop;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final list = ListView(
      padding: EdgeInsets.fromLTRB(AppSpace.s4, padTop ? AppSpace.s4 : 0, AppSpace.s4, AppSpace.s7),
      children: [for (var i = 0; i < children.length; i++) _Reveal(index: i, child: children[i])],
    );
    final body = Align(alignment: Alignment.topCenter, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 720), child: onRefresh == null ? list : RefreshIndicator(onRefresh: onRefresh!, child: list)));
    return SafeArea(bottom: false, child: body);
  }
}

class Gap extends StatelessWidget {
  const Gap(this.h, {super.key});
  final double h;
  @override
  Widget build(BuildContext context) => SizedBox(height: h);
}

/// Each block of a screen eases in (a short fade and rise, staggered for the first few), so a screen settles instead of snapping. Off under reduced motion.
class _Reveal extends StatelessWidget {
  const _Reveal({required this.index, required this.child});
  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context) || child is Gap) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: AppMotion.base + Duration(milliseconds: 40 * (index > 6 ? 6 : index)),
      curve: Curves.easeOutCubic,
      builder: (_, v, c) => Opacity(opacity: v, child: Transform.translate(offset: Offset(0, 14 * (1 - v)), child: c)),
      child: child,
    );
  }
}
