import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The layer rules from CLAUDE.md, enforced: domain imports nothing from data/presentation/core or Flutter,
/// data never imports presentation, and only core/theme and widgets read design tokens (no hard-coded colours elsewhere).
void main() {
  List<File> dart(String dir) => Directory(dir).listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart')).toList();
  List<String> imports(File f) => f.readAsLinesSync().where((l) => l.startsWith('import ') || l.startsWith('export ')).toList();

  test('domain is pure Dart', () {
    for (final f in dart('lib/domain')) {
      for (final i in imports(f)) {
        expect(i, isNot(contains('package:flutter')), reason: f.path);
        expect(i, isNot(contains('supabase')), reason: f.path);
        expect(i, isNot(matches(RegExp(r"/(data|presentation|core)/"))), reason: f.path);
      }
    }
  });

  test('data does not import presentation', () {
    for (final f in dart('lib/data')) {
      for (final i in imports(f)) {
        expect(i, isNot(contains('/presentation/')), reason: f.path);
      }
    }
  });

  test('presentation does not call Supabase', () {
    for (final f in dart('lib/presentation')) {
      for (final i in imports(f)) {
        expect(i, isNot(contains('supabase')), reason: f.path);
      }
    }
  });

  test('no hard-coded colours outside the generated tokens', () {
    for (final f in dart('lib').where((f) => !f.path.endsWith('tokens.g.dart'))) {
      expect(f.readAsStringSync(), isNot(matches(RegExp(r'Color\(0x'))), reason: f.path);
    }
  });
}
