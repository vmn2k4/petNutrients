import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/page.dart';
import '../../widgets/status_badge.dart';

class Guide {
  const Guide({required this.slug, required this.title, required this.minutes, required this.art, required this.summary, required this.blocks, this.ctaLabel, this.ctaHref});
  final String slug;
  final String title;
  final int minutes;
  final String art;
  final String summary;
  final List<List<dynamic>> blocks;
  final String? ctaLabel;
  final String? ctaHref;

  factory Guide.fromJson(Map<String, dynamic> j) => Guide(
        slug: j['slug'] as String,
        title: j['title'] as String,
        minutes: (j['minutes'] as num?)?.toInt() ?? 3,
        art: j['art'] as String? ?? 'cut-beagle',
        summary: j['summary'] as String? ?? '',
        blocks: (j['blocks'] as List).map((b) => List<dynamic>.from(b as List)).toList(),
        ctaLabel: (j['cta'] as Map?)?['label'] as String?,
        ctaHref: (j['cta'] as Map?)?['href'] as String?,
      );
}

class GuidesData {
  const GuidesData(this.guides, this.disclaimer);
  final List<Guide> guides;
  final String disclaimer;
}

/// Short plain-language articles, bundled with the app.
final guidesProvider = FutureProvider<GuidesData>((ref) async {
  final j = jsonDecode(await rootBundle.loadString('assets/content/guides.json')) as Map<String, dynamic>;
  return GuidesData((j['guides'] as List).map((g) => Guide.fromJson(g as Map<String, dynamic>)).toList(), j['disclaimer'] as String? ?? '');
});

class ToxicItem {
  const ToxicItem({required this.name, required this.dog, required this.cat, required this.note, required this.source});
  final String name;
  final String dog;
  final String cat;
  final String note;
  final String source;
}

final toxicProvider = FutureProvider<List<ToxicItem>>((ref) async {
  final l = jsonDecode(await rootBundle.loadString('assets/content/toxic.json')) as List;
  return l.map((e) => ToxicItem(name: e['name'] as String, dog: e['dog'] as String, cat: e['cat'] as String, note: e['note'] as String, source: e['source'] as String? ?? '')).toList();
});

/// A guide in a list.
class GuideTile extends StatelessWidget {
  const GuideTile({super.key, required this.guide});
  final Guide guide;

  @override
  Widget build(BuildContext context) => AppCard(
        onTap: () => context.push('/guides/${guide.slug}'),
        child: Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(AppRadius.md), child: Container(width: 64, height: 64, color: context.colors.surface2, child: Image.asset('assets/images/${guide.art}.webp', fit: BoxFit.contain, errorBuilder: (_, __, ___) => const SizedBox.shrink()))),
          const SizedBox(width: AppSpace.s3),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(guide.title, style: context.text.titleMedium), const SizedBox(height: 2), Text('${guide.minutes} min read', style: context.text.bodySmall)])),
        ]),
      );
}

/// Guides and the "can my pet eat this?" list, for visitors and for anyone who wants to read more.
class GuidesScreen extends ConsumerWidget {
  const GuidesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final g = ref.watch(guidesProvider);
    return AppPage(children: [
      Text('Guides', style: context.text.headlineMedium),
      const Gap(AppSpace.s3),
      AppCard(onTap: () => context.push('/toxic'), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Can my pet eat this?', style: context.text.titleMedium), Text('Check common foods for dogs and cats.', style: context.text.bodySmall)])), const Icon(Icons.chevron_right)])),
      const Gap(AppSpace.s3),
      g.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Text('Guides could not load.', style: context.text.bodyMedium),
        data: (data) => Column(children: [for (final x in data.guides) Padding(padding: const EdgeInsets.only(bottom: AppSpace.s3), child: GuideTile(guide: x))]),
      ),
    ]);
  }
}

