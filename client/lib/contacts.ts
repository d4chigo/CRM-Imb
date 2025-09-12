const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function authHeaders(): Record<string,string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Bulk operations
export async function bulkTagContacts(ids: number[], etiqueta: string, etiqueta_otro?: string) {
  const res = await fetch(`${API_BASE_URL}/api/contacts/utils/bulk-tag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() } as HeadersInit,
    body: JSON.stringify({ ids, etiqueta, etiqueta_otro }),
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Error etiquetando contactos')
  return res.json()
}

export async function bulkMoveContactsToPipeline(ids: number[]) {
  const res = await fetch(`${API_BASE_URL}/api/contacts/utils/bulk-move-pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() } as HeadersInit,
    body: JSON.stringify({ ids }),
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Error moviendo contactos al pipeline')
  return res.json()
}

export interface ContactDTO { 
  id?: number; 
  nombre: string; 
  apellido?: string;
  email?: string; 
  telefono?: string; 
  dni?: string;
  tipo?: string; 
  origen?: string; 
  notas?: string; 
  departamento?: string | null; 
  sexo?: 'M'|'F'|'O'|null; 
  fecha_nacimiento?: string | Date | null; 
  etiquetas?: string[]; 
  etiqueta_otro?: string | null;
  creado_en?: string; 
}

export interface ContactsPage { 
  data: ContactDTO[]; 
  meta: { 
    page: number; 
    pageSize: number; 
    total: number 
  } 
}
export async function fetchContacts(params?: { 
  page?: number; 
  pageSize?: number; 
  search?: string; 
  type?: string 
}): Promise<ContactsPage> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.search) q.set('search', params.search);
  if (params?.type && params.type !== 'all') q.set('type', params.type);
  const url = `${API_BASE_URL}/api/contacts${q.toString() ? `?${q.toString()}` : ''}`;
  const res = await fetch(url, { 
    headers: { 
      ...authHeaders() 
    } as HeadersInit, 
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('Error listando contactos');
  const data = await res.json();
  return { 
    data: data.data || [], 
    meta: data.meta || { 
      page: 1, 
      pageSize: (params?.pageSize || 20), 
      total: (data.data?.length || 0) 
    } 
  };
}

export async function createContact(contact: ContactDTO): Promise<ContactDTO> {
  const res = await fetch(`${API_BASE_URL}/api/contacts`, { 
    method: 'POST', 
    headers: { 
      'Content-Type':'application/json', 
      ...authHeaders() 
    } as HeadersInit, 
    body: JSON.stringify(contact), 
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('Error creando contacto');
  const data = await res.json();
  return data.data;
}

export async function deleteContact(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, { 
    method: 'DELETE', 
    headers: { 
      ...authHeaders() 
    } as HeadersInit, 
    credentials: 'include' 
  });
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
  const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, { 
    headers: { 
      ...authHeaders() 
    } as HeadersInit, 
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('Error obteniendo contacto');
  const data = await res.json();
  return data.data;
}

export async function updateContact(id: number, patch: Partial<ContactDTO>): Promise<ContactDTO> {
  const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, { 
    method: 'PATCH', 
    headers: { 
      'Content-Type':'application/json', 
      ...authHeaders() 
    } as HeadersInit, 
    body: JSON.stringify(patch), 
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('Error actualizando contacto');
  const data = await res.json();
  return data.data;
}

// Duplicates API
export interface DuplicateGroup { 
  by: 'email'|'telefono'; 
  value: string; 
  count: number; 
  members: Array<Pick<ContactDTO,'id'|'nombre'|'email'|'telefono'|'creado_en'>> 
}
export async function listDuplicateContacts(by: Array<'email'|'telefono'> = ['email','telefono']): Promise<DuplicateGroup[]> {
  const q = new URLSearchParams();
  q.set('by', by.join(','));
  const res = await fetch(`${API_BASE_URL}/api/contacts/utils/duplicates?${q.toString()}`, { headers: { ...authHeaders() } as HeadersInit, credentials: 'include' });
  if (!res.ok) throw new Error('Error listando duplicados');
  const data = await res.json();
  return data.data || [];
}
export async function mergeContacts(primaryId: number, duplicateId: number, strategy: 'prefer-primary'|'prefer-filled' = 'prefer-filled') {
  const res = await fetch(`${API_BASE_URL}/api/contacts/utils/merge`, { method: 'POST', headers: { 'Content-Type':'application/json', ...authHeaders() } as HeadersInit, body: JSON.stringify({ primaryId, duplicateId, strategy }), credentials: 'include' });
  if (!res.ok) throw new Error('Error fusionando contactos');
  const data = await res.json();
  return data.data as ContactDTO;
}