// SAMPLE DATA for the prototype only. Product names and numbers are invented to show the screens.
// In the real app these come from Supabase (products, reviews) via the data layer.
export const FOODS = [
  { id: 'f1', img: '/assets/food-dry-dog.webp', barcode: '0000000000011', brand: 'Sample Brand A', name: 'Chicken & Rice, all life stages', species: 'dog', format: 'dry', lifeStage: 'all', protein: 27, fat: 16, fibre: 4, moisture: 10, kcalPerKg: 3650, calcium: 1.3, phosphorus: 1.0, pricePerKg: 6.8, ingredients: ['chicken', 'chicken meal', 'brown rice', 'oats', 'chicken fat', 'beet pulp', 'flaxseed', 'minerals', 'vitamins'], extras: ['glucosamine','chondroitin','probiotics'], rating: 4.4, reviews: 38, rebuy: 86, subscribe: 41, source: 'Label photo (verified)' },
  { id: 'f2', img: '/assets/food-dry-dog.webp', barcode: '0000000000028', brand: 'Sample Brand B', name: 'Lamb & Potato, adult', species: 'dog', format: 'dry', lifeStage: 'adult', protein: 23, fat: 12, fibre: 3.5, moisture: 10, kcalPerKg: 3500, calcium: 1.0, phosphorus: 0.8, pricePerKg: 5.2, ingredients: ['lamb', 'lamb meal', 'potato', 'rice', 'sunflower oil', 'minerals', 'vitamins'], extras: ['antioxidants'], rating: 4.1, reviews: 22, rebuy: 74, subscribe: 27, source: 'Open Pet Food Facts' },
  { id: 'f3', img: '/assets/food-cat-kibble.webp', barcode: '0000000000035', brand: 'Sample Brand C', name: 'Salmon & Sweet Potato, grain free', species: 'dog', format: 'dry', lifeStage: 'all', protein: 30, fat: 17, fibre: 4.5, moisture: 9, kcalPerKg: 3800, calcium: null, phosphorus: null, pricePerKg: 9.9, ingredients: ['salmon', 'salmon meal', 'sweet potato', 'peas', 'canola oil', 'garlic oil', 'minerals'], extras: ['omega3','collagen','probiotics'], rating: 4.6, reviews: 51, rebuy: 90, subscribe: 52, source: 'Label photo (verified)' },
  { id: 'f4', img: '/assets/food-wet-dog.webp', barcode: '0000000000042', brand: 'Sample Brand D', name: 'Beef Stew, wet', species: 'dog', format: 'wet', lifeStage: 'adult', protein: 8, fat: 5, fibre: 1.5, moisture: 78, kcalPerKg: 1050, calcium: 0.25, phosphorus: 0.2, pricePerKg: 8.4, ingredients: ['beef', 'beef broth', 'carrots', 'peas', 'rice', 'vitamins'], extras: ['collagen'], rating: 4.3, reviews: 17, rebuy: 70, subscribe: 18, source: 'Community entry' },
  { id: 'f5', img: '/assets/food-dry-dog.webp', barcode: '0000000000059', brand: 'Sample Brand E', name: 'Large Breed Puppy', species: 'dog', format: 'dry', lifeStage: 'growth', protein: 29, fat: 16, fibre: 3.5, moisture: 10, kcalPerKg: 3700, calcium: 1.2, phosphorus: 0.95, pricePerKg: 7.6, ingredients: ['chicken', 'chicken meal', 'barley', 'rice', 'fish oil', 'minerals', 'vitamins'], extras: ['omega3','glucosamine','antioxidants'], rating: 4.5, reviews: 63, rebuy: 88, subscribe: 47, source: 'Label photo (verified)' },
  { id: 'f6', img: '/assets/food-cat-kibble.webp', barcode: '0000000000066', brand: 'Sample Brand A', name: 'Indoor Cat, chicken', species: 'cat', format: 'dry', lifeStage: 'adult', protein: 34, fat: 15, fibre: 4, moisture: 10, kcalPerKg: 3700, calcium: 1.2, phosphorus: 1.0, pricePerKg: 9.5, ingredients: ['chicken', 'chicken meal', 'rice', 'chicken fat', 'taurine', 'minerals', 'vitamins'], extras: ['probiotics','antioxidants'], rating: 4.2, reviews: 29, rebuy: 79, subscribe: 33, source: 'Label photo (verified)' },
  { id: 'f7', img: '/assets/food-cat-kibble.webp', barcode: '0000000000073', brand: 'Sample Brand F', name: 'Kitten, turkey & salmon', species: 'cat', format: 'dry', lifeStage: 'growth', protein: 38, fat: 20, fibre: 3, moisture: 9, kcalPerKg: 3950, calcium: 1.4, phosphorus: 1.1, pricePerKg: 11.2, ingredients: ['turkey', 'salmon', 'turkey meal', 'rice', 'fish oil', 'taurine', 'minerals'], extras: ['omega3','probiotics'], rating: 4.7, reviews: 44, rebuy: 91, subscribe: 49, source: 'Label photo (verified)' },
  { id: 'f8', img: '/assets/food-cat-pate.webp', barcode: '0000000000080', brand: 'Sample Brand G', name: 'Pate with Tuna, wet cat food', species: 'cat', format: 'wet', lifeStage: 'adult', protein: 10, fat: 6, fibre: 1, moisture: 80, kcalPerKg: 900, calcium: 0.3, phosphorus: 0.25, pricePerKg: 14, ingredients: ['tuna', 'fish broth', 'rice', 'taurine', 'vitamins'], extras: ['omega3'], rating: 4.0, reviews: 15, rebuy: 68, subscribe: 12, source: 'Community entry' },
];

