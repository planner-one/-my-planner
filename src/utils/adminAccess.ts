const ADMIN_EMAIL_SHA256 = 'd0e4bd80e8758769e0e7533ebbf3a510c0924e632d40732a2d05e2df71a62f86'

export async function isAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false

  const bytes = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = Array.from(new Uint8Array(digest))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')

  return hash === ADMIN_EMAIL_SHA256
}
