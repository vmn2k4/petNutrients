import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'tokens.g.dart';

/// Our semantic colours (good / caution / chart ...) on top of Material's ColorScheme. Read them with `context.colors`.
class AppColorsX extends ThemeExtension<AppColorsX> {
  const AppColorsX(this.p);
  final AppPalette p;

  @override
  AppColorsX copyWith({AppPalette? p}) => AppColorsX(p ?? this.p);

  @override
  AppColorsX lerp(ThemeExtension<AppColorsX>? other, double t) => t < 0.5 ? this : (other as AppColorsX? ?? this);
}

extension AppThemeContext on BuildContext {
  AppPalette get colors => Theme.of(this).extension<AppColorsX>()!.p;
  TextTheme get text => Theme.of(this).textTheme;
}

/// The one place the Material theme is built. Everything reads colours, sizes, radii and fonts from the generated tokens.
class AppTheme {
  AppTheme._();

  static ThemeData get light => _build(AppColors.light, Brightness.light);
  static ThemeData get dark => _build(AppColors.dark, Brightness.dark);

  /// Display font (headings) and body font, from the token names.
  static TextStyle display(TextStyle base) => GoogleFonts.getFont(AppFonts.display, textStyle: base);
  static TextStyle body(TextStyle base) => GoogleFonts.getFont(AppFonts.body, textStyle: base);

  static ThemeData _build(AppPalette c, Brightness b) {
    final scheme = ColorScheme(
      brightness: b,
      primary: c.primary,
      onPrimary: c.onPrimary,
      primaryContainer: c.primarySoft,
      onPrimaryContainer: c.fg,
      secondary: c.ink,
      onSecondary: c.onInk,
      error: c.bad,
      onError: c.onPrimary,
      surface: c.surface,
      onSurface: c.fg,
      surfaceContainerHighest: c.surface2,
      outline: c.border,
      outlineVariant: c.border,
    );

    TextStyle h(double size, FontWeight w) => display(TextStyle(fontSize: size, fontWeight: w, color: c.fg, height: 1.1, letterSpacing: -0.2));
    TextStyle t(double size, {FontWeight w = FontWeight.w400, Color? color}) => body(TextStyle(fontSize: size, fontWeight: w, color: color ?? c.fg, height: 1.45));

    final textTheme = TextTheme(
      displaySmall: h(AppText.xxl, FontWeight.w700),
      headlineMedium: h(AppText.xl, FontWeight.w600),
      headlineSmall: h(AppText.lg + 2, FontWeight.w600),
      titleLarge: h(AppText.lg, FontWeight.w600),
      titleMedium: t(AppText.md, w: FontWeight.w600),
      titleSmall: t(AppText.sm, w: FontWeight.w600),
      bodyLarge: t(AppText.md),
      bodyMedium: t(AppText.sm),
      bodySmall: t(AppText.xs, color: c.fgMuted),
      labelLarge: t(AppText.sm, w: FontWeight.w600),
      labelMedium: t(AppText.xs, w: FontWeight.w600),
    );

    OutlineInputBorder border(Color col, [double w = 1.5]) => OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md), borderSide: BorderSide(color: col, width: w));

    return ThemeData(
      useMaterial3: true,
      brightness: b,
      colorScheme: scheme,
      scaffoldBackgroundColor: c.bg,
      canvasColor: c.bg,
      textTheme: textTheme,
      dividerColor: c.border,
      splashFactory: InkSparkle.splashFactory,
      extensions: [AppColorsX(c)],
      appBarTheme: AppBarTheme(
        backgroundColor: c.bg,
        foregroundColor: c.fg,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: h(AppText.lg, FontWeight.w600),
      ),
      cardTheme: CardThemeData(
        color: c.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg), side: BorderSide(color: c.border)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: AppSpace.s4, vertical: AppSpace.s3),
        enabledBorder: border(c.border),
        focusedBorder: border(c.primary, 2),
        errorBorder: border(c.bad),
        focusedErrorBorder: border(c.bad, 2),
        hintStyle: t(AppText.sm, color: c.fgMuted),
        labelStyle: t(AppText.sm, color: c.fgMuted),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg))),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: c.surface,
        indicatorColor: AppColors.brandYellow,
        height: AppSize.navHeight,
        labelTextStyle: WidgetStatePropertyAll(t(AppText.xs, w: FontWeight.w600)),
        iconTheme: WidgetStatePropertyAll(IconThemeData(color: c.fg, size: 24)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.ink,
        contentTextStyle: t(AppText.sm, color: c.onInk),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      ),
      sliderTheme: SliderThemeData(activeTrackColor: c.primary, thumbColor: c.primary, inactiveTrackColor: c.surface2, overlayColor: c.primary.withValues(alpha: 0.12)),
      switchTheme: SwitchThemeData(
        thumbColor: const WidgetStatePropertyAll(Colors.white),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.primary : c.border),
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(builders: {
        TargetPlatform.android: CupertinoPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      }),
    );
  }
}
