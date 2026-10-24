# Pet Diet & Weight Tracker (Flutter)

Clean layers (checked by `test/architecture_test.dart`):

- `lib/core`: theme (generated from `packages/tokens/tokens.json`), config, router.
- `lib/domain`: plain Dart values and contracts. **No calculations**: they all run in the `calc` Supabase Edge Function.
- `lib/data`: Supabase (auth, pets, foods, calc) and local settings. The only code that talks to a backend.
- `lib/presentation`: screens, widgets, providers. Reads results through `ref.calc` (see `providers/calc_api.dart`).

Run: `flutter run --dart-define-from-file=env.json` (copy `env.example.json`). Set `CALC_URL` to use a local `supabase functions serve`.

## Google sign-in inside the app

The app opens Google's own account picker (no browser) and gives the ID token to Supabase.

1. Google Cloud Console, APIs & Services, Credentials, Create credentials, OAuth client ID:
   - **Web application** (name "Pet Nutrition web"). Copy its client ID and secret. This is the one Supabase already uses.
   - **iOS**, bundle ID `com.munaruna.petNutritionMatcher`. Copy the client ID.
   - **Android**, package name `com.munaruna.pet_nutrition_matcher`, SHA-1 of your signing key (debug: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`; add the Play app-signing SHA-1 for release).
2. Supabase, Authentication, Providers, Google: keep the Web client ID and secret, and put **the iOS and Android client IDs, comma separated, in "Authorized Client IDs"**. Turn on "Skip nonce checks" for iOS.
3. `env.json`: add `GOOGLE_WEB_CLIENT_ID` (Web client ID) and `GOOGLE_IOS_CLIENT_ID` (iOS client ID).
4. iOS: `node tool/configure_google_ios.mjs <iOS client ID>` (adds the URL scheme and `GIDClientID` to `ios/Runner/Info.plist`).

Without client IDs the app falls back to the browser flow.
