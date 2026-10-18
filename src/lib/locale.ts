export function flag(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => c.charCodeAt(0) + 127397))
    : "◎";
}
export function localeCountry(locale: string) {
  try {
    return new Intl.Locale(locale).region ?? "";
  } catch {
    return "";
  }
}
