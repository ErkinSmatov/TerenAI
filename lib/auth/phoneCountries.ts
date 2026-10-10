// Страны СНГ для входа по телефону (D-12). Чистый модуль без runtime-импортов.
// Коды стран — допущение A8, сверены с E.164.

export type PhoneCountry = {
  iso: string;
  name: string;
  flag: string;
  dialCode: string;
  nationalDigits: number;
  groups: number[];
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "KZ", name: "Казахстан", flag: "🇰🇿", dialCode: "7", nationalDigits: 10, groups: [3, 3, 2, 2] },
  { iso: "RU", name: "Россия", flag: "🇷🇺", dialCode: "7", nationalDigits: 10, groups: [3, 3, 2, 2] },
  { iso: "UZ", name: "Узбекистан", flag: "🇺🇿", dialCode: "998", nationalDigits: 9, groups: [2, 3, 2, 2] },
  { iso: "KG", name: "Кыргызстан", flag: "🇰🇬", dialCode: "996", nationalDigits: 9, groups: [3, 3, 3] },
  { iso: "TJ", name: "Таджикистан", flag: "🇹🇯", dialCode: "992", nationalDigits: 9, groups: [2, 3, 2, 2] },
  { iso: "AZ", name: "Азербайджан", flag: "🇦🇿", dialCode: "994", nationalDigits: 9, groups: [2, 3, 2, 2] },
  { iso: "GE", name: "Грузия", flag: "🇬🇪", dialCode: "995", nationalDigits: 9, groups: [3, 3, 3] },
  { iso: "BY", name: "Беларусь", flag: "🇧🇾", dialCode: "375", nationalDigits: 9, groups: [2, 3, 2, 2] },
  { iso: "AM", name: "Армения", flag: "🇦🇲", dialCode: "374", nationalDigits: 8, groups: [2, 3, 3] },
  { iso: "MD", name: "Молдова", flag: "🇲🇩", dialCode: "373", nationalDigits: 8, groups: [2, 3, 3] },
  { iso: "TM", name: "Туркменистан", flag: "🇹🇲", dialCode: "993", nationalDigits: 8, groups: [2, 3, 3] },
];

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = PHONE_COUNTRIES[0];

export function extractNationalDigits(
  country: PhoneCountry,
  rawInput: string,
): string {
  let digits = rawInput.replace(/\D/g, "");
  if (rawInput.trim().startsWith("+") && digits.startsWith(country.dialCode)) {
    // Код страны введён целиком вместе с "+"
    digits = digits.slice(country.dialCode.length);
  } else if (
    country.dialCode === "7" &&
    (digits.startsWith("7") || digits.startsWith("8"))
  ) {
    // Ведущие 7/8 по привычке — только для +7
    digits = digits.slice(1);
  }
  return digits.slice(0, country.nationalDigits);
}

export function formatNationalNumber(
  country: PhoneCountry,
  digits: string,
): string {
  const parts: string[] = [];
  let offset = 0;
  for (const size of country.groups) {
    const part = digits.slice(offset, offset + size);
    offset += size;
    if (part) parts.push(part);
  }
  return `+${country.dialCode} ` + parts.join(" ");
}

export function toE164(country: PhoneCountry, digits: string): string {
  return `+${country.dialCode}${digits}`;
}

export function isCompleteNationalNumber(
  country: PhoneCountry,
  digits: string,
): boolean {
  return digits.length === country.nationalDigits;
}