class GuideArticleScreen extends ConsumerWidget {
  const GuideArticleScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(guidesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Guide')),
      body: data.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('This guide could not load.')),
        data: (d) {
          final g = d.guides.where((x) => x.slug == slug).firstOrNull;
          if (g == null) return const Center(child: Text('Guide not found.'));
          return AppPage(children: [
            Text(g.title, style: context.text.headlineMedium),
            const Gap(AppSpace.s1),
            Text('${g.minutes} min read', style: context.text.bodySmall),
            const Gap(AppSpace.s4),
            for (final b in g.blocks) _block(context, b),
            if (g.ctaLabel != null && g.ctaHref != null) ...[const Gap(AppSpace.s4), AppButton(label: g.ctaLabel!, onPressed: () => context.go(_route(g.ctaHref!)))],
            const Gap(AppSpace.s4),
            Text(d.disclaimer, style: context.text.bodySmall),
          ]);
        },
      ),
    );
  }

  /// The web guides link to web paths; the app has the same screens under its own routes.
  String _route(String href) => switch (href) { '/growth' => '/growth', '/foods' => '/foods', _ => '/' };

  Widget _block(BuildContext context, List<dynamic> b) {
    final t = b[0] as String;
    final tx = context.text;
    switch (t) {
      case 'h2':
        return Padding(padding: const EdgeInsets.only(top: AppSpace.s5, bottom: AppSpace.s2), child: Text(b[1] as String, style: tx.headlineSmall));
      case 'h3':
        return Padding(padding: const EdgeInsets.only(top: AppSpace.s4, bottom: AppSpace.s1), child: Text(b[1] as String, style: tx.titleMedium));
      case 'ul':
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.s3),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [for (final i in (b[1] as List)) Padding(padding: const EdgeInsets.only(bottom: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('•  '), Expanded(child: Text('$i', style: tx.bodyLarge))]))]),
        );
      case 'note':
        return Padding(padding: const EdgeInsets.only(bottom: AppSpace.s3), child: NoticeBanner(state: 'info', title: 'Note', text: b[1] as String, icon: Icons.info_outline));
      case 'src':
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.s3),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Sources', style: tx.titleSmall),
            for (final s in (b[1] as List)) TextButton(onPressed: () => launchUrl(Uri.parse('${(s as List)[1]}'), mode: LaunchMode.externalApplication), child: Align(alignment: Alignment.centerLeft, child: Text('${s[0]}'))),
          ]),
        );
      default:
        return Padding(padding: const EdgeInsets.only(bottom: AppSpace.s3), child: Text(b[1] as String, style: tx.bodyLarge));
    }
  }
}

/// Common foods and whether they are safe for dogs and cats.
class ToxicScreen extends ConsumerStatefulWidget {
  const ToxicScreen({super.key});

  @override
  ConsumerState<ToxicScreen> createState() => _ToxicScreenState();
}

class _ToxicScreenState extends ConsumerState<ToxicScreen> {
  String species = 'dog';
  String q = '';

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(toxicProvider).value ?? const <ToxicItem>[];
    final list = items.where((i) => i.name.toLowerCase().contains(q.toLowerCase())).toList();
    const label = {'good': 'Generally safe', 'caution': 'Caution', 'bad': 'Not safe'};
    return Scaffold(
      appBar: AppBar(title: const Text('Can my pet eat this?')),
      body: AppPage(children: [
        Row(children: [for (final s in ['dog', 'cat']) Padding(padding: const EdgeInsets.only(right: AppSpace.s2), child: ChoiceChip(label: Text(s == 'dog' ? 'Dog' : 'Cat'), selected: species == s, onSelected: (_) => setState(() => species = s)))]),
        const Gap(AppSpace.s3),
        TextField(decoration: const InputDecoration(hintText: 'Search a food', prefixIcon: Icon(Icons.search)), onChanged: (v) => setState(() => q = v)),
        const Gap(AppSpace.s3),
        for (final i in list)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.s3),
            child: AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [Expanded(child: Text(i.name, style: context.text.titleMedium)), StatusBadge(label[species == 'dog' ? i.dog : i.cat] ?? '', state: species == 'dog' ? i.dog : i.cat)]),
              const Gap(AppSpace.s2),
              Text(i.note, style: context.text.bodyMedium),
              if (i.source.isNotEmpty) TextButton(onPressed: () => launchUrl(Uri.parse(i.source), mode: LaunchMode.externalApplication), child: const Text('Source')),
            ])),
          ),
        const Text('General information, not veterinary advice. If your pet ate something unsafe, call your vet or an animal poison line.'),
      ]),
    );
  }
}
