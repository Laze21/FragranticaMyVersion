/**
 * BottleSpec v2: a parametric description rich enough to model real retail bottles.
 *
 * Every bottle is an original 3D illustration built from this description, never a product
 * photograph or a copied CAD file. Dimensions are in centimetres as the bottle is sold
 * (the builder scales the world so 10 cm = 1 unit); colours are hex strings.
 *
 * Two body generators cover the catalogue:
 *   loft        a plan (cross-section) swept along a vertical profile: cylinders, flacons,
 *               apothecary jars, orbs, amphorae, faceted jewels, ribbed glass
 *   silhouette  a front outline extruded through the depth: stars, fans, heels, torsos, ingots
 */

export type Hex = string;

export type PlanKind = 'round' | 'rect' | 'ellipse' | 'polygon' | 'squircle' | 'custom';
export type ProfileKind = 'straight' | 'bowed' | 'tapered' | 'flared' | 'apothecary' | 'orb' | 'amphora' | 'waisted' | 'custom';
export type ShoulderKind = 'square' | 'round' | 'sloped' | 'dome' | 'flat';

export interface LoftBody {
  kind: 'loft';
  width: number; // cm, widest point
  height: number; // cm, glass only (no collar, no cap)
  depth: number; // cm
  plan: PlanKind;
  /** rect: corner radius as a fraction of the smaller half-dimension (0 = sharp, 1 = fully round). */
  cornerRadius?: number;
  /** rect: chamfer on the vertical edges, same units as cornerRadius. Wins over cornerRadius when set. */
  chamfer?: number;
  /** polygon: number of sides (6 = hexagonal flacon, 8 = octagonal jewel). */
  sides?: number;
  /** custom plan: points in a unit box centred on 0 (x = width axis, y = depth axis), counter-clockwise. */
  planPoints?: Array<[number, number]>;
  profile: ProfileKind;
  /** How much the profile deviates (bowed: belly, tapered: narrowing, apothecary: shoulder height). 0..1, default 0.5. */
  profileAmount?: number;
  /** custom profile: [heightFraction 0..1, widthScale 0..1+] pairs from base to top of the straight section. */
  profilePoints?: Array<[number, number]>;
  shoulder: ShoulderKind;
  /** Height of the shoulder region as a fraction of body height (0.05 square .. 0.35 dome). */
  shoulderSize?: number;
  /** Rounding of the vertical edges in cm (pillow edges). Only for rect/squircle plans. */
  edgeRadius?: number;
  /** Rounding of the base edge in cm. */
  baseRadius?: number;
  /** Visible thick glass base, cm (the solid slab under the juice). */
  baseThickness?: number;
  /** Wall thickness, cm; sets how far the liquid sits inside the glass. */
  wall?: number;
  neck?: { radius: number; height: number }; // cm
  /** What the shoulder closes into: a round neck, or the plan shrunk (faceted stopper tops, cap plates). */
  neckShape?: 'round' | 'plan';
  /** Fluting around the body. depth is the relief in cm. */
  ribs?: { count: number; depth: number; orientation: 'vertical' | 'horizontal'; profile?: 'round' | 'sharp' };
  /** Flat-shade the loft (cut-glass look). */
  flat?: boolean;
}

export interface SilhouetteBody {
  kind: 'silhouette';
  width: number; // cm, overall width of the outline
  height: number; // cm
  depth: number; // cm at the thickest point
  /** Front outline in a unit box (x 0..1 left to right, y 0..1 bottom to top), counter-clockwise, no duplicate end point. */
  points: Array<[number, number]>;
  /** Smooth the outline with a Catmull-Rom spline (true for organic shapes, false for cut shapes). */
  smooth?: boolean;
  /** Edge rounding in cm around the outline where the front meets the sides. */
  edgeRadius?: number;
  /** 0 = slab sides, 1 = sides taper to a knife edge (lens). */
  sideTaper?: number;
  baseThickness?: number;
  wall?: number;
  neck?: { radius: number; height: number; x?: number }; // x in 0..1 across the outline, default 0.5
  flat?: boolean;
}

export type Body = LoftBody | SilhouetteBody;

export interface Glass {
  finish: 'clear' | 'tinted' | 'smoked' | 'frosted' | 'lacquered' | 'mirror';
  color: Hex;
  /** Override the finish's default opacity (0..1). */
  opacity?: number;
  /** Colour and opacity change with height: from `color` at the base to `to` at the top, between start and end. */
  gradient?: { to: Hex; start?: number; end?: number; opacityBase?: number; opacityTop?: number };
  /** Surface treatment baked into roughness/bump maps. */
  texture?: 'none' | 'studs' | 'grain' | 'meander' | 'hammered' | 'flutes-fine';
  textureColor?: Hex;
}

export interface Liquid {
  color: Hex;
  fill: number; // 0..1
  visible?: boolean;
}

export type Metal = 'silver' | 'gold' | 'rose-gold' | 'gunmetal' | 'bronze' | 'chrome';

export interface Collar {
  material: Metal | 'black' | 'white' | 'none';
  shape?: 'ring' | 'band' | 'sleeve';
  height?: number; // cm
  /** Visible band on the glass under the cap (e.g. Y's silver band). */
  color?: Hex;
}

