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
1. Create app: Pet Nutrition Matcher, App, Free. Package: `com.munaruna.pet_nutrition_matcher` (cannot change later).
2. Policy: privacy policy URL `https://munaruna.com/privacy`; Data safety (email, pet profile and weights collected, encrypted in transit, deletion on request); content rating (everyone); no ads; Health apps declaration: not a medical app.
3. Testing: new personal accounts must run a closed test with 12+ testers for 14 days before production.
4. Upload the .aab to Internal testing first, then Closed, then Production.

## Listing text
- Title (30): Pet Nutrition Matcher
- Short (80): Dog and cat diet tracker: daily calories, food nutrition and weight growth.
- Full: Free pet diet and food nutrition tracker for dogs and cats. Build a profile to get daily calorie and nutrient targets, see how foods compare per 1000 kcal against AAFCO, track weight on a growth chart with percentile, check homemade recipes, and look up toxic foods. General guidance, not veterinary advice.
- Graphics needed (not generated yet): 512x512 icon (assets/icon/icon.png), 1024x500 feature graphic, 2-8 phone screenshots.
