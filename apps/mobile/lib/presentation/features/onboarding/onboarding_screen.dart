import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.g.dart';
import '../../../domain/domain.dart';
import '../../providers/calc_api.dart';
import '../../providers/providers.dart';
import '../../widgets/app_button.dart';
import '../../widgets/chips.dart';
import '../../widgets/form_fields.dart';
import '../../widgets/page.dart';
import '../../widgets/sheet.dart';

const _bodyShapes = [
  (3, 'Thin', 'Ribs easy to feel and see'),
  (5, 'Just right', 'Ribs felt with light pressure, a waist from above'),
  (7, 'Heavy', 'Ribs hard to feel, little or no waist'),
];

const healthOptions = ['Pregnant or nursing', 'Kidney disease', 'Diabetes', 'Pancreatitis', 'Heart disease', 'Digestive problems'];

/// Add a pet in three short steps. Anything typed in the free growth tool is already filled in.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key, this.adding = false});
  final bool adding;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int step = 0;
  Species species = Species.dog;
  final nameCtl = TextEditingController();
  final weightCtl = TextEditingController();
  String breed = '';
  String size = 'IV';
  String birth = '';
  String sex = 'unknown';
  bool neutered = true;
  String unit = 'kg';
  int bcs = 5;
  final allergies = <String>{};
  final health = <String>{};
  String? error;
  bool saving = false;

  @override
  void initState() {
    super.initState();
    unit = ref.read(settingsProvider).unit;
  }

  @override
  void dispose() {
    nameCtl.dispose();
    weightCtl.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    if (step == 0 && nameCtl.text.trim().isEmpty) return setState(() => error = 'Add a name.');
    if (step == 1) {
      final kg = WeightInput.toKg(weightCtl.text, unit);
      if (birth.isEmpty) return setState(() => error = 'Add a date of birth. A rough estimate is fine.');
      if (kg == null) return setState(() => error = 'Add their weight.');
      final check = await ref.read(calcActionsProvider).weightCheck(_draft(kg), kg);
      if (!check.ok) return setState(() => error = check.message);
    }
    setState(() {
      error = null;
      step++;
    });
  }

  Pet _draft(double kg) => Pet(
        id: newId(),
        species: species,
        name: nameCtl.text.trim().isEmpty ? 'Your pet' : nameCtl.text.trim(),
        breed: species == Species.dog ? breed : '',
        sizeCat: size,
        birth: birth,
        sex: sex,
        neutered: neutered,
        weightKg: roundTo(kg, 2),
        bcs: bcs,
        allergies: allergies.toList(),
        health: health.toList(),
        logs: [WeighIn(on: todayStr(), kg: roundTo(kg, 2), bcs: bcs)],
      );

  Future<void> _finish() async {
    final kg = WeightInput.toKg(weightCtl.text, unit);
    if (kg == null) return;
    setState(() => saving = true);
    try {
      await ref.read(petsProvider.notifier).createPet(_draft(kg));
      if (mounted) context.go('/');
    } catch (e) {
      if (mounted) {
        setState(() {
          saving = false;
          error = 'Could not save. Check your connection and try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final breedSize = species == Species.dog ? ref.calc.breedSize(breed) : null;
    final steps = [
      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Who are we feeding?', style: context.text.headlineMedium),
        const Gap(AppSpace.s4),
        FieldBlock(label: 'Dog or cat?', child: SpeciesPicker(value: species, onChanged: (s) => setState(() => species = s))),
        FieldBlock(label: 'Name', child: TextField(controller: nameCtl, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(hintText: 'Their name'))),
        if (species == Species.dog) ...[
          FieldBlock(label: 'Breed', hint: 'Mixed breed or not sure? Leave it blank.', child: BreedField(breeds: ref.watch(referenceProvider).breeds, value: breed, onChanged: (v) => setState(() => breed = v))),
          if (breedSize == null) FieldBlock(label: 'Expected adult size', child: SizeSelect(value: size, onChanged: (v) => setState(() => size = v))),
        ],
      ]),
      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('About ${nameCtl.text.trim().isEmpty ? 'them' : nameCtl.text.trim()}', style: context.text.headlineMedium),
        const Gap(AppSpace.s4),
        FieldBlock(label: 'Date of birth (or estimate)', child: DateField(value: birth, onChanged: (v) => setState(() => birth = v))),
        FieldBlock(label: 'Weight', child: WeightInput(controller: weightCtl, unit: unit, onUnit: (u) => setState(() => unit = u))),
        FieldBlock(label: 'Sex', child: SegmentTabs<String>(options: const [('female', 'Female'), ('male', 'Male'), ('unknown', 'Not sure')], value: sex, onChanged: (v) => setState(() => sex = v))),
        FieldBlock(label: 'Spayed or neutered?', child: SegmentTabs<bool>(options: const [(true, 'Yes'), (false, 'No')], value: neutered, onChanged: (v) => setState(() => neutered = v))),
      ]),
      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Body shape and health', style: context.text.headlineMedium),
        const Gap(AppSpace.s4),
        FieldBlock(label: 'How do they look today?', child: Column(children: [
          for (final (v, label, sub) in _bodyShapes)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.s2),
              child: ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md), side: BorderSide(color: bcs == v ? context.colors.primary : context.colors.border, width: bcs == v ? 2 : 1)),
                title: Text(label),
                subtitle: Text(sub),
                trailing: bcs == v ? Icon(Icons.check_circle, color: context.colors.primary) : null,
                onTap: () => setState(() => bcs = v),
              ),
            ),
        ])),
        FieldBlock(label: 'Food allergies', hint: 'Choose any they react to.', child: ChoiceWrap(options: [for (final a in allergens) (a, a[0].toUpperCase() + a.substring(1))], selected: allergies, onToggle: (a) => setState(() => allergies.contains(a) ? allergies.remove(a) : allergies.add(a)))),
        FieldBlock(label: 'Health conditions', hint: 'Only if a vet has told you. We will suggest checking the plan with them.', child: ChoiceWrap(options: [for (final h in healthOptions) (h, h)], selected: health, onToggle: (a) => setState(() => health.contains(a) ? health.remove(a) : health.add(a)))),
      ]),
    ];
    final last = step == steps.length - 1;
    return Scaffold(
      appBar: AppBar(
        title: Text('Step ${step + 1} of ${steps.length}'),
        leading: step > 0 ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => step--)) : (widget.adding ? IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()) : null),
        automaticallyImplyLeading: false,
      ),
      body: AppPage(children: [
        LinearProgressIndicator(value: (step + 1) / steps.length),
        const Gap(AppSpace.s5),
        steps[step],
        ErrorText(error),
        const Gap(AppSpace.s2),
        AppButton(label: last ? 'Save and see the plan' : 'Continue', cta: true, block: true, loading: saving, icon: PhosphorIconsRegular.arrowRight, onPressed: last ? _finish : _next),
      ]),
    );
  }
}
