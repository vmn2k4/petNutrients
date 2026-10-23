import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/providers.dart';
import '../../widgets/states.dart';
import '../onboarding/onboarding_screen.dart';
import 'dashboard_screen.dart';

/// Home: the first-pet wizard for a new owner, the dashboard for everyone else.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pets = ref.watch(petsProvider);
    return pets.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.read(petsProvider.notifier).refresh()),
      data: (s) => s.pets.isEmpty ? const OnboardingScreen() : const DashboardScreen(),
    );
  }
}
