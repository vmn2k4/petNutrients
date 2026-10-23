import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';

/// Questions and forms open as bottom sheets. The sheet scrolls and lifts above the keyboard.
Future<T?> showAppSheet<T>(BuildContext context, {required String title, required WidgetBuilder builder}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(AppSpace.s5, 0, AppSpace.s5, AppSpace.s5),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(title, style: ctx.text.headlineSmall),
          const SizedBox(height: AppSpace.s4),
          builder(ctx),
        ]),
      ),
    ),
  );
}

void showToast(BuildContext context, String message) {
  final m = ScaffoldMessenger.of(context);
  m.hideCurrentSnackBar();
  m.showSnackBar(SnackBar(content: Text(message)));
}

/// A labelled form field block.
class FieldBlock extends StatelessWidget {
  const FieldBlock({super.key, required this.label, required this.child, this.hint});
  final String label;
  final Widget child;
  final String? hint;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpace.s4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: context.text.titleSmall),
          const SizedBox(height: AppSpace.s2),
          child,
          if (hint != null) Padding(padding: const EdgeInsets.only(top: AppSpace.s1), child: Text(hint!, style: context.text.bodySmall)),
        ]),
      );
}

class ErrorText extends StatelessWidget {
  const ErrorText(this.message, {super.key});
  final String? message;

  @override
  Widget build(BuildContext context) => (message == null || message!.isEmpty) ? const SizedBox.shrink() : Padding(padding: const EdgeInsets.only(bottom: AppSpace.s3), child: Text(message!, style: context.text.bodyMedium!.copyWith(color: context.colors.bad)));
}
