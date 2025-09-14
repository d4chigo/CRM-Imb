import { authService } from '@/lib/auth'

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
  // Usar el fetch autenticado para que refresque el token si está expirado
  const res = await authService.authenticatedFetch(`/api/google/contacts/auth-url`, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    console.error('[googleImport] fallo auth-url', res.status, text);
    try {
      const json = JSON.parse(text);
      throw new Error(`[googleImport] fallo auth-url ${res.status} ${JSON.stringify(json)}`);
    } catch {
      throw new Error('No se pudo obtener URL de Google');
    }
  }
  const data = await res.json();
  console.log('[googleImport] auth-url obtenida');
  return data.url;
}

export async function getGoogleSyncStatus(): Promise<{ connected: boolean; syncEnabled: boolean; lastSync: string | null }>{
  const res = await authService.authenticatedFetch(`/api/google/contacts/sync/status`, { method: 'GET' });
  if (!res.ok) throw new Error('No se pudo obtener estado de Google');
  const json = await res.json();
  return json.data || { connected: false, syncEnabled: false, lastSync: null };
}

export async function manualGoogleSync(): Promise<{ synced:number; total:number }>{
  const res = await authService.authenticatedFetch(`/api/google/contacts/sync`, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(text || 'No se pudo sincronizar con Google');
  }
  const json = await res.json();
  return json.data || { synced: 0, total: 0 };
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