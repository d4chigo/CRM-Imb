const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function authHeaders(): Record<string,string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' } : { 'Content-Type':'application/json' };
}

export interface OpportunityDTO {
  id?: number;
  contactoId?: number | null;
  agenteId?: number | null;
  servicioId: number;
  etapaId: string;
  nombreCliente: string;
  valorUsd?: number;
  probabilidad?: number;
  fechaCierre?: string;
  telefono?: string;
  email?: string;
}

export async function listOpportunities(): Promise<OpportunityDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/opportunities`, { headers: authHeaders(), credentials:'include' });
  if(!res.ok) throw new Error('Error listando oportunidades');
  const data = await res.json();
  return data.data || [];
}
export async function createOpportunity(o: OpportunityDTO): Promise<OpportunityDTO> {
  // Sanitizar: no enviar campos vacíos que disparen validaciones (ej: email="")
  const payload: any = { ...o };
  if (!payload.email) delete payload.email; // email opcional: eliminar si vacío / undefined
  if (payload.telefono === undefined || payload.telefono === null) delete payload.telefono; // si no hay teléfono, omitir
  // Asegurar nombre válido
  if (typeof payload.nombreCliente === 'string') payload.nombreCliente = payload.nombreCliente.trim();
  // Asegurar etapaId mínimo 2 chars
  if (!payload.etapaId || payload.etapaId.length < 2) throw new Error('Etapa inválida');
  // Normalizar probabilidad y valor
  if (payload.probabilidad === undefined || payload.probabilidad === null) payload.probabilidad = 0;
  if (payload.valorUsd === undefined || payload.valorUsd === null) payload.valorUsd = 0;

  const res = await fetch(`${API_BASE_URL}/api/opportunities`, { method:'POST', headers: authHeaders(), body: JSON.stringify(payload), credentials:'include' });
  if(!res.ok) {
    let detail = ''
    try { 
      const j = await res.json(); 
      if (j?.errors && Array.isArray(j.errors) && j.errors.length) {
        // Tomar primer error de express-validator
        detail = j.errors[0].msg || j.message || '';
      } else {
        detail = j?.message || '';
      }
    } catch { /* ignore */ }
    throw new Error(detail ? `Error creando oportunidad: ${detail}|STATUS:${res.status}` : `Error creando oportunidad|STATUS:${res.status}`);
  }
  const data = await res.json();
  return data.data;
}
export async function updateOpportunity(id:number, patch: Partial<OpportunityDTO>): Promise<OpportunityDTO> {
  const res = await fetch(`${API_BASE_URL}/api/opportunities/${id}`, { method:'PATCH', headers: authHeaders(), body: JSON.stringify(patch), credentials:'include' });
  if(!res.ok) throw new Error('Error actualizando oportunidad');
  const data = await res.json();
  return data.data;
}
export async function deleteOpportunity(id:number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/opportunities/${id}`, { method:'DELETE', headers: authHeaders(), credentials:'include' });
  if(!res.ok) throw new Error('Error eliminando oportunidad');
}

// Helper: crear oportunidad inicial desde un contacto
// etapaId por defecto 'contacto_inicial', servicioId genérico = 1
export async function createOpportunityFromContact(contact: { id?: number; nombre: string; telefono?: string; email?: string; }, etapaId: string = 'contacto_inicial') {
  // Validación ligera en cliente para evitar request inválida
  if (!contact.nombre?.trim()) throw new Error('Nombre de contacto inválido');
  return createOpportunity({
    contactoId: contact.id || null,
    servicioId: 1, // TODO: permitir selección dinámica de servicio
    etapaId,
    nombreCliente: contact.nombre.trim(),
    valorUsd: 0,
    probabilidad: 0,
    fechaCierre: new Date().toISOString().slice(0,10),
    telefono: contact.telefono || undefined,
    email: contact.email && contact.email.trim() !== '' ? contact.email : undefined
  })
}