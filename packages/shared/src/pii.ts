const MAX_INPUT = 100_000;

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CARD_RE = /\b\d(?:[ -]?\d){12,15}\b/g;
const ADDRESS_RE = /\b\d{1,5}\s+(?:[A-Za-z]{1,20}\s){1,4}(?:St|Ave|Rd|Blvd|Dr|Ln|Ct|Way|Pl)\b\.?/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const API_KEY_RE = /\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36}|AKIA[A-Z0-9]{16})\b/g;

function luhn(n: string): boolean {
  const digits = n.replace(/[ -]/g, "");
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i] ?? "0", 10);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function piiStrip(text: string): string {
  const input = text.length > MAX_INPUT ? text.slice(0, MAX_INPUT) : text;
  return input
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(PHONE_RE, "[PHONE]")
    .replace(SSN_RE, "[SSN]")
    .replace(CARD_RE, (match) => (luhn(match) ? "[CARD]" : match))
    .replace(ADDRESS_RE, "[ADDRESS]")
    .replace(JWT_RE, "[JWT]")
    .replace(API_KEY_RE, "[API_KEY]");
}
