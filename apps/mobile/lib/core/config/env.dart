/// Build-time configuration, passed with `--dart-define-from-file=env.json` (see env.example.json). The Supabase anon key is a public
/// client key (row-level security protects the data), but it is still kept out of source control.
class Env {
  Env._();
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  /// Optional override for the calculation function (for example a local `supabase functions serve`). Empty uses the project's own.
  static const calcUrl = String.fromEnvironment('CALC_URL');

  /// Google sign-in inside the app. The iOS client ID is the one for the iOS app; the web client ID is the one added to the Supabase
  /// Google provider (it is the audience of the token the phone gets). Android needs only the web client ID.
  static const googleIosClientId = String.fromEnvironment('GOOGLE_IOS_CLIENT_ID');
  static const googleWebClientId = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');
  static bool get hasNativeGoogle => googleWebClientId.isNotEmpty;

  /// Where the web Google sign-in (the fallback when no client IDs are set) returns to: the app's own URL scheme (set in AndroidManifest.xml and Info.plist).
  static const authRedirect = String.fromEnvironment('AUTH_REDIRECT', defaultValue: 'com.munaruna.petnutritionmatcher://login-callback/');

  /// The site address shown in credits and share links.
  static const siteUrl = String.fromEnvironment('SITE_URL', defaultValue: 'https://munaruna.com');

  static bool get hasBackend => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
