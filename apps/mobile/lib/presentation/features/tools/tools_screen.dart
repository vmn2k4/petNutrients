import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../widgets/app_card.dart';
import '../../widgets/page.dart';

/// Tools hub: the free checkers, then the legal pages.
class ToolsScreen extends StatelessWidget {
  const ToolsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tools = [
      (PhosphorIconsRegular.chartLine, 'Growth chart and goal planner', 'Puppy or kitten? See their percentile, set a goal weight, get daily calories.', '/'),
      (PhosphorIconsRegular.warning, 'Can my pet eat this?', 'Grapes, chocolate, cheese? Quick answers before you share a snack.', '/toxic'),
      (PhosphorIconsRegular.bookOpen, 'Guides', 'Short, plain guides on feeding, growth and labels.', '/guides'),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Tools')),
      body: AppPage(children: [
        for (final (icon, title, text, href) in tools)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.s3),
            child: AppCard(
              onTap: () => href == '/' ? context.go(href) : context.push(href),
              child: Row(children: [
                CircleAvatar(radius: 22, backgroundColor: context.colors.primarySoft, child: Icon(icon, color: context.colors.primary)),
                const SizedBox(width: AppSpace.s3),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: context.text.titleMedium), Text(text, style: context.text.bodySmall)])),
                const Icon(Icons.chevron_right),
              ]),
            ),
          ),
        const Gap(AppSpace.s4),
        Text('About', style: context.text.titleMedium),
        const Gap(AppSpace.s2),
        for (final (label, path) in const [('Medical & data disclaimer', '/disclaimer'), ('Privacy policy', '/privacy'), ('Terms and conditions', '/terms')])
          ListTile(contentPadding: EdgeInsets.zero, title: Text(label), trailing: const Icon(Icons.chevron_right), onTap: () => context.push(path)),
      ]),
    );
  }
}
