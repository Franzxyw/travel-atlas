import type { Feature, Polygon, MultiPolygon } from 'geojson';
export type Status = 'visited' | 'uncertain' | 'transit';
export type Region = { id: string; name: string; aliases: string[]; country: string; level: number; parent: string | null; ancestors: string[]; source: string; childKey?: string; iso3?: string; bounds?: [number, number, number, number] };
export type RegionFeature = Feature<Polygon | MultiPolygon, Region>;
export type Visit = { region: Region; status: Status; confirmation: 'manual'; updatedAt: string; note: string };
export type Visits = Record<string, Visit>;
export type Lang = 'en' | 'zh';