export const REVIEWS = [
  { foodId: 'f1', pet: 'Large dog, 2 years', stars: 5, liked: 'Loved it', improved: ['Coat', 'Energy'], rebuy: true, subscribe: false, why: 'I like picking it up when I need it.', text: 'Switched over a week and her coat looks glossier.', when: '6 weeks' },
  { foodId: 'f1', pet: 'Medium dog, 5 years', stars: 4, liked: 'Liked it', improved: ['Stool'], rebuy: true, subscribe: true, why: '', text: 'Firmer stools after a few days.', when: '4 weeks' },
  { foodId: 'f1', pet: 'Large dog, 1 year', stars: 3, liked: 'Picky at first', improved: [], rebuy: false, subscribe: false, why: 'Price went up.', text: 'He took a week to eat it all.', when: '3 weeks' },
];

// Ingredient library for the DIY recipe checker. Per 100 g. APPROXIMATE sample values:
// the real app reads these from USDA FoodData Central and the Canadian Nutrient File.
export const RECIPE_LIBRARY = [
  { id: 'chicken-thigh', name: 'Chicken thigh, raw, with skin', kcal: 211, protein: 17.3, fat: 15.3, calcium: 11, phosphorus: 170 },
  { id: 'beef-liver', name: 'Beef liver, raw', kcal: 135, protein: 20.4, fat: 3.6, calcium: 5, phosphorus: 387 },
  { id: 'rice', name: 'White rice, cooked', kcal: 130, protein: 2.7, fat: 0.3, calcium: 10, phosphorus: 43 },
  { id: 'carrot', name: 'Carrot, cooked', kcal: 35, protein: 0.8, fat: 0.2, calcium: 30, phosphorus: 30 },
  { id: 'eggshell', name: 'Eggshell powder (calcium source)', kcal: 0, protein: 0, fat: 0, calcium: 38000, phosphorus: 0 },
  { id: 'salmon-oil', name: 'Salmon oil', kcal: 900, protein: 0, fat: 100, calcium: 0, phosphorus: 0 },
];

export const TOXIC_ITEMS = [
  { slug: 'grapes', name: 'Grapes and raisins', dog: 'bad', cat: 'caution', note: 'In dogs, grapes and raisins can cause kidney failure even in small amounts (ASPCA). Published guidance focuses on dogs; if a cat ate any, call your vet.', source: 'https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets' },
  { slug: 'chocolate', name: 'Chocolate and cocoa', dog: 'bad', cat: 'bad', note: 'Chocolate, coffee and caffeine contain methylxanthines. Darker chocolate and cocoa powder are more dangerous (ASPCA).', source: 'https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets' },
  { slug: 'onion-garlic', name: 'Onion, garlic and leek', dog: 'bad', cat: 'bad', note: 'Allium plants (onion, garlic, chives, leek) can damage red blood cells. Cats are more susceptible; dogs are also at risk (ASPCA).', source: 'https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets' },
  { slug: 'xylitol', name: 'Xylitol (sweetener)', dog: 'bad', cat: 'caution', note: 'Xylitol in gum, candy and baked goods can cause a sharp drop in blood sugar and liver damage in dogs (ASPCA). Evidence for cats is limited; still avoid sharing.', source: 'https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets' },
  { slug: 'chicken', name: 'Cooked chicken (plain)', dog: 'good', cat: 'good', note: 'Plain cooked chicken without bones, seasoning, onion or garlic is a common safe treat. Raw chicken can carry bacteria (ASPCA).', source: 'https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets' },
  { slug: 'carrot', name: 'Carrot', dog: 'good', cat: 'good', note: 'Carrot is not on the ASPCA people-foods-to-avoid list. Offer in small pieces to reduce choking risk.', source: 'https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets' },
];

export const BCS_OPTIONS = [
  { score: 1, label: 'Very thin', text: 'Ribs, spine and hip bones easily seen from a distance. No body fat.' },
  { score: 3, label: 'Thin', text: 'Ribs easily felt, tops of spine visible, obvious waist.' },
  { score: 4, label: 'Slightly lean', text: 'Ribs felt easily with minimal fat cover, waist clear from above.' },
  { score: 5, label: 'Ideal', text: 'Ribs felt without excess fat cover. Waist visible from above, tummy tucked.' },
  { score: 6, label: 'Slightly heavy', text: 'Ribs felt with slight excess fat. Waist visible but not prominent.' },
  { score: 7, label: 'Heavy', text: 'Ribs hard to feel under thick fat. Waist barely visible.' },
  { score: 9, label: 'Obese', text: 'Ribs cannot be felt. No waist, belly sags, fat deposits on the back.' },
];
