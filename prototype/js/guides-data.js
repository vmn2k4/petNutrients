// GUIDES: short, plain-language articles. Content only; rendered by screens/guides.js.
// Block types: ['h2', text], ['h3', text], ['p', text], ['ul', [items]], ['note', text], ['src', [[label, url]]]. faq: true derives FAQPage JSON-LD from h3+p pairs after the FAQ h2.
export const GUIDES = [
 {
  "slug": "read-a-pet-food-label",
  "title": "How to read a pet food label",
  "minutes": 4,
  "art": "cut-beagle",
  "summary": "Five parts of the bag that tell you what is really inside, and what the marketing leaves out.",
  "cta": {
   "label": "Find food",
   "href": "/foods"
  },
  "blocks": [
   [
    "p",
    "A pet food bag has a lot of words on the front and the useful facts on the back. These are the parts worth finding."
   ],
   [
    "p",
    "In the US, AAFCO lists what must be on a pet food label: the product name, the species it is for, the quantity, a guaranteed analysis, an ingredient statement, a nutritional adequacy statement, feeding directions for most complete foods, and the name and address of the maker or distributor."
   ],
   [
    "h2",
    "The guaranteed analysis"
   ],
   [
    "p",
    "AAFCO explains that \"crude\" refers to the lab method used, not the quality of the nutrient. For example, crude protein is worked out by measuring nitrogen and multiplying by 6.25."
   ],
   [
    "p",
    "This box lists the minimum crude protein and crude fat, and the maximum crude fibre and moisture. \"Minimum\" means the food has at least that much, so the real amount can be higher. The numbers are \"as fed\", which means they include the water in the food."
   ],
   [
    "h2",
    "The ingredient list"
   ],
   [
    "p",
    "The list does not give the amount of each ingredient. Names on the front follow AAFCO naming rules: \"Beef Dog Food\" must be at least 95% beef (not counting added water), a \"Beef Dinner\" or \"Entrée\" at least 25%, \"with beef\" at least 3%, and \"beef flavor\" only needs an ingredient that provides the flavor."
   ],
   [
    "p",
    "WSAVA's Global Nutrition Committee points out that the ingredient list gives no information on the quality of the ingredients and can be misleading about the overall quality of the food."
   ],
   [
    "p",
    "Ingredients are listed by weight, heaviest first. Fresh meat contains a lot of water, so it can appear first even when a dried ingredient further down adds more protein once the water is gone. Read the list as a rough order, not an exact recipe."
   ],
   [
    "h2",
    "The calorie statement"
   ],
   [
    "p",
    "A \"light\", \"lite\" or \"low-calorie\" claim has a ceiling. For example, AAFCO says a lite dry dog food cannot contain more than 3,100 kcal per kg."
   ],
   [
    "p",
    "Look for calories per kilogram and per cup or can. In the US, AAFCO's model regulations require it under a \"Calorie Content\" heading, in kcal per kg and per familiar unit such as a cup or can, so you can compare foods and work out a portion. If it is missing, ask the maker."
   ],
   [
    "h2",
    "The \"complete and balanced\" statement"
   ],
   [
    "p",
    "According to the FDA, a dog or cat food can say \"complete and balanced\" only if it meets an AAFCO Dog or Cat Food Nutrient Profile or passes a feeding trial using AAFCO procedures. AAFCO has two profiles per species: growth and reproduction, and adult maintenance. A food labelled \"for intermittent or supplemental feeding only\" is not meant to be fed on its own."
   ],
   [
    "p",
    "This says which life stage the food is made for, for example growth, adult maintenance or all life stages. A food for adults is not designed for a growing puppy, and an all-life-stages food has to meet the growth needs."
   ],
   [
    "h2",
    "What the front of the bag cannot tell you"
   ],
   [
    "ul",
    [
     "Words like \"natural\" or \"premium\" do not tell you how much protein, fat or calcium is inside.",
     "A photo of a roast chicken does not mean chicken is the main ingredient.",
     "Wet and dry foods look very different on the label because of water. See our guide to comparing per 1000 calories."
    ]
   ],
   [
    "note",
    "Our food finder shows the numbers per 1000 calories, so every food is on the same footing."
   ],
   [
    "src",
    [
     [
      "AAFCO: Reading Labels",
      "https://www.aafco.org/consumers/understanding-pet-food/reading-labels/"
     ],
     [
      "FDA: \"Complete and Balanced\" Pet Food",
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/complete-and-balanced-pet-food"
     ],
     [
      "WSAVA Global Nutrition Guidelines and toolkit",
      "https://wsava.org/global-guidelines/global-nutrition-guidelines/"
     ]
    ]
   ]
  ],
  "related": [
   "compare-per-1000-calories",
   "home-cooked-food-gaps"
  ]
 },
 {
  "slug": "compare-per-1000-calories",
  "title": "Why we compare foods per 1000 calories",
  "minutes": 3,
  "art": "cut-cat",
  "summary": "Wet and dry food cannot be compared by the percentages on the bag. This is the fair way.",
  "cta": {
   "label": "Find food",
   "href": "/foods"
  },
  "blocks": [
   [
    "p",
    "Compare the protein on a can of wet food with a bag of kibble and the can loses badly: 8% against 27%. But that is mostly water talking."
   ],
   [
    "h2",
    "The same protein in a different amount of food"
   ],
   [
    "p",
    "AAFCO's labelling rules ask for calorie content in kcal per kg \"as fed\", which is what makes this conversion possible from the label alone."
   ],
   [
    "p",
    "Wet food is around 75% water, so it carries far fewer calories in each gram. Your pet needs a set number of calories a day, so they eat a lot more wet food than kibble to get them."
   ],
   [
    "p",
    "The fair question is: how much protein comes with every 1000 calories? The sum is the percentage times 10,000, divided by the calories per kilogram."
   ],
   [
    "ul",
    [
     "Example dry food: 27% protein and 3,650 kcal per kg gives about 74 g per 1000 kcal.",
     "Example wet food: 8% protein and 1,050 kcal per kg gives about 76 g per 1000 kcal."
    ]
   ],
   [
    "p",
    "Two foods that looked miles apart turn out to be almost the same. The nutrient guidelines from AAFCO are also written per 1000 calories, which is why we use the same basis."
   ],
   [
    "note",
    "On the Foods page you can read numbers either as the percentage on the bag or per 1000 calories. Switch under \"Set your own numbers\"."
   ],
   [
    "src",
    [
     [
      "AAFCO: Reading Labels",
      "https://www.aafco.org/consumers/understanding-pet-food/reading-labels/"
     ]
    ]
   ]
  ],
  "related": [
   "read-a-pet-food-label",
   "safe-weight-loss-for-dogs"
  ]
 },
 {
  "slug": "puppy-kitten-growth-percentiles",
  "title": "Puppy and kitten growth, and what a percentile means",
  "minutes": 4,
  "art": "cut-puppy",
  "summary": "A growth chart shows where your pet sits among similar pets. The trend matters more than any single weight.",
  "cta": {
   "label": "See my pet's growth",
   "href": "/pet/growth"
  },
  "blocks": [
   [
    "p",
    "A percentile compares your pet with others of the same age. If your puppy is on the 56th percentile, they weigh more than 56 out of 100 similar puppies and less than the other 44. Neither high nor low is automatically better."
   ],
   [
    "h2",
    "Where our curves come from"
   ],
   [
    "p",
    "The dog study (Salt et al., 2017) analysed body weight records from more than 6 million young dogs seen at US veterinary hospitals, keeping only dogs that stayed healthy and in ideal body condition through their first 3 years. Its charts run from 12 weeks to 2 years of age and use five size groups that cover breeds up to 40 kg. The authors found that neutering shifted growth only slightly compared with normal differences between dogs."
   ],
   [
    "ul",
    [
     "Dogs: weights from US vet visits of dogs under three years old (Salt et al. 2017), grouped by adult size from toy to giant.",
     "Kittens: a veterinary dataset of kitten weights, all breeds together.",
     "Breed-specific curves are estimates. They use the size group of the breed, so treat them as a guide."
    ]
   ],
   [
    "h2",
    "The \"typical range\""
   ],
   [
    "p",
    "The shaded band on our chart runs from the 2nd to the 98th percentile. Most healthy pets sit inside it. Being outside it is a reason to ask your vet, not a diagnosis."
   ],
   [
    "h2",
    "Why the trend matters most"
   ],
   [
    "p",
    "Growth is not a straight line. A pet can move up or down a little between weigh-ins. A steady track along one band is reassuring. Crossing two bands up or down over a few weeks is worth mentioning to your vet."
   ],
   [
    "h2",
    "Setting a growth goal"
   ],
   [
    "p",
    "On your pet's growth chart, tap where you would like them to be, or pick a time frame from 1 week to 3 months and a target weight. We show the daily calories and the weekly change needed, and say whether that pace is safe. For a growing pet, the best goal is usually to keep following their own percentile line. These are estimates, not a vet diagnosis, so ask your vet before aiming to slow or reverse growth."
   ],
   [
    "h2",
    "How often to weigh"
   ],
   [
    "p",
    "Every two to four weeks while growing is plenty. Use the same scale and weigh at a similar time of day. For small pets, weigh yourself holding them, then subtract your own weight."
   ],
   [
    "note",
    "Large-breed puppies have a lower calcium maximum in AAFCO growth profiles than other dogs. We check this on every food. Sources: Salt C et al. PLoS ONE 2017;12(9):e0182064 (CC BY 4.0); AAFCO Dog and Cat Food Nutrient Profiles; 2014 AAHA Weight Management Guidelines (JAAHA). Last reviewed: 21 Oct 2026."
   ],
   [
    "src",
    [
     [
      "Salt C, et al. Growth standard charts for monitoring bodyweight in dogs of different sizes. PLoS ONE 2017;12(9):e0182064",
      "https://doi.org/10.1371/journal.pone.0182064"
     ],
     [
      "2021 AAHA Nutrition and Weight Management Guidelines for Dogs and Cats",
      "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/home/"
     ]
    ]
   ]
  ],
  "related": [
   "healthy-weight-body-condition",
   "safe-weight-loss-for-dogs"
  ]
 },
 {
  "slug": "puppy-growth-chart",
  "title": "Puppy growth chart: how big will my puppy get?",
  "minutes": 8,
  "art": "cut-puppy",
  "summary": "Read your puppy's percentile, estimate adult size, and turn a goal weight into safe daily calories. Kittens too.",
  "cta": {
   "label": "Open the growth chart",
   "href": "/growth"
  },
  "blocks": [
   [
    "p",
    "Wondering how big your puppy will get, or whether they are growing at the right speed? A puppy growth chart answers both. It shows where your pup's weight sits compared with many other puppies of the same age and size group, then lets you look ahead along their curve. Our free tool goes one step further: pick a target weight one week to three months away, and it suggests daily calories and tells you whether that pace is safe."
   ],
   [
    "p",
    "Here is how it works, in plain English, and how to use it for your puppy or kitten."
   ],
   [
    "h2",
    "What is a puppy growth chart?"
   ],
   [
    "p",
    "A growth chart plots weight against age. Instead of one \"correct\" line, it shows bands. Each band is a percentile: the share of similar puppies who weigh less than yours at the same age."
   ],
   [
    "p",
    "Our charts draw five lines: the 2nd, 25th, 50th, 75th and 98th percentiles. The light outer band (2nd to 98th) is the typical range, and most healthy puppies sit inside it. The darker middle band (25th to 75th) is where half of all puppies are."
   ],
   [
    "h2",
    "How dog weight percentiles work"
   ],
   [
    "p",
    "If your puppy is on the 60th percentile, they weigh more than 60 out of 100 similar puppies and less than the other 40. That is not a grade. A puppy on the 20th percentile can be just as healthy as one on the 80th. Percentiles describe size, not health."
   ],
   [
    "p",
    "What matters is the trend. Healthy puppies tend to follow roughly the same band as they grow. A small wobble between weigh-ins is normal. Crossing two bands up or down over a few weeks, or sitting outside the typical range, is a good reason to check in with your vet."
   ],
   [
    "h2",
    "How big will my puppy get?"
   ],
   [
    "p",
    "The simplest honest answer: follow their line forward. If your puppy has stayed near the 50th percentile for their size group, they will most likely finish near the middle of that group's adult weight range. A puppy who tracks the 75th line will likely end up toward the heavier end."
   ],
   [
    "p",
    "It is still an estimate. Growth spurts, genetics, neutering and mixed breeding all move the result. Giant breeds can keep filling out well past their first birthday, while toy breeds finish growing much sooner."
   ],
   [
    "h2",
    "Why we use size-group curves for each breed"
   ],
   [
    "p",
    "Our dog curves come from a large published study of puppy weights recorded at vet visits (Salt C, et al. \"Growth standard charts for monitoring bodyweight in dogs of different sizes.\" PLoS ONE 12(9): e0182064, 2017, using data from Banfield Pet Hospitals, published under CC BY 4.0). The researchers grouped dogs by expected adult size, from toy to giant, rather than by breed."
   ],
   [
    "p",
    "That study used more than 6 million young dogs' records, covers ages 12 weeks to 2 years, and its five size groups cover breeds up to 40 kg, so giant breeds above that are outside the published charts."
   ],
   [
    "p",
    "So when you enter a breed, we place your puppy in the size group that breed usually reaches as an adult. A Labrador puppy growth chart, for example, uses the large-dog curve. If you have a mixed breed or are not sure, you pick the closest expected adult size. This keeps the curves grounded in real data, but it means breed results are estimates, not a breed standard."
   ],
   [
    "h2",
    "Is there a kitten weight chart too?"
   ],
   [
    "p",
    "Yes. Kittens get their own chart built from a veterinary dataset of kitten weights, with all breeds combined. It works the same way: find the percentile, watch the trend and set a goal."
   ],
   [
    "h2",
    "What is a healthy weight for my dog?"
   ],
   [
    "p",
    "Weight alone does not tell the whole story. Vets also use a body condition score (BCS), usually on a 1 to 9 scale. AAHA's 2021 guidelines treat 4 to 5 as ideal: you can feel the ribs easily under a thin layer of fat, see a waist from above, and see a tuck behind the ribs from the side. Scores of 6 and up mean extra fat; 4 and below mean lean or thin."
   ],
   [
    "p",
    "Our tool asks for body shape after your first result. It uses the score to estimate an ideal weight for adult dogs and to decide which goals make sense. For example, if your pet already looks a healthy weight, it will flag a weight-loss target and suggest you only aim to lose if your vet advises it."
   ],
   [
    "h2",
    "How much should I feed my puppy?"
   ],
   [
    "p",
    "Feeding guides on the bag are a starting point, but they cover a wide range of dogs. Calories based on your own puppy are more precise. Here is the sum our tool does."
   ],
   [
    "ul",
    [
     "Resting energy (RER). The energy a body uses at rest: 70 × body weight in kg to the power of 0.75. A 10 kg puppy needs about 394 kcal a day at rest.",
     "Daily energy. RER multiplied by a life-stage factor. We use about 3 for puppies under 4 months and about 2 from 4 months until grown. Kittens use about 2.5.",
     "Turn calories into food. Divide by the food's calories (kcal per kg or per cup) to get grams or cups a day. Each food page shows this for your pet."
    ]
   ],
   [
    "p",
    "Every puppy is different, so treat the number as a starting point. Weigh every few weeks, check body shape, and adjust by small steps."
   ],
   [
    "h2",
    "How the growth goal planner turns a goal into calories"
   ],
   [
    "p",
    "This is the part owners love. On your pet's growth chart, tap where you would like them to be, or pick a time frame: 1 week, 2 weeks, 1 month, 2 months or 3 months. Then set a target weight. The tool shows three things."
   ],
   [
    "ul",
    [
     "Daily calories: how much energy a day is needed to reach that point, based on your pet's current calories.",
     "Weekly change: the percentage of body weight gained or lost each week.",
     "A safe-pace check: whether that speed is gentle, safe, or too fast."
    ]
   ],
   [
    "h2",
    "What counts as a safe pace?"
   ],
   [
    "p",
    "For adult dogs that need to lose weight, the 2014 AAHA Weight Management Guidelines for Dogs and Cats recommend losing roughly 1 to 2% of body weight per week. Our tool marks anything up to about 2% a week as safe, and flags faster goals so you can choose a longer time frame. It also holds calories above a safe minimum."
   ],
   [
    "h2",
    "Growing puppies: follow the curve, do not diet"
   ],
   [
    "p",
    "For a puppy or kitten that is still growing, the best goal is usually to keep following their own percentile line. We do not recommend weight-loss plans for growing pets without your vet. Puppies need steady energy and nutrients to build bones and muscle. If your puppy looks heavy, talk to your vet about slowing the climb rather than reversing it."
   ],
   [
    "h2",
    "How to use the puppy weight calculator, step by step"
   ],
   [
    "ul",
    [
     "Add your pet. Three quick questions: dog or cat, age, and current weight. Add a breed or pick an expected adult size.",
     "Open the growth chart. See where your pet sits and whether they are in the typical range.",
     "Pick a goal. Tap the chart or choose a time frame from 1 week to 3 months, then set a target weight.",
     "Read the result. Check daily calories, the weekly pace and the safety note. Save it as your goal if it looks right.",
     "Weigh in every 2 to 4 weeks. Log each weight to see the trend and adjust."
    ]
   ],
   [
    "p",
    "Then visit food matches to see how many grams a day of each food fits your pet's calories."
   ],
   [
    "h2",
    "Frequently asked questions"
   ],
   [
    "h3",
    "How big will my puppy get?"
   ],
   [
    "p",
    "Follow their percentile line forward. A puppy who has tracked near the 50th percentile for their size group will usually end up near the middle of that group's adult range. It is an estimate: growth spurts, genetics and mixed breeding all shift the result, and big breeds keep filling out after their first birthday."
   ],
   [
    "h3",
    "Is there a puppy weight calculator by breed?"
   ],
   [
    "p",
    "Our chart uses the adult size group your breed belongs to, from toy to giant, rather than a separate curve per breed. That keeps the curves grounded in real data, but it means a breed curve is an estimate. For a Labrador, for example, you would see the large-dog curve."
   ],
   [
    "h3",
    "What percentile should my puppy be?"
   ],
   [
    "p",
    "There is no best percentile. A puppy on the 20th and a puppy on the 80th can both be perfectly healthy. What matters is a steady track. Crossing two bands up or down within a few weeks, or sitting outside the 2nd to 98th percentile range, is worth raising with your vet."
   ],
   [
    "h3",
    "How much should I feed my puppy?"
   ],
   [
    "p",
    "Start with their resting energy (70 × body weight in kg to the power of 0.75) and multiply by a growth factor: about 3 for puppies under 4 months and about 2 after that. Then adjust using the bag's calorie content, regular weigh-ins and body condition. Our tool does this sum for you."
   ],
   [
    "h3",
    "Can I put my puppy on a diet?"
   ],
   [
    "p",
    "Not without your vet. Growing puppies need enough energy and nutrients to build bones and muscle, so we do not suggest weight-loss plans for them. If your puppy looks heavy, the usual approach is to slow the climb with your vet's guidance, not to make them lose weight."
   ],
   [
    "h3",
    "Is there a kitten weight chart too?"
   ],
   [
    "p",
    "Yes. Kittens get their own chart, built from a veterinary dataset of kitten weights with all breeds combined. It works the same way: see the percentile, pick a goal date and get daily calories."
   ],
   [
    "h3",
    "How often should I weigh my puppy?"
   ],
   [
    "p",
    "Every two to four weeks while they are growing. Use the same scale at a similar time of day. For small pups, weigh yourself holding them, then subtract your own weight."
   ],
   [
    "note",
    "General guidance, not veterinary advice. Growth curves and calorie figures are estimates. Always talk to your vet about your pet's health, especially before changing how much a growing puppy or kitten eats."
   ],
   [
    "src",
    [
     [
      "Salt C, et al. Growth standard charts for monitoring bodyweight in dogs of different sizes. PLoS ONE 2017;12(9):e0182064",
      "https://doi.org/10.1371/journal.pone.0182064"
     ],
     [
      "2021 AAHA Nutrition and Weight Management Guidelines for Dogs and Cats",
      "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/home/"
     ],
     [
      "AAHA 2021: Screening evaluation (BCS and MCS)",
      "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/screening-evaluation/"
     ],
     [
      "FDA: \"Complete and Balanced\" Pet Food",
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/complete-and-balanced-pet-food"
     ]
    ]
   ]
  ],
  "related": [
   "puppy-kitten-growth-percentiles",
   "healthy-weight-body-condition"
  ],
  "faq": true
 },
 {
  "slug": "healthy-weight-body-condition",
  "title": "Is my dog a healthy weight? The body condition score",
  "minutes": 4,
  "art": "cut-beagle",
  "summary": "A 1 to 9 scale you can check with your hands in a minute, and what each step means.",
  "cta": {
   "label": "Update my pet's profile",
   "href": "/pet/profile"
  },
  "blocks": [
   [
    "p",
    "Weight on the scales only tells part of the story. Vets use a body condition score, from 1 (very thin) to 9 (obese), where 4 to 5 is ideal. The 2021 AAHA guidelines suggest checking it, along with a muscle condition score, at every vet visit."
   ],
   [
    "h2",
    "Two quick checks"
   ],
   [
    "ul",
    [
     "Feel: you should be able to feel the ribs under a thin layer of fat, like the back of your hand with a flat palm.",
     "Look: from above there should be a waist behind the ribs, and from the side the tummy should tuck up."
    ]
   ],
   [
    "h2",
    "What the scores mean"
   ],
   [
    "p",
    "On AAHA's 9-point scale, 4 corresponds to roughly 15 to 19% body fat and 5 to 20 to 24%. Each step up adds about 5% body fat: a 6 is about 10% overweight, a 7 about 20%, an 8 about 30% and a 9 about 40% or more."
   ],
   [
    "p",
    "Muscle is scored separately as normal, or mild, moderate or severe loss. AAHA notes a pet can be overweight and still be losing muscle, so the two scores do not replace each other. WSAVA publishes free body and muscle condition charts for dogs and cats."
   ],
   [
    "ul",
    [
     "1 to 3: too thin. Ribs and bones show. Please see your vet.",
     "4 to 5: ideal.",
     "6: a little heavy, about 10% over ideal weight.",
     "7: heavy, about 20% over.",
     "8 to 9: very heavy, 30 to 40% over."
    ]
   ],
   [
    "p",
    "Each point above 5 is roughly 10% over ideal weight (AAHA). That is how we estimate an ideal weight from a score: current weight divided by one plus that percentage. For a 34 kg dog at score 7, the estimate is about 28 kg."
   ],
   [
    "h2",
    "Cats"
   ],
   [
    "p",
    "Cats are harder to judge by shape, and we do not yet use a score for them. We ask a simple question instead and recommend a vet check if you are unsure."
   ],
   [
    "note",
    "These are estimates for healthy adult dogs. Your vet can tell you the real ideal weight for your pet."
   ],
   [
    "src",
    [
     [
      "AAHA 2021: Screening evaluation (BCS and MCS)",
      "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/screening-evaluation/"
     ],
     [
      "2021 AAHA Nutrition and Weight Management Guidelines for Dogs and Cats",
      "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/home/"
     ],
     [
      "WSAVA Global Nutrition Guidelines and toolkit",
      "https://wsava.org/global-guidelines/global-nutrition-guidelines/"
     ]
    ]
   ]
  ],
  "related": [
   "safe-weight-loss-for-dogs",
   "puppy-kitten-growth-percentiles"
  ]
 },
 {
  "slug": "safe-weight-loss-for-dogs",
  "title": "Safe weight loss for dogs: how fast is too fast",
  "minutes": 5,
  "art": "cut-puppy",
  "summary": "Aim for about 1 to 2% of body weight a week. Here is how to set a goal that is safe, and what to look for in the food.",
  "cta": {
   "label": "Set a weight goal",
   "href": "/foods"
  },
  "blocks": [
   [
    "p",
    "Losing weight too quickly costs muscle and can make a dog ravenous and miserable. Too slowly and the plan loses momentum. The usual guidance is a middle path."
   ],
   [
    "h2",
    "The pace"
   ],
   [
    "p",
    "Before starting, the 2021 AAHA guidelines recommend a nutritional assessment that includes body weight, body condition score and muscle condition score, so your vet can set a realistic target."
   ],
   [
    "p",
    "The 2014 AAHA Weight Management Guidelines recommend about 1 to 2% of body weight lost each week for dogs, and 0.5 to 2% for cats. A 30 kg dog would lose roughly 300 to 600 grams a week. Our goal planner shows the weekly percentage for any target weight and number of days, and flags anything too fast."
   ],
   [
    "h2",
    "The calories"
   ],
   [
    "p",
    "A common starting point is 80% of the resting energy for the ideal weight. Do not go below 60% without a veterinary nutritionist. When we turn a weight change into calories we use about 7,700 kcal per kilogram of body weight, which is a rule of thumb, so treat results as estimates."
   ],
   [
    "h2",
    "What to look for in the food"
   ],
   [
    "ul",
    [
     "Calories: AAFCO allows \"light\" dry dog food to have at most 3,100 kcal per kg.",
     "Protein: a research review of weight-loss diets points to more than about 25% protein on a dry-matter basis, which helps keep muscle.",
     "Fat: the same review points to under about 10% fat.",
     "Fibre helps many dogs feel full."
    ]
   ],
   [
    "p",
    "There is no official standard for the protein and fat numbers in weight-loss foods, and not every \"light\" food works well. Treat them as sensible guides."
   ],
   [
    "h2",
    "A few habits that help"
   ],
   [
    "ul",
    [
     "Measure the food. A cup scoop varies a lot; kitchen scales do not.",
     "Count treats in the daily calories.",
     "Weigh every two to four weeks and adjust. We keep your streak if you skip one."
    ]
   ],
   [
    "note",
    "Please check with your vet before starting a weight-loss plan, and always for puppies, senior dogs or dogs with medical conditions."
   ],
   [
    "src",
    [
     [
      "2021 AAHA Nutrition and Weight Management Guidelines for Dogs and Cats",
      "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/home/"
     ],
     [
      "AAHA 2021: Screening evaluation (BCS and MCS)",
      "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/screening-evaluation/"
     ],
     [
      "WSAVA Global Nutrition Guidelines and toolkit",
      "https://wsava.org/global-guidelines/global-nutrition-guidelines/"
     ]
    ]
   ]
  ],
  "related": [
   "healthy-weight-body-condition",
   "compare-per-1000-calories"
  ]
 },
 {
  "slug": "foods-dangerous-for-pets",
  "title": "Foods that are dangerous for dogs and cats",
  "minutes": 3,
  "art": "cut-kitten",
  "summary": "A short list of everyday foods that can seriously harm a pet, and what to do if one is eaten.",
  "cta": {
   "label": "Check a food",
   "href": "/toxic"
  },
  "blocks": [
   [
    "p",
    "Many human foods are fine as a small treat, but a few are genuinely dangerous. These come up again and again in vet clinics."
   ],
   [
    "ul",
    [
     "Grapes and raisins: can cause kidney failure in dogs, even in small amounts.",
     "Chocolate and cocoa: contain theobromine, which is toxic. Darker chocolate is worse.",
     "Onion, garlic and leek: damage red blood cells in dogs and cats, raw, cooked or as powder.",
     "Xylitol: a sweetener in gum and some baked goods that is dangerous for dogs."
    ]
   ],
   [
    "h2",
    "If your pet has eaten something"
   ],
   [
    "p",
    "Do not wait for symptoms. Call your vet or a local animal poison helpline straight away and tell them what, how much and when. Do not make your pet vomit unless a professional tells you to."
   ],
   [
    "h2",
    "A note on \"safe\" foods"
   ],
   [
    "p",
    "The FDA notes that an occasional bite of people food may be fine, but too many table scraps can unbalance your pet's diet."
   ],
   [
    "p",
    "Our checker answers about feeding something as a snack. A complete pet food can contain small amounts of ingredients that are not suitable as a treat, such as certain plant extracts, and still be formulated safely. We flag clearly dangerous ingredients on every food."
   ],
   [
    "note",
    "Sources: ASPCA Animal Poison Control people foods list (https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets) and BioVet veterinary clinic network list (CC BY 4.0). In an emergency, call your vet or ASPCA APCC (888) 426-4435 in the US (fees may apply)."
   ],
   [
    "src",
    [
     [
      "ASPCA: People Foods to Avoid Feeding Your Pets",
      "https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets"
     ],
     [
      "FDA: \"Complete and Balanced\" Pet Food",
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/complete-and-balanced-pet-food"
     ]
    ]
   ]
  ],
  "related": [
   "read-a-pet-food-label",
   "home-cooked-food-gaps"
  ]
 },
 {
  "slug": "home-cooked-food-gaps",
  "title": "Home-cooked pet food: what is easy to miss",
  "minutes": 4,
  "art": "cut-pair",
  "summary": "Cooking for your pet can work, but a few nutrients are hard to get right without help.",
  "cta": {
   "label": "Check a recipe",
   "href": "/recipe"
  },
  "blocks": [
   [
    "p",
    "Plenty of owners cook for their pets, and it can be a good choice. The risk is that a recipe can taste perfect and still be missing something your pet needs for months or years."
   ],
   [
    "h2",
    "The usual gaps"
   ],
   [
    "ul",
    [
     "Calcium: meat is high in phosphorus and low in calcium, so the balance needs a calcium source.",
     "Vitamins and trace minerals such as vitamin D, iodine and zinc, which are added to commercial foods.",
     "Essential fatty acids, in the right balance.",
     "Taurine for cats. Cats cannot make enough, so it must be in the food."
    ]
   ],
   [
    "h2",
    "How to check a recipe"
   ],
   [
    "p",
    "For a food to be \"complete and balanced\", the FDA explains it must contain every nutrient in the relevant AAFCO profile at the recommended level, or pass an AAFCO feeding trial. Every nutrient has a minimum and some also have a maximum, so too much can be a problem as well as too little."
   ],
   [
    "p",
    "Our recipe checker totals the calories, protein, fat, calcium and phosphorus of your ingredients and compares them with AAFCO targets per 1000 calories. It does not check vitamins, trace minerals or fatty acids, so it can tell you a recipe is wrong but not that it is complete."
   ],
   [
    "h2",
    "Raw feeding"
   ],
   [
    "p",
    "WSAVA's Global Nutrition Committee publishes an infographic on the potential risks of raw meat based diets, and the 2021 AAHA guidelines include a section on home-prepared diets that is worth reading with your vet."
   ],
   [
    "p",
    "Raw meat can carry germs such as Salmonella that affect people in the house as well as pets. Wash hands and surfaces carefully, and ask your vet about the risks, especially with children or anyone vulnerable at home."
   ],
   [
    "note",
    "For anything you plan to feed long term, ask a veterinary nutritionist to review the recipe."
   ],
   [
    "src",
    [
     [
      "FDA: \"Complete and Balanced\" Pet Food",
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/complete-and-balanced-pet-food"
     ],
     [
      "WSAVA Global Nutrition Guidelines and toolkit",
      "https://wsava.org/global-guidelines/global-nutrition-guidelines/"
     ],
     [
      "2021 AAHA Nutrition and Weight Management Guidelines for Dogs and Cats",
      "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/home/"
     ]
    ]
   ]
  ],
  "related": [
   "foods-dangerous-for-pets",
   "compare-per-1000-calories"
  ]
 }
];
export const GUIDE_DISCLAIMER = 'General information, not veterinary advice. Last reviewed: 21 Oct 2026.';
export const guideBySlug = (slug) => GUIDES.find((g) => g.slug === slug);
