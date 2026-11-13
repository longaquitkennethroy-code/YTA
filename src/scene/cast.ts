import {Ramp, oklch, ramp} from '../toon/palette';
import {P} from '../toon/palette';

/**
 * A character design. Every short defines its own cast here; the rig, the
 * shading and the line art are shared.
 */
export type CharSpec = {
	/** Shirt or uniform colour. */
	body: Ramp;
	/** Police uniform: pockets, placket, belt and badges on the body. */
	uniform?: boolean;
	/** What sits on the head: a peaked cap, or hair. All flat 2D drawings. */
	head: {kind: 'cap'} | {kind: 'hair'; ramp: Ramp; style: 'tufts' | 'neat' | 'messy'};
	glasses?: boolean;
	/** What the character holds when the pose does not say. */
	held?: Held;
};

/** Things a character can hold. All flat 2D drawings. */
export type Held = 'mug' | 'paycheck' | 'phone' | 'remote' | 'cash' | 'bill' | 'drink';

/** Designs are made with a ramp from a colour in OKLCH: lightness, chroma, hue. */
const shirt = (l: number, c: number, h: number) => ramp(l, c, h, {shadeL: 0.72, deepL: 0.45});

export const CAST: Record<string, CharSpec> = {
	officer: {body: P.uniform, uniform: true, head: {kind: 'cap'}},
	civilian: {body: P.shirt, head: {kind: 'hair', ramp: P.hair, style: 'tufts'}, glasses: true, held: 'mug'},

	// short 01: "Why your raise made you poorer"
	you: {body: shirt(0.74, 0.15, 62), head: {kind: 'hair', ramp: ramp(0.36, 0.06, 45, {shadeL: 0.72, deepL: 0.48}), style: 'messy'}},
	coworker: {body: shirt(0.55, 0.13, 300), head: {kind: 'hair', ramp: ramp(0.3, 0.03, 260, {shadeL: 0.72, deepL: 0.48}), style: 'neat'}, glasses: true},
};

export const specOf = (variant: string): CharSpec => CAST[variant] ?? CAST.civilian;

export {oklch};
