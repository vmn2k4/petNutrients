-- A homemade mix (or any typed food) can carry its own calories, so the diet total can count it.
-- kcal_per_kg is per kg of the food as fed. recipe is the list of ingredients the mix was built from: [{"id","name","grams"}].
alter table public.pet_diet_items
  add column if not exists kcal_per_kg numeric check (kcal_per_kg is null or (kcal_per_kg > 0 and kcal_per_kg <= 9500)),
  add column if not exists recipe jsonb;

-- Supplements (collagen, turmeric, fish oil and so on) are listed in the diet without calories, in doses such as a scoop or a teaspoon.
alter table public.pet_diet_items drop constraint if exists pet_diet_items_role_check;
alter table public.pet_diet_items add constraint pet_diet_items_role_check check (role in ('main','topper','treat','supplement','other'));
alter table public.pet_diet_items drop constraint if exists pet_diet_items_unit_check;
alter table public.pet_diet_items add constraint pet_diet_items_unit_check check (unit in ('g','cup','can','piece','scoop','tsp','tbsp','capsule','tablet','ml'));
