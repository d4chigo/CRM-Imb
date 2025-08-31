const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function authHeaders(): Record<string,string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ContactDTO { id?: number; nombre: string; email?: string; telefono?: string; tipo?: string; origen?: string; notas?: string; creado_en?: string; }

export async function fetchContacts(): Promise<ContactDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/contacts`, { headers: { ...authHeaders() } as HeadersInit, credentials: 'include' });
  if (!res.ok) throw new Error('Error listando contactos');
  const data = await res.json();
  return data.data || [];
}

export async function createContact(contact: ContactDTO): Promise<ContactDTO> {
  const res = await fetch(`${API_BASE_URL}/api/contacts`, { method: 'POST', headers: { 'Content-Type':'application/json', ...authHeaders() } as HeadersInit, body: JSON.stringify(contact), credentials: 'include' });
  if (!res.ok) throw new Error('Error creando contacto');
  const data = await res.json();
  return data.data;
}

export async function deleteContact(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, { method: 'DELETE', headers: { ...authHeaders() } as HeadersInit, credentials: 'include' });
  if (!res.ok) {
    let serverMsg = ''
    try {
      const data = await res.json();
      serverMsg = data?.message || ''
    } catch(_) {
      try { serverMsg = await res.text(); } catch(_) {}
    }
    const base = serverMsg || 'Error eliminando contacto'
    // Adjuntamos código para que la UI lo pueda detectar de forma simple
    throw new Error(`${base}|STATUS:${res.status}`)
  }
}

export async function getContact(id: number): Promise<ContactDTO> {
  const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, { headers: { ...authHeaders() } as HeadersInit, credentials: 'include' });
  if (!res.ok) throw new Error('Error obteniendo contacto');
  const data = await res.json();
  return data.data;
}

export async function updateContact(id: number, patch: Partial<ContactDTO>): Promise<ContactDTO> {
  const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', ...authHeaders() } as HeadersInit, body: JSON.stringify(patch), credentials: 'include' });
  if (!res.ok) throw new Error('Error actualizando contacto');
  const data = await res.json();
  return data.data;
}