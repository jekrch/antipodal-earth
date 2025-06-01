import type { LocationCoordinates, PrehistoricMapOption } from '../types';

export const KANSAS_LOCATION: LocationCoordinates = { lat: 39.8283, lng: -98.5795, altitude: 2.5 };

export const extractMaFromName = (name: string): number => {
  const match = name.match(/~(\d+)\s*Ma/);
  return match ? parseInt(match[1], 10) : Infinity;
};

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s*\(~?\d+\s*ma\)\s*/, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const prehistoricMapOptionsRaw: Omit<PrehistoricMapOption, 'ageMa' | 'slug'>[] = [
  { name: 'Early Jurassic (~200 Ma)', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/World_200ma_6.webp', attribution: 'C. R. Scotese, PALEOMAP Project. CC BY-SA 4.0. Via Wikimedia Commons.' },
  { name: 'Early Cretaceous (~120 Ma)', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Cretaceous_120ma_map_1.webp', attribution: 'C. R. Scotese, PALEOMAP Project. CC BY-SA 4.0. Via Wikimedia Commons.' },
  { name: 'Early Triassic (~240 Ma)', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Trias_240ma_5.webp', attribution: 'C. R. Scotese, PALEOMAP Project. CC BY-SA 4.0. Via Wikimedia Commons.' },
  { name: 'Middle Jurassic (~165 Ma)', url: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Jura_165_ma_4.webp', attribution: 'C. R. Scotese, PALEOMAP Project. CC BY-SA 4.0. Via Wikimedia Commons.' },
];

export const prehistoricMapOptions: PrehistoricMapOption[] = prehistoricMapOptionsRaw
  .map(option => ({
    ...option,
    ageMa: extractMaFromName(option.name),
    slug: generateSlug(option.name),
  }))
  .sort((a, b) => a.ageMa - b.ageMa);