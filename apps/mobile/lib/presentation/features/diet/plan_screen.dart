import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/providers.dart';
import '../onboarding/onboarding_screen.dart';
import 'diet_screen.dart';

/// Second tab: the Diet page (or the first-pet wizard when there is no pet yet).
class PlanScreen extends ConsumerWidget {
  const PlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => (ref.watch(petsProvider).value?.pets.isEmpty ?? false) ? const OnboardingScreen() : const DietScreen();
}
