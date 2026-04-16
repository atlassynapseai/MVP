const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CARD_RE = /\b\d(?:[ -]?\d){12,15}\b/g;
const ADDRESS_RE = /\b\d{1,5}\s+(?:[A-Za-z]+\s){1,4}(?:St|Ave|Rd|Blvd|Dr|Ln|Ct|Way|Pl)\b\.?/gi;

export function piiStrip(text: string): string {
  return text
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(PHONE_RE, "[PHONE]")
    .replace(SSN_RE, "[SSN]")
    .replace(CARD_RE, "[CARD]")
    .replace(ADDRESS_RE, "[ADDRESS]");
}
