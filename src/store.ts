import type { Region, Status, Visit, Visits } from './types';
export const STORAGE_KEY = 'travel-atlas:visits:v1';
const statuses: Status[] = ['visited', 'uncertain', 'transit'];
export function markRegions(visits: Visits, regions: Region[], status: Status | null, note?: string): Visits {
  const next = { ...visits };
  for (const region of regions) {
    if (!status) delete next[region.id];
    else next[region.id] = { region, status, confirmation: 'manual', updatedAt: new Date().toISOString(), note: note ?? visits[region.id]?.note ?? '' };
  }
  return next;
}
export function validateBackup(value: unknown): Visits {
  if (!value || typeof value !== 'object') throw new Error('Invalid backup');
  const obj = value as Record<string, unknown>;
  if (obj.schemaVersion !== 1 || !Array.isArray(obj.records) || obj.records.length > 50000) throw new Error('Unsupported backup format');
  const next: Visits = {};
  for (const input of obj.records) {
    const v = input as Visit;
    if (!v || !v.region || typeof v.region.id !== 'string' || !/^(CN|DE|GB|WORLD):[\w.-]+$/.test(v.region.id) || typeof v.region.name !== 'string' || !v.region.name || !statuses.includes(v.status) || v.confirmation !== 'manual' || typeof v.note !== 'string' || typeof v.updatedAt !== 'string' || !Number.isFinite(Date.parse(v.updatedAt)) || typeof v.region.country !== 'string' || !Number.isInteger(v.region.level) || v.region.level < 0 || v.region.level > 5 || !Array.isArray(v.region.aliases) || !v.region.aliases.every(x => typeof x === 'string') || !Array.isArray(v.region.ancestors) || !v.region.ancestors.every(x => typeof x === 'string') || typeof v.region.source !== 'string' || !(v.region.parent === null || typeof v.region.parent === 'string')) throw new Error('Invalid record in backup');
    // Accept data fields only. Never trust imported URLs or paths for boundary fetches.
    next[v.region.id] = { region: { id:v.region.id, name:v.region.name.slice(0,300), aliases:v.region.aliases.slice(0,30), country:v.region.country, level:v.region.level, parent:v.region.parent, ancestors:v.region.ancestors.slice(0,6), source:v.region.source }, status:v.status, confirmation:'manual', updatedAt:v.updatedAt, note:v.note.slice(0,10000) };
  }
  return next;
}
export function makeBackup(visits: Visits) { return { schemaVersion: 1, exportedAt: new Date().toISOString(), records: Object.values(visits) }; }
export function loadVisits(): Visits {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? validateBackup(JSON.parse(saved)) : {};
}
export function contextText(visits: Visits) {
  const lines = ['# Personal travel atlas', 'Only the records below are manually confirmed. Unlisted places are unknown, not unvisited.', 'A parent-level record does not confirm any child region. Administrative boundaries may be historical snapshots.'];
  for (const status of statuses) {
    lines.push(`\n## ${status === 'transit' ? 'Transit-only' : status}`);
    for (const v of Object.values(visits).filter(v=>v.status===status).sort((a,b)=>a.region.name.localeCompare(b.region.name))) lines.push(`- ${v.region.name} (${v.region.country}, level ${v.region.level}; ${v.region.id})${v.region.aliases.length ? ' / '+v.region.aliases.join(' / ') : ''}${v.note ? ' — '+v.note : ''}`);
  }
  return lines.join('\n');
}
