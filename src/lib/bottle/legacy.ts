/**
 * The first-generation bottle description (named body/cap presets) and its conversion to
 * BottleSpec v2. Kept so the catalogue's hand-written placeholder illustrations keep rendering;
 * new specs are written in v2 directly.
 */
import type { BottleSpec, Decal, LoftBody } from './spec';

export interface BottleSpecV1 {
  body: 'cylinder' | 'flask' | 'block' | 'tall' | 'apothecary' | 'tapered' | 'orb' | 'faceted' | 'pebble';
  width?: number;
  height?: number;
  depth?: number;
  capWidth?: number;
  capHeight?: number;
  glassGradient?: string;
  glass: 'clear' | 'smoked' | 'frosted' | 'tinted';
  glassTint?: string;
  liquid: string;
  fill?: number;
  cap: 'cylinder' | 'cube' | 'sphere' | 'tall' | 'disc' | 'faceted' | 'pebble' | 'dome';
  capMaterial: 'gold' | 'silver' | 'gunmetal' | 'black' | 'white' | 'wood' | 'stone' | 'resin';
  capColor?: string;
  collar: 'gold' | 'silver' | 'black' | 'none';
  label: 'none' | 'plate' | 'printed' | 'paper';
  labelColor?: string;
  labelInk?: string;
}

export function isSpecV1(x: unknown): x is BottleSpecV1 {
  return !!x && typeof x === 'object' && !('v' in (x as object)) && typeof (x as { body?: unknown }).body === 'string';
}

export function v1ToV2(s: BottleSpecV1, brand: string, name: string): BottleSpec {
  const w = s.width ?? 1;
  const hm = s.height ?? 1;
  const dm = s.depth ?? 1;
  let body: LoftBody;
  switch (s.body) {
    case 'cylinder':
      body = { kind: 'loft', width: 6 * w, height: 9.5 * hm, depth: 6 * w, plan: 'round', profile: 'straight', shoulder: 'round', shoulderSize: 0.08, neck: { radius: 0.8, height: 0.4 } };
      break;
    case 'tapered':
      body = { kind: 'loft', width: 6.8 * w, height: 9.2 * hm, depth: 6.8 * w, plan: 'round', profile: 'tapered', profileAmount: 0.75, shoulder: 'round', shoulderSize: 0.1, neck: { radius: 0.8, height: 0.4 } };
      break;
    case 'apothecary':
      body = { kind: 'loft', width: 6.4 * w, height: 8.6 * hm, depth: 6.4 * w, plan: 'round', profile: 'straight', shoulder: 'round', shoulderSize: 0.3, neck: { radius: 0.9, height: 0.5 } };
      break;
    case 'orb':
      body = { kind: 'loft', width: 8.4 * w, height: 8 * hm, depth: 8.4 * w, plan: 'round', profile: 'orb', shoulder: 'dome', shoulderSize: 0.3, neck: { radius: 0.85, height: 0.5 } };
      break;
    case 'faceted':
      body = { kind: 'loft', width: 6.8 * w, height: 8.4 * hm, depth: 6.8 * w, plan: 'polygon', sides: 8, profile: 'straight', shoulder: 'sloped', shoulderSize: 0.1, neck: { radius: 0.85, height: 0.4 }, flat: true };
      break;
    case 'tall':
      body = { kind: 'loft', width: 4.4 * w, height: 11.2 * hm, depth: 2.4 * w * dm, plan: 'rect', cornerRadius: 0.35, profile: 'straight', shoulder: 'round', shoulderSize: 0.12, neck: { radius: 0.75, height: 0.4 } };
      break;
    case 'flask':
      body = { kind: 'loft', width: 6.4 * w, height: 8.6 * hm, depth: 2.2 * w * dm, plan: 'rect', cornerRadius: 0.5, profile: 'straight', shoulder: 'round', shoulderSize: 0.14, neck: { radius: 0.75, height: 0.4 } };
      break;
    case 'block':
      body = { kind: 'loft', width: 6 * w, height: 7 * hm, depth: 6 * w * dm, plan: 'rect', cornerRadius: 0.15, profile: 'straight', shoulder: 'square', shoulderSize: 0.04, edgeRadius: 0.15, neck: { radius: 0.85, height: 0.4 } };
      break;
    case 'pebble':
      body = { kind: 'loft', width: 6.8 * w, height: 5.8 * hm, depth: 3.6 * w * dm, plan: 'ellipse', profile: 'bowed', profileAmount: 0.3, shoulder: 'dome', shoulderSize: 0.3, edgeRadius: 0.5, neck: { radius: 0.8, height: 0.4 } };
      break;
  }
  const glassColor = s.glassTint ?? (s.glass === 'smoked' ? '#3a3632' : s.glass === 'frosted' ? '#eef0ee' : '#b9c6c1');
  const spec: BottleSpec = {
    v: 2,
    body,
    glass: { finish: s.glass, color: glassColor, gradient: s.glassGradient ? { to: s.glassGradient, start: 0.2, end: 0.9 } : undefined },
    liquid: { color: s.liquid, fill: s.fill ?? 0.84 },
    collar: { material: s.collar === 'none' ? 'none' : s.collar },
    cap: capFor(s, body),
    sprayer: 'atomizer',
    decals: labelFor(s, brand, name),
  };
  return spec;
}

