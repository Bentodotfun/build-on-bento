// Team name -> ISO 3166-1 alpha-2 code, for real flag images (flagcdn.com).
// Covers the 2026 World Cup field plus common nations.
const ISO: Record<string, string> = {
  argentina: "ar",
  france: "fr",
  spain: "es",
  england: "gb-eng",
  brazil: "br",
  portugal: "pt",
  netherlands: "nl",
  germany: "de",
  belgium: "be",
  italy: "it",
  croatia: "hr",
  uruguay: "uy",
  colombia: "co",
  mexico: "mx",
  usa: "us",
  "united states": "us",
  norway: "no",
  switzerland: "ch",
  denmark: "dk",
  japan: "jp",
  "south korea": "kr",
  korea: "kr",
  morocco: "ma",
  senegal: "sn",
  ghana: "gh",
  nigeria: "ng",
  cameroon: "cm",
  ivorycoast: "ci",
  "ivory coast": "ci",
  ecuador: "ec",
  peru: "pe",
  chile: "cl",
  canada: "ca",
  australia: "au",
  poland: "pl",
  serbia: "rs",
  austria: "at",
  sweden: "se",
  wales: "gb-wls",
  scotland: "gb-sct",
  turkey: "tr",
  "türkiye": "tr",
  ukraine: "ua",
  "saudi arabia": "sa",
  qatar: "qa",
  iran: "ir",
  egypt: "eg",
  algeria: "dz",
  tunisia: "tn",
  "costa rica": "cr",
  paraguay: "py",
  "new zealand": "nz",
  panama: "pa",
  jamaica: "jm",
  "south africa": "za",
  greece: "gr",
  romania: "ro",
  "czech republic": "cz",
  czechia: "cz",
  hungary: "hu",
  slovenia: "si",
  slovakia: "sk",
  finland: "fi",
  ireland: "ie",
  "cape verde": "cv",
  uzbekistan: "uz",
  jordan: "jo",
  "new caledonia": "nc",
  bolivia: "bo",
  venezuela: "ve",
  honduras: "hn",
  haiti: "ht",
  "curacao": "cw",
};

export function isoForTeam(name: string): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return ISO[key] ?? null;
}

/** Real flag image URL (PNG). width ~ 40|80|160|320. */
export function flagUrl(name: string, w: 40 | 80 | 160 | 320 = 160): string | null {
  const iso = isoForTeam(name);
  if (!iso) return null;
  return `https://flagcdn.com/w${w}/${iso}.png`;
}

/** 2-3 letter monogram fallback when no flag is mapped. */
export function monogram(name: string): string {
  return (name || "?").replace(/[^a-zA-Z ]/g, "").slice(0, 3).toUpperCase();
}

const TEAM_COLOR: Record<string, string> = {
  argentina: "#6cace4",
  france: "#1a2a6c",
  spain: "#c60b1e",
  england: "#cf1020",
  brazil: "#009c3b",
  portugal: "#c8102e",
  netherlands: "#f36c21",
  germany: "#111111",
  belgium: "#c8102e",
  italy: "#0b4ea2",
  croatia: "#ce1126",
  norway: "#ba0c2f",
  switzerland: "#d52b1e",
  usa: "#3c3b6e",
  mexico: "#006341",
  japan: "#bc002d",
  morocco: "#c1272d",
  senegal: "#00853f",
  colombia: "#fcd116",
  uruguay: "#7b9ec9",
  denmark: "#c60c30",
};

/** Brand-ish accent color for a team, for card gradients. Hash fallback. */
export function teamColor(name: string): string {
  const key = (name || "").trim().toLowerCase();
  if (TEAM_COLOR[key]) return TEAM_COLOR[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return `hsl(${h} 62% 42%)`;
}
