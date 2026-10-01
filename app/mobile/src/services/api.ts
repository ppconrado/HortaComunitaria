import type { Harvest, HortaStatus, Telemetry } from '../types/api';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.51:3000';

export async function requestApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Não foi possível comunicar com a API.');
  }
  return body as T;
}

export const getStatus = () => requestApi<HortaStatus>('/status');

export const getTelemetryHistory = () =>
  requestApi<Telemetry[]>('/telemetry/history');

export const getHarvests = () => requestApi<Harvest[]>('/harvest');

export const setIrrigation = (action: 'on' | 'off' | 'auto') =>
  requestApi<{ irrigation: HortaStatus['irrigation'] }>('/irrigation', {
    method: 'POST',
    body: JSON.stringify({ action }),
  });

export const reserveHarvest = (id: string) =>
  requestApi<Harvest>(`/harvest/${id}/reserve`, {
    method: 'PUT',
    body: JSON.stringify({ reservedBy: 'Morador' }),
  });