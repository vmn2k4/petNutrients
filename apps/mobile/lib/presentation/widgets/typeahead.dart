import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.g.dart';

/// A text field that drops down matching options as you focus or type. Any typed text is still allowed ("not in the list? just type it").
class TypeaheadField extends StatelessWidget {
  const TypeaheadField({super.key, required this.controller, required this.options, this.hint, this.onChanged, this.maxOptions = 8, this.subtitleFor, this.autofocus = false});
  final TextEditingController controller;
  final List<String> options;
  final String? hint;
  final ValueChanged<String>? onChanged;
  final int maxOptions;
  final String? Function(String option)? subtitleFor;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final focus = FocusNode();
    return RawAutocomplete<String>(
      textEditingController: controller,
      focusNode: focus,
      optionsBuilder: (v) {
        final words = v.text.toLowerCase().split(' ').where((w) => w.isNotEmpty);
        return options.where((o) => words.every((w) => o.toLowerCase().contains(w))).take(maxOptions);
      },
      onSelected: (s) {
        controller.text = s;
        onChanged?.call(s);
        focus.unfocus();
      },
      fieldViewBuilder: (context, ctl, fn, onSubmit) => TextField(
        controller: ctl,
        focusNode: fn,
        autofocus: autofocus,
        decoration: InputDecoration(hintText: hint, prefixIcon: const Icon(Icons.search), suffixIcon: ctl.text.isEmpty ? const Icon(Icons.arrow_drop_down) : IconButton(icon: const Icon(Icons.close), onPressed: () {
              ctl.clear();
              onChanged?.call('');
            })),
        onChanged: onChanged,
      ),
      optionsViewBuilder: (context, onSelected, opts) {
        final c = context.colors;
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            elevation: 6,
            color: c.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
            clipBehavior: Clip.antiAlias,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 260, maxWidth: 560),
              child: ListView.separated(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                itemCount: opts.length,
                separatorBuilder: (_, __) => Divider(height: 1, color: c.border),
                itemBuilder: (context, i) {
                  final o = opts.elementAt(i);
                  final sub = subtitleFor?.call(o);
                  return InkWell(
                    onTap: () => onSelected(o),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpace.s4, vertical: AppSpace.s3),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(o, style: context.text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                        if (sub != null) Text(sub, style: context.text.bodySmall),
                      ]),
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}
