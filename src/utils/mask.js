// Value masking for display. Secrets are masked by default; the key name
// decides what counts as a secret.

const SECRET_KEY = /KEY|TOKEN|SECRET|PASS|PWD|DSN|URL|URI|AUTH|CREDENTIAL|PRIVATE|WEBHOOK|COOKIE|SALT|SIGNING|JWT|BEARER|SESSION|CERT/i;

export function isSecretKey(key) {
  return SECRET_KEY.test(String(key || ''));
}

const DOTS = '••••••••';

// A path segment that carries a credential rather than naming a resource
function looksLikeToken(seg) {
  if (seg.length >= 20) return true;
  return seg.length >= 10 && /\d/.test(seg) && /[A-Za-z]/.test(seg) && !/^v\d+$/i.test(seg);
}

/**
 * Mask a value for display, keeping just enough to recognise it:
 * a known prefix (sk-proj-, ghp_ …) and the last 4 characters.
 * URLs keep scheme and host; credentials, token-like path segments and the
 * query string are hidden.
 */
export function maskValue(key, value) {
  const v = String(value ?? '');
  if (!isSecretKey(key) || v === '') return v;

  const url = v.match(/^([a-z][a-z0-9+.-]*:\/\/)([^@/]+)@(.*)$/i);
  if (url) {
    const user = url[2].includes(':') ? url[2].split(':')[0] + ':' : '';
    return `${url[1]}${user}••••••@${url[3]}`;
  }
  const bare = v.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]*)([^?#]*)(.*)$/i);
  if (bare) {
    // No user:pass, but tokens also travel in the path (webhooks) and query
    const pathPart = bare[2].split('/').map(seg => (looksLikeToken(seg) ? '••••••' : seg)).join('/');
    const query = bare[3] ? (bare[3].startsWith('#') ? bare[3] : '?••••••') : '';
    return bare[1] + pathPart + query;
  }

  if (v.length <= 8) return DOTS;
  const prefix = (v.match(/^[A-Za-z]+[-_](?:[A-Za-z0-9]{2,4}[-_])?/) || [''])[0];
  return prefix + DOTS + v.slice(-4);
}
