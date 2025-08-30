// Cliente ligero para API de etapas del pipeline
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface PipelineStageDTO { id: string; title: string; color: string; }

async function authFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function fetchStages(): Promise<PipelineStageDTO[]> {
  const data = await authFetch('/api/pipeline/stages');
  return data.data || [];
}

export async function createStage(stage: PipelineStageDTO): Promise<PipelineStageDTO> {
  const data = await authFetch('/api/pipeline/stages', { method: 'POST', body: JSON.stringify(stage) });
  return data.data;
}

export async function deleteStage(id: string): Promise<void> {
  await authFetch(`/api/pipeline/stages/${id}`, { method: 'DELETE' });
}