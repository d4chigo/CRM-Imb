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
  const res = await fetch(`${API_BASE_URL}/api/opportunities`, { method:'POST', headers: authHeaders(), body: JSON.stringify(o), credentials:'include' });
  if(!res.ok) throw new Error('Error creando oportunidad');
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