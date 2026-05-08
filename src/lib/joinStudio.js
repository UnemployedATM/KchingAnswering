/**
 * Shared helpers for the studio invite-token flow.
 * Used by both unauthenticated Auth.jsx and authenticated JoinStudio.jsx.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate a raw token (format + existence) and return the matching studio row.
 * Throws a friendly Error if the token is malformed or doesn't match any studio.
 *
 * @param {string} rawToken
 * @param {SupabaseClient} supabase
 * @returns {Promise<{id, name, brand_name, primary_color, logo_url, tagline}>}
 */
export async function validateStudioToken(rawToken, supabase) {
  const t = (rawToken ?? '').trim();
  if (!t) throw new Error('Enter your studio invite token to continue.');
  if (!UUID_RE.test(t)) {
    throw new Error("That token doesn't look right. Ask your studio for the link or QR code.");
  }
  const { data, error } = await supabase
    .from('studios')
    .select('id, name, brand_name, primary_color, logo_url, tagline')
    .eq('id', t)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No studio found for that token. Double-check with your studio.');
  return data;
}

/**
 * Call the join_studio RPC to create a client_studio_memberships row.
 * Throws on failure (caller should surface a friendly message).
 *
 * @param {string} studioId
 * @param {SupabaseClient} supabase
 */
export async function joinStudioById(studioId, supabase) {
  const { error } = await supabase.rpc('join_studio', { p_studio_id: studioId });
  if (error) throw error;
}

/**
 * Extract a usable token from raw QR text. Accepts:
 *   - Bare studio UUID
 *   - URL with ?studio=<uuid> (e.g. https://app.com/auth?studio=...)
 *   - URL with ?token=<uuid>
 *   - Deep link such as com.bidaman.serenityclient://join?studio=<uuid>
 * Falls back to returning the trimmed raw text untouched.
 */
export function extractTokenFromQr(rawText) {
  let extracted = (rawText ?? '').trim();
  try {
    const url = new URL(extracted);
    const param = url.searchParams.get('studio') ?? url.searchParams.get('token');
    if (param) extracted = param;
  } catch { /* not a URL — treat as raw token */ }
  return extracted;
}
