import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../presentation/features/auth/sign_in_screen.dart';
import '../../presentation/features/diet/plan_screen.dart';
import '../../presentation/features/foods/food_detail_screen.dart';
import '../../presentation/features/foods/foods_screen.dart';
import '../../presentation/features/guides/guides_data.dart';
import '../../presentation/features/home/home_screen.dart';
import '../../presentation/features/onboarding/onboarding_screen.dart';
import '../../presentation/features/profile/more_screen.dart';
import '../../presentation/features/tools/legal_screen.dart';
import '../../presentation/features/tools/tools_screen.dart';
import '../../presentation/features/shell/app_shell.dart';
import '../../presentation/providers/providers.dart';

/// Every screen address in one place. The four tabs adapt to whether the visitor is signed in.
final routerProvider = Provider<GoRouter>((ref) {
  final loggedIn = ValueNotifier<bool>(ref.read(currentUserProvider) != null);
  ref.listen(currentUserProvider, (_, u) => loggedIn.value = u != null);
  ref.onDispose(loggedIn.dispose);

  return GoRouter(
    refreshListenable: loggedIn,
    redirect: (context, state) {
      final signedIn = ref.read(currentUserProvider) != null;
      final path = state.uri.path;
      // The app shows content only after sign-in; the public pages live on the web.
      if (!signedIn) return path == '/welcome' ? null : '/welcome';
      if (path == '/welcome' || path == '/signin') return '/';
      // Supabase handles the Google sign-in link itself; the router only needs to land on Home.
      if (state.uri.host == 'login-callback' || state.uri.path.contains('login-callback')) return '/';
      if (state.matchedLocation == '/growth') return '/plan';
      return null;
    },
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, __) => const HomeScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/plan', builder: (_, __) => const PlanScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/foods', builder: (_, s) => FoodsScreen(species: s.uri.queryParameters['species'], stage: s.uri.queryParameters['stage']))]),
          StatefulShellBranch(routes: [GoRoute(path: '/more', builder: (_, __) => const MoreScreen())]),
        ],
      ),
      GoRoute(path: '/foods/:id', builder: (_, s) => FoodDetailScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/guides', builder: (_, __) => const Scaffold(body: GuidesScreen())),
      GoRoute(path: '/guides/:slug', builder: (_, s) => GuideArticleScreen(slug: s.pathParameters['slug']!)),
      GoRoute(path: '/tools', builder: (_, __) => const ToolsScreen()),
      GoRoute(path: '/privacy', builder: (_, __) => const LegalScreen(page: 'privacy')),
      GoRoute(path: '/terms', builder: (_, __) => const LegalScreen(page: 'terms')),
      GoRoute(path: '/disclaimer', builder: (_, __) => const LegalScreen(page: 'disclaimer')),
      GoRoute(path: '/toxic', builder: (_, __) => const ToxicScreen()),
      GoRoute(path: '/welcome', builder: (_, __) => const SignInScreen()),
      GoRoute(path: '/onboarding', builder: (_, s) => OnboardingScreen(adding: s.uri.queryParameters['add'] == '1')),
    ],
  );
});
