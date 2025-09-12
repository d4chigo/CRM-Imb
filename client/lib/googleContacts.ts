const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function authHeaders(): Record<string,string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function upsertGoogleContact(payload: { nombre?: string; apellido?: string; email?: string; telefono?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/google/contacts/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() } as HeadersInit,
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const text = await res.text().catch(()=> '')
    throw new Error(text || 'No se pudo crear/actualizar el contacto en Google')
  }
  return res.json()
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

export async function createGoogleContact(payload: { nombre?: string; apellido?: string; email?: string; telefono?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/google/contacts/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() } as HeadersInit,
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    // No romper el flujo principal; lanza error para logging del caller
    const text = await res.text().catch(()=> '')
    throw new Error(text || 'No se pudo crear el contacto en Google')
  }
  return res.json()
}