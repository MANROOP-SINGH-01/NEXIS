import { NetworkContact } from '../types';

/**
 * Normalizes company names for fuzzy comparison
 * e.g. "Stripe, Inc." -> "stripe", "Google LLC" -> "google"
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|technologies|tech|solutions|systems|labs|group|holdings|co)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Scans candidate's network contacts for connections at a target company
 */
export function findNetworkMatches(
  companyName: string,
  contacts: NetworkContact[]
): NetworkContact[] {
  if (!companyName || !contacts || contacts.length === 0) return [];

  const targetNorm = normalizeCompanyName(companyName);
  if (!targetNorm) return [];

  return contacts.filter((contact) => {
    const contactCompNorm = normalizeCompanyName(contact.company);
    if (!contactCompNorm) return false;

    return (
      contactCompNorm === targetNorm ||
      contactCompNorm.includes(targetNorm) ||
      targetNorm.includes(contactCompNorm)
    );
  });
}

/**
 * Generates an authentic, non-slop warm referral message template
 * Strictly grounded in existing relationship and role relevance.
 */
export function generateWarmOutreachMessage(
  contact: NetworkContact,
  targetJobTitle: string,
  candidateName: string
): string {
  return `Hi ${contact.name.split(' ')[0]},\n\nI hope you're doing well! I saw that ${contact.company} is hiring for a ${targetJobTitle}.\n\nGiven your experience as ${contact.position}, I would love to get your quick perspective on the team's engineering priorities and culture.\n\nWould you be open to a brief 10-minute chat this week?\n\nBest,\n${candidateName}`;
}
