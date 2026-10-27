export const NAME_RE = /^[A-ZÑ]+(?: [A-ZÑ ]+)*$/; // for surnames, first names
export const MI_RE = /^[A-ZÑ]{1,2}$/; // middle initial (1-2 letters)

export const NAME_PATTERN = "[A-ZÑ]+(?: [A-ZÑ ]+)*";
export const MI_PATTERN = "[A-ZÑ]{1,2}";

export const NAME_MAX = 50;

export interface NameParts {
  surname: string;
  firstName: string;
  middleInitial: string;
}

export type NameResult =
  | { ok: true; value: NameParts }
  | { ok: false; error: string };

// Uppercase, trim, and collapse repeated spaces so "dela   cruz" passes.
const clean = (s: unknown) =>
  typeof s === "string" ? s.trim().replace(/\s+/g, " ").toLocaleUpperCase("en") : "";

export function parseName(input: {
  surname?: unknown;
  firstName?: unknown;
  middleInitial?: unknown;
}): NameResult {
  const surname = clean(input.surname);
  const firstName = clean(input.firstName);
  const middleInitial = clean(input.middleInitial).replace(/\.$/, ""); // allow "P."

  if (!NAME_RE.test(surname) || surname.length > NAME_MAX) {
    return { ok: false, error: "Invalid surname. Use letters (A-Z, Ñ) and spaces only." };
  }
  if (!NAME_RE.test(firstName) || firstName.length > NAME_MAX) {
    return { ok: false, error: "Invalid first name. Use letters (A-Z, Ñ) and spaces only." };
  }
  if (middleInitial && !MI_RE.test(middleInitial)) {
    return { ok: false, error: "Middle initial must be 1-2 letters." };
  }

  return { ok: true, value: { surname, firstName, middleInitial } };
}

/** "DELA CRUZ, JUAN P." (the middle initial is left out when empty). */
export function formatFullName(p: {
  surname: string;
  firstName: string;
  middleInitial?: string;
}): string {
  return `${p.surname}, ${p.firstName}${p.middleInitial ? ` ${p.middleInitial}.` : ""}`;
}

/** Name to print for a stored ticket. Old tickets only have a single `name`. */
export function displayName(t: {
  surname?: string;
  firstName?: string;
  middleInitial?: string;
  name?: string;
}): string {
  if (t.surname && t.firstName) {
    return formatFullName({
      surname: t.surname,
      firstName: t.firstName,
      middleInitial: t.middleInitial ?? "",
    });
  }
  return t.name ?? "";
}
