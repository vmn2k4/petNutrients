import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';


/// The bottom tabs. Visitors see Home, Growth, Foods, Guides; owners see Home, Diet, Foods, Profile.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const tabs = [
      (PhosphorIconsRegular.house, PhosphorIconsFill.house, 'Home'),
      (PhosphorIconsRegular.bowlFood, PhosphorIconsFill.bowlFood, 'Diet'),
      (PhosphorIconsRegular.magnifyingGlass, PhosphorIconsFill.magnifyingGlass, 'Find food'),
      (PhosphorIconsRegular.user, PhosphorIconsFill.user, 'Profile'),
    ];
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) {
          HapticFeedback.selectionClick();
          shell.goBranch(i, initialLocation: i == shell.currentIndex);
        },
        destinations: [for (final (icon, sel, label) in tabs) NavigationDestination(icon: Icon(icon), selectedIcon: Icon(sel), label: label)],
      ),
    );
  }
}
