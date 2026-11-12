// Keep the request and role policies reusable and directly testable.
export function requestOriginAllowed(req, origins) {
  const origin = req.get('origin');
  if (origin) return origins.has(origin);
  return req.get('sec-fetch-site') !== 'cross-site';
}
export function canEditMember(actor, target, patch) {
  if (actor.is_owner) return true;
  return !target.is_owner && !Object.hasOwn(patch ?? {}, 'role') && !Object.hasOwn(patch ?? {}, 'is_admin');
}

export function verifiedDiscordEmail(profile) {
  return profile.verified === true && typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : null;
}
export function privilegedEmail(email, ownerEmail, adminEmail) {
  return Boolean(email && ((ownerEmail && email === ownerEmail) || (adminEmail && email === adminEmail)));
}
