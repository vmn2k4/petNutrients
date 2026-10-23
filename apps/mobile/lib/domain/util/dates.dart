// Date helpers. Dates are kept as ISO "yyyy-MM-dd" strings (as the web app and the database do) and read as UTC midnight,
// so a day is the same day on every device.
DateTime parseIso(String iso) => DateTime.parse('${iso.substring(0, 10)}T00:00:00Z');

String isoDay(DateTime d) {
  final u = d.toUtc();
  return '${u.year.toString().padLeft(4, '0')}-${u.month.toString().padLeft(2, '0')}-${u.day.toString().padLeft(2, '0')}';
}

String todayStr([DateTime? now]) => isoDay(now ?? DateTime.now());

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// "22 Oct 2026"
String fmtDay(String iso) {
  final d = parseIso(iso);
  return '${d.day} ${_months[d.month - 1]} ${d.year}';
}

String ordinal(int n) {
  const s = ['th', 'st', 'nd', 'rd'];
  final v = n % 100;
  final idx = (v - 20) % 10;
  final suffix = (idx >= 0 && idx < 4) ? s[idx] : (v >= 0 && v < 4 ? s[v] : s[0]);
  return '$n$suffix';
}
