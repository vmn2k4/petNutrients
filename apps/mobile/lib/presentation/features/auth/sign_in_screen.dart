import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/env.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../providers/providers.dart';
import '../../widgets/app_button.dart';
import '../../widgets/sheet.dart';

// Password sign-in is only for accounts that already exist (the app never signs people up with a password).

const _benefits = [
  (PhosphorIconsFill.chartLineUp, 'A growth chart that follows them'),
  (PhosphorIconsFill.fire, 'Daily calories worked out for your pet'),
  (PhosphorIconsFill.shieldCheck, 'Every food checked against their needs'),
];

/// The only screen before an account: the app shows content after Google sign-in (the web app has the public pages).
/// Google's own account picker opens inside the app; the session arrives through [authProvider].
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  bool busy = false;

  Future<void> _go() async {
    HapticFeedback.selectionClick();
    setState(() => busy = true);
    try {
      await ref.read(authRepoProvider).signInWithGoogle();
    } catch (e) {
      if (mounted) showToast(context, 'Could not sign in with Google. Please try again.');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void _emailSheet() {
    showAppSheet<void>(context, title: 'Sign in with email', builder: (_) => _EmailSignIn(onSignIn: (e, p) => ref.read(authRepoProvider).signInWithPassword(e, p)));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: AppColors.brandYellow,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.s5, AppSpace.s5, AppSpace.s5, AppSpace.s4),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Expanded(child: Image.asset('assets/images/cut-pair.webp', fit: BoxFit.contain, errorBuilder: (_, __, ___) => Image.asset('assets/images/cut-beagle.webp', fit: BoxFit.contain))),
                const SizedBox(height: AppSpace.s4),
                Text('The right food for your dog or cat', style: AppTheme.display(context.text.headlineLarge!.copyWith(color: AppColors.brandInk, fontWeight: FontWeight.w700))),
                const SizedBox(height: AppSpace.s3),
                for (final (icon, t) in _benefits)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpace.s2),
                    child: Row(children: [Icon(icon, color: AppColors.brandInk, size: 22), const SizedBox(width: AppSpace.s3), Expanded(child: Text(t, style: context.text.bodyLarge!.copyWith(color: AppColors.brandInk)))]),
                  ),
                const SizedBox(height: AppSpace.s4),
                AppButton(label: 'Continue with Google', icon: PhosphorIconsBold.googleLogo, variant: AppButtonVariant.dark, block: true, loading: busy, onPressed: _go),
                Center(child: TextButton(onPressed: _emailSheet, child: Text('Have a password? Sign in with email', style: context.text.bodyMedium!.copyWith(color: AppColors.brandInk, fontWeight: FontWeight.w600)))),
                Center(
                  child: TextButton(
                    onPressed: () => launchUrl(Uri.parse('${Env.siteUrl}/privacy'), mode: LaunchMode.externalApplication),
                    child: Text('Free. We only use your Google name and email. Privacy', textAlign: TextAlign.center, style: context.text.bodySmall!.copyWith(color: c.fg)),
                  ),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Email and password for existing accounts. No sign-up here; "Forgot password" opens the website reset page.
class _EmailSignIn extends StatefulWidget {
  const _EmailSignIn({required this.onSignIn});
  final Future<void> Function(String email, String password) onSignIn;

  @override
  State<_EmailSignIn> createState() => _EmailSignInState();
}

class _EmailSignInState extends State<_EmailSignIn> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter your email and password.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await widget.onSignIn(_email.text, _password.text);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) setState(() => _error = 'That email and password did not match an account.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      FieldBlock(label: 'Email', child: TextField(controller: _email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], textInputAction: TextInputAction.next, autocorrect: false)),
      FieldBlock(label: 'Password', child: TextField(controller: _password, obscureText: true, autofillHints: const [AutofillHints.password], textInputAction: TextInputAction.done, onSubmitted: (_) => _submit())),
      ErrorText(_error),
      AppButton(label: 'Sign in', variant: AppButtonVariant.dark, block: true, loading: _busy, onPressed: _submit),
      TextButton(onPressed: () => launchUrl(Uri.parse('${Env.siteUrl}/account'), mode: LaunchMode.externalApplication), child: const Text('Forgot password? Reset it on the website')),
    ]);
  }
}
