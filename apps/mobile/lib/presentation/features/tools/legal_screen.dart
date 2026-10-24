import 'dart:convert';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../widgets/page.dart';

/// Privacy policy, terms and the medical and data disclaimer: the same text as the website, read from assets/content/legal.json.
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.page});
  final String page; // privacy, terms or disclaimer

  static Future<Map<String, dynamic>> _load() async => (jsonDecode(await rootBundle.loadString('assets/content/legal.json')) as Map).cast<String, dynamic>();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _load(),
      builder: (context, snap) {
        final doc = (snap.data?['/$page'] as Map?)?.cast<String, dynamic>();
        return Scaffold(
          appBar: AppBar(title: Text(doc?['title'] as String? ?? '')),
          body: doc == null
              ? const Center(child: CircularProgressIndicator.adaptive())
              : AppPage(children: [
                  Text(doc['title'] as String, style: context.text.headlineMedium),
                  const Gap(AppSpace.s2),
                  Text(doc['lead'] as String, style: context.text.bodySmall),
                  const Gap(AppSpace.s2),
                  Text('Last updated: ${doc['updated'] ?? ''}', style: context.text.bodySmall),
                  for (final s in (doc['sections'] as List)) ..._section(context, s as List),
                  const Gap(AppSpace.s5),
                ]),
        );
      },
    );
  }

  List<Widget> _section(BuildContext context, List s) => [
        const Gap(AppSpace.s5),
        Text('${s.first}', style: context.text.titleLarge),
        for (final p in s.skip(1)) ...[
          const Gap(AppSpace.s2),
          if (p is List)
            for (final x in p) Padding(padding: const EdgeInsets.only(bottom: AppSpace.s2, left: AppSpace.s2), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('•  ', style: context.text.bodyMedium), Expanded(child: _rich(context, '$x'))]))
          else
            _rich(context, '$p'),
        ],
      ];

  /// The few HTML bits the text uses: bold, links and &amp;.
  Widget _rich(BuildContext context, String html) {
    final spans = <InlineSpan>[];
    final base = context.text.bodyMedium!;
    final re = RegExp(r'<strong>(.*?)</strong>|<a href="([^"]*)">(.*?)</a>');
    var i = 0;
    String clean(String t) => t.replaceAll('&amp;', '&');
    for (final m in re.allMatches(html)) {
      if (m.start > i) spans.add(TextSpan(text: clean(html.substring(i, m.start))));
      if (m.group(1) != null) {
        spans.add(TextSpan(text: clean(m.group(1)!), style: const TextStyle(fontWeight: FontWeight.w700)));
      } else {
        final href = m.group(2)!;
        spans.add(TextSpan(text: clean(m.group(3)!), style: TextStyle(color: context.colors.primary, decoration: TextDecoration.underline), recognizer: TapGestureRecognizer()..onTap = () => href.startsWith('/') ? context.pushReplacement(href) : launchUrl(Uri.parse(href))));
      }
      i = m.end;
    }
    if (i < html.length) spans.add(TextSpan(text: clean(html.substring(i))));
    return Text.rich(TextSpan(style: base, children: spans));
  }
}