function capFor(s: BottleSpecV1, body: LoftBody): BottleSpec['cap'] {
  const cw = s.capWidth ?? 1;
  const ch = s.capHeight ?? 1;
  const scale = Math.min(1.15, Math.max(0.8, (body.width + body.depth) / 11));
  const material: BottleSpec['cap']['material'] = s.capMaterial === 'stone' ? 'resin' : s.capMaterial;
  const color = s.capColor ?? (s.capMaterial === 'stone' ? '#b9b2a6' : undefined);
  const base = { material, color, removal: 'pull' as const };
  switch (s.cap) {
    case 'cylinder':
      return { ...base, kind: 'cylinder', width: 3 * scale * cw, height: 2 * ch };
    case 'tall':
      return { ...base, kind: 'cylinder', width: 2 * scale * cw, height: 3.4 * ch };
    case 'disc':
      return { ...base, kind: 'disc', width: 4.4 * scale * cw, height: 0.75 * ch };
    case 'faceted':
      return { ...base, kind: 'crown', facets: 6, width: 3.2 * scale * cw, height: 2 * ch };
    case 'cube':
      return { ...base, kind: 'block', width: 2.7 * scale * cw, depth: 2.7 * scale * cw, height: 2.7 * ch, cornerRadius: 0.12 };
    case 'sphere':
      return { ...base, kind: 'sphere', width: 3 * scale * cw, height: 3 * scale * cw * ch };
    case 'pebble':
      return { ...base, kind: 'dome', width: 3.8 * scale * cw, height: 1.9 * ch };
    case 'dome':
      return { ...base, kind: 'dome', width: 3.2 * scale * cw, height: 2 * ch };
  }
}

function labelFor(s: BottleSpecV1, brand: string, name: string): Decal[] {
  if (s.label === 'none') return [];
  const ink = s.labelInk ?? (s.glass === 'smoked' || (s.glass === 'tinted' && s.label === 'printed') ? '#f2efe8' : '#1c1a17');
  const shortName = name.length > 40 ? name.slice(0, 24) : name;
  const text: Decal[] = [
    { kind: 'text', text: brand.toUpperCase(), font: 'sans', size: 0.03, tracking: 0.2, x: 0.5, y: 0.5, w: 0.7, color: ink },
    { kind: 'text', text: shortName, font: 'serif-italic', size: 0.065, x: 0.5, y: 0.415, w: 0.72, color: ink },
  ];
  if (s.label === 'printed') return text;
  const fill = s.labelColor ?? (s.label === 'plate' ? '#c8a35a' : '#f1ece2');
  const material: Decal['material'] = s.label === 'plate' ? 'plate' : 'paper';
  return [
    { kind: 'rect', material, x: 0.5, y: 0.455, w: 0.78, h: 0.26, fill },
    { kind: 'frame', material, x: 0.5, y: 0.455, w: 0.72, h: 0.22, color: 'rgba(28,26,23,0.35)', stroke: 0.004 },
    ...text.map((t) => ({ ...t, material })),
  ];
}
