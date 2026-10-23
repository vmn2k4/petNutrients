/// Words shown for diet roles and measures. Labels only; no calculation.
const dietRoles = {'main': 'Main food', 'topper': 'Wet food or topper', 'treat': 'Treats', 'supplement': 'Supplement', 'other': 'Other'};
const dietUnits = {'g': 'g', 'cup': 'cup', 'can': 'can', 'piece': 'piece', 'scoop': 'scoop', 'tsp': 'teaspoon', 'tbsp': 'tablespoon', 'capsule': 'capsule', 'tablet': 'tablet', 'ml': 'ml'};

/// "2 cups", "1 can": the unit word for an amount.
String unitWords(String u, num n) => const ['g', 'ml', 'tsp', 'tbsp'].contains(u) ? u : (n == 1 ? u : (u == 'piece' ? 'pieces' : '${u}s'));
