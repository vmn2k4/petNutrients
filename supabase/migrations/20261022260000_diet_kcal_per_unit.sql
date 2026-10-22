-- Calories of a diet item measured in cups, cans, pieces and so on: kcal in ONE such measure, entered by the owner.
-- (kcal_per_kg stays for items measured in grams.)
alter table public.pet_diet_items
  add column if not exists kcal_per_unit numeric check (kcal_per_unit is null or (kcal_per_unit > 0 and kcal_per_unit <= 5000));
