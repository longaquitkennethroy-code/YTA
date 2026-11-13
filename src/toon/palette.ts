import {Color, LinearSRGBColorSpace} from 'three';

/**
 * Colours are authored in OKLCH (perceptual lightness / chroma / hue) so value
 * and saturation can be steered independently.
 *
 * Harmony: a blue-dominant scheme (hue ~262) with its warm complement
 * (wood / coral / star yellow, hues 28-95) as the accent, and teal (185-195)
 * as the analogous bridge between them. Large surfaces stay low-chroma and
 * high-value; saturation is reserved for the characters and a few props so
 * the eye lands on them.
 */
export const oklch = (l: number, c: number, hDeg: number): Color => {
	const h = (hDeg * Math.PI) / 180;
	const a = c * Math.cos(h);
	const b = c * Math.sin(h);
	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;
	const L = l_ ** 3;
	const M = m_ ** 3;
	const S = s_ ** 3;
	const cl = (v: number) => Math.min(1, Math.max(0, v));
	return new Color().setRGB(
		cl(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
		cl(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
		cl(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
		LinearSRGBColorSpace,
	);
};

/** Move hue `h` toward `target` along the shortest arc by at most `amount` degrees. */
const hueToward = (h: number, target: number, amount: number) => {
	const d = ((target - h + 540) % 360) - 180;
	return h + Math.sign(d) * Math.min(Math.abs(d), amount);
};

export type Ramp = {base: Color; shade: Color; deep: Color; light: Color};

const COOL = 278; // shadows drift toward blue-violet
const WARM = 88; // highlights drift toward warm yellow

/**
 * Builds a 4-stop toon ramp from one colour. Shadows are not just darker:
 * they get cooler and keep (or gain) chroma so they read as deep colour
 * instead of grey mud; highlights get warmer and lose chroma.
 */
export const ramp = (
	l: number,
	c: number,
	h: number,
	o: {shadeL?: number; deepL?: number; chroma?: number} = {},
): Ramp => {
	const k = o.chroma ?? 1;
	return {
		base: oklch(l, c, h),
		shade: oklch(l * (o.shadeL ?? 0.74), c * 1.08 * k + 0.012, hueToward(h, COOL, 14)),
		deep: oklch(l * (o.deepL ?? 0.46), c * 0.95 * k + 0.02, hueToward(h, COOL, 30)),
		light: oklch(l + (1 - l) * 0.55, c * 0.6, hueToward(h, WARM, 16)),
	};
};

export const P = {
	// ink
	line: oklch(0.17, 0.045, 285),
	lineLit: oklch(0.33, 0.07, 310),

	// characters
	skin: {
		base: oklch(0.975, 0.008, 95),
		shade: oklch(0.86, 0.035, 285),
		deep: oklch(0.7, 0.07, 285),
		light: oklch(1, 0, 0),
	} as Ramp,
	limb: ramp(0.2, 0.035, 282, {shadeL: 0.8, deepL: 0.62}),
	uniform: {
		base: oklch(0.54, 0.19, 257),
		shade: oklch(0.42, 0.185, 262),
		deep: oklch(0.25, 0.13, 270),
		light: oklch(0.8, 0.1, 235),
	} as Ramp,
	uniformDark: ramp(0.3, 0.12, 264),
	visor: ramp(0.22, 0.04, 280),
	gold: ramp(0.88, 0.17, 95, {shadeL: 0.82, deepL: 0.62}),
	shirt: ramp(0.64, 0.115, 188, {shadeL: 0.72, deepL: 0.45}),
	hair: ramp(0.47, 0.09, 55, {shadeL: 0.72, deepL: 0.48}),
	mug: ramp(0.9, 0.12, 92),

	// living room
	wall: ramp(0.935, 0.04, 92, {shadeL: 0.88, deepL: 0.72, chroma: 1.3}),
	wallMotif: ramp(0.895, 0.055, 88, {shadeL: 0.88, deepL: 0.72}),
	wallUpper: ramp(0.955, 0.022, 95, {shadeL: 0.9, deepL: 0.76, chroma: 1.5}),
	trim: ramp(0.975, 0.012, 95, {shadeL: 0.88, deepL: 0.72, chroma: 2.5}),
	wood: ramp(0.76, 0.115, 68, {shadeL: 0.78, deepL: 0.52}),
	woodAlt: ramp(0.71, 0.125, 60, {shadeL: 0.78, deepL: 0.52}),
	rug: ramp(0.915, 0.03, 88, {shadeL: 0.84, deepL: 0.62, chroma: 1.5}),
	rugBorder: ramp(0.7, 0.17, 45),
	sofa: ramp(0.67, 0.165, 28, {shadeL: 0.76, deepL: 0.48}),
	sofaDark: ramp(0.56, 0.16, 24),
	vase: ramp(0.66, 0.105, 200),
	plant: ramp(0.62, 0.14, 150),
	frame: ramp(0.52, 0.15, 255),
	art: ramp(0.9, 0.05, 220),

	// kitchen
	kWall: ramp(0.89, 0.135, 96, {shadeL: 0.84, deepL: 0.62}),
	cabinet: ramp(0.78, 0.085, 186, {shadeL: 0.78, deepL: 0.54}),
	tileA: ramp(0.7, 0.1, 196, {shadeL: 0.78, deepL: 0.54}),
	tileB: ramp(0.965, 0.012, 190, {shadeL: 0.86, deepL: 0.66, chroma: 3}),
	glass: ramp(0.9, 0.045, 215),
	phone: ramp(0.63, 0.19, 25),
	lamp: ramp(0.74, 0.1, 178),

	// atmosphere
	fog: oklch(0.955, 0.03, 88),
	keyTint: oklch(1.0, 0.02, 95),
	ambTint: oklch(0.93, 0.03, 275),
};
