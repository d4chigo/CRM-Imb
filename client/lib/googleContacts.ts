const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function authHeaders(): Record<string,string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getGoogleContactsAuthUrl(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/google/contacts/auth-url`, { headers: { ...authHeaders() } });
  if (!res.ok) {
    const text = await res.text();
    console.error('[googleImport] fallo auth-url', res.status, text);
    throw new Error('No se pudo obtener URL de Google');
  }
  if (!res.ok) throw new Error('No se pudo obtener URL de Google');
  const data = await res.json();
  console.log('[googleImport] auth-url obtenida');
  return data.url;
}

export function openGoogleImportPopup(url: string) {
  const w = 600; const h = 650;
  const left = window.screenX + (window.outerWidth - w)/2;
  const top = window.screenY + (window.outerHeight - h)/2;
  return window.open(url, 'googleImport', `width=${w},height=${h},left=${left},top=${top}`);
}