export type CapKind =
  | 'cylinder'
  | 'block' // rectangular cap, plan follows the body or its own
  | 'dome'
  | 'sphere'
  | 'disc'
  | 'cone'
  | 'lid' // full-width metal lid that covers the whole top (Terre d'Hermès)
  | 'stopper-faceted' // emerald-cut glass stopper (Chanel N°5)
  | 'stopper-fan' // flat fan stopper (Shalimar)
  | 'stopper-crystal' // chunky clear stopper, rounded (La Vie est Belle)
  | 'stopper-ball' // glass ball stopper
  | 'crown'
  | 'ring-pull' // cylinder with a pull ring (Flowerbomb)
  | 'flower'; // cap topped with a cluster of flowers (Daisy)

export type CapMaterial =
  | 'black'
  | 'white'
  | Metal
  | 'glass-clear'
  | 'glass-frosted'
  | 'glass-smoked'
  | 'glass-tinted'
  | 'wood'
  | 'resin'
  | 'leather'
  | 'lacquer'; // coloured gloss lacquer, uses `color`

export interface Cap {
  kind: CapKind;
  material: CapMaterial;
  color?: Hex;
  width: number; // cm (diameter for round caps)
  height: number; // cm
  depth?: number; // cm, for rectangular caps (default = width)
  plan?: 'round' | 'rect' | 'follow-body';
  cornerRadius?: number; // 0..1 like the body
  /** Metal top plate (brushed) with an optional engraved mark. */
  topPlate?: { material: Metal; emblem?: string };
  /** A band of a second material at the base of the cap. */
  band?: { material: Metal | 'black' | 'white'; height: number };
  /** Vertical flutes around a round cap. */
  flutes?: { count: number; depth: number };
  texture?: 'none' | 'grain' | 'leather';
  /** How it comes off; drives the opening animation. */
  removal: 'pull' | 'magnetic' | 'screw' | 'stopper' | 'fixed';
  /** Faceted stoppers: number of facets. */
  facets?: number;
  /** The cap sits this far down over the neck (cm). */
  overlap?: number;
}

export type Sprayer = 'atomizer' | 'stopper' | 'splash';

export type DecalFont = 'sans' | 'sans-light' | 'sans-bold' | 'sans-wide' | 'sans-condensed' | 'serif' | 'serif-italic' | 'serif-bold' | 'script' | 'display';
export type DecalMaterial = 'print' | 'metal' | 'paper' | 'plate' | 'inside' | 'etch';

/**
 * A layer drawn on a face of the bottle. Coordinates are fractions of the face: x 0..1 left to
 * right, y 0..1 bottom to top; sizes are fractions of the face width (w) and height (h, size).
 */
export interface Decal {
  kind: 'text' | 'rect' | 'ellipse' | 'line' | 'frame' | 'ring';
  face?: 'front' | 'back' | 'cap-top' | 'cap-front';
  material?: DecalMaterial;
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  font?: DecalFont;
  /** Cap height of the text as a fraction of the face height. */
  size?: number;
  tracking?: number; // em fraction, e.g. 0.2
  color?: Hex;
  /** rect/ellipse/frame: fill colour; frame/line/ring: stroke colour via `color`, stroke width via `stroke` (fraction of face width). */
  fill?: Hex;
  stroke?: number;
  align?: 'left' | 'center' | 'right';
  rotation?: number; // degrees, clockwise
  opacity?: number;
  /** Letterform treatment for metal plaques: a thicker stroke makes the alpha mask read as a solid plaque. */
  weight?: number;
  /** Optional corner radius for rect (fraction of w). */
  radius?: number;
}

export type Decor =
  | { kind: 'bow'; y: number; color: Hex; width?: number; material?: 'satin' | 'grosgrain' }
  | { kind: 'rings'; y: number; count: number; material: Metal; spacing?: number; thickness?: number }
  | { kind: 'band'; y: number; height: number; material: Metal | 'black' | 'white' | 'rubber'; inset?: number }
  | { kind: 'emblem'; face?: 'front' | 'cap-top'; y: number; size: number; shape: 'disc' | 'shield' | 'square' | 'oval'; material: Metal | 'black' | 'white'; text?: string; color?: Hex }
  | { kind: 'tread'; y: number; height: number; color: Hex; grooves?: number }
  | { kind: 'cord'; y: number; color: Hex; turns?: number }
  | { kind: 'flowers'; count: number; color: Hex; centerColor: Hex; size: number }
  | { kind: 'pin'; y: number; material: Metal; size: number };

export interface BottleSpec {
  v: 2;
  body: Body;
  glass: Glass;
  liquid: Liquid;
  collar: Collar;
  cap: Cap;
  sprayer: Sprayer;
  decals?: Decal[];
  decor?: Decor[];
  /** Framing hints: extra yaw for the poster (radians) and whether the bottle is shown slightly from above. */
  pose?: { yaw?: number; pitch?: number };
}

/** The world is in decimetres: a 10 cm bottle is 1 unit tall. */
export const CM = 0.1;

export const DEFAULTS = {
  wall: 0.35, // cm
  baseThickness: 0.5,
  baseRadius: 0.12,
  edgeRadius: 0.12,
  shoulderSize: { square: 0.04, flat: 0.02, sloped: 0.16, round: 0.14, dome: 0.26 } as Record<ShoulderKind, number>,
  neck: { radius: 0.55, height: 0.35 },
} as const;

/** Is this a v2 spec? (v1 specs from before the real catalogue are no longer supported.) */
export function isSpecV2(x: unknown): x is BottleSpec {
  return !!x && typeof x === 'object' && (x as { v?: number }).v === 2 && 'body' in (x as object);
}
