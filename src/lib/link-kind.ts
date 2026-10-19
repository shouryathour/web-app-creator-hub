export type LinkSite = "youtube" | "linkedin-company" | "linkedin-person" | "linkedin" | "instagram" | "email" | "website";
export type LinkBox = "youtube" | "linkedin-company" | "linkedin-person" | "instagram" | "website";

const NAMES: Record<LinkSite, string> = {
  youtube: "a YouTube link",
  "linkedin-company": "a LinkedIn company page",
  "linkedin-person": "a personal LinkedIn profile",
  linkedin: "a LinkedIn link",
  instagram: "an Instagram link",
  email: "an email address",
  website: "a website link",
};
const BOX: Record<LinkBox, string> = {
  youtube: "a YouTube link",
  "linkedin-company": "a LinkedIn company page",
  "linkedin-person": "a personal LinkedIn profile",
  instagram: "an Instagram link",
  website: "a website",
};

export function detectLinkSite(value: string | null | undefined): LinkSite | null {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return null;
  if (/^(mailto:)?[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/.test(v)) return "email";
  const host = v.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").replace(/^m\./, "");
  if (/^(youtube\.com|youtu\.be)(\/|$)/.test(host)) return "youtube";
  if (/^([a-z]{2}\.)?linkedin\.com(\/|$)/.test(host)) {
    if (/linkedin\.com\/(company|school|showcase)\//.test(host)) return "linkedin-company";
    if (/linkedin\.com\/(in|pub)\//.test(host)) return "linkedin-person";
    return "linkedin";
  }
  if (/^(instagram\.com|instagr\.am)(\/|$)/.test(host)) return "instagram";
  return "website";
}

/** Warning text when a link doesn't belong in the box, or null when it's fine. */
export function linkMismatch(box: LinkBox, value: string | null | undefined): string | null {
  const site = detectLinkSite(value);
  if (!site || site === box) return null;
  if (site === "linkedin" && (box === "linkedin-company" || box === "linkedin-person")) return null;
  return `This is ${NAMES[site]}, not ${BOX[box]}.`;
}
