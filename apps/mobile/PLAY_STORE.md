# Play Store release

## Build
```bash
flutter build appbundle --release --dart-define-from-file=env.json
# -> build/app/outputs/bundle/release/app-release.aab
```
Bump `version:` in pubspec.yaml (`1.0.1+2`) for every upload: the number after `+` must increase.

## Signing (never commit)
`android/key.properties` and `android/upload-keystore.jks` are git-ignored. Back both up (password manager). Losing the upload key means a reset request to Google. Enrol in Play App Signing when creating the app.
Google sign-in: add the SHA-1 of the upload key AND of the Play App Signing key (Play Console > App integrity) to the Android OAuth client.
`keytool -list -v -keystore android/upload-keystore.jks -alias upload`

## Console steps (account owner only)
1. Create app: Pet Diet & Weight Tracker, App, Free. Package: `com.munaruna.pet_nutrition_matcher` (cannot change later).
2. Policy: privacy policy URL `https://munaruna.com/privacy`; Data safety (email, pet profile and weights collected, encrypted in transit, deletion on request); content rating (everyone); no ads; Health apps declaration: not a medical app.
3. Testing: new personal accounts must run a closed test with 12+ testers for 14 days before production.
4. Upload the .aab to Internal testing first, then Closed, then Production.

## Listing text
- Title (30): Pet Diet & Weight Tracker (25)
- Short (80): Dog & cat diet tracker: daily calories, food nutrition, weight and growth chart.
- Full: Free pet diet and food nutrition tracker for dogs and cats. Build a profile to get daily calorie and nutrient targets, see how foods compare per 1000 kcal against AAFCO, track weight on a growth chart with percentile, check homemade recipes, and look up toxic foods. General guidance, not veterinary advice.
- Graphics: store_assets/play/ (7 phone screenshots 1080x1920, feature-graphic-1024x500.png, icon-512.png), built with HyperFrames; sources in store_assets/src/. Screenshot 1 is the real Android app; 2-7 are the web version's screens (the app needs a Google sign-in). Replace with signed-in app captures when possible.
