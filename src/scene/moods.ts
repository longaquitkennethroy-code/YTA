import {Color} from 'three';
import {P, Ramp, oklch, ramp} from '../toon/palette';
import {SHOT_B, SHOT_C} from './timeline';

type V3 = [number, number, number];

/**
 * A mood is a whole lighting setup. Each one is a temperature contrast: the
 * key light and the shadows sit on opposite sides of the colour wheel, so the
 * shadows read as colour, not as grey.
 */
export type Mood = {
	/** Tint of lit surfaces / of shadowed surfaces. */
	key: Color;
	amb: Color;
	/** Background and distance haze. */
	fog: Color;
	/** Gradient up the room: tint at the floor and at the ceiling. */
	floor: Color;
	sky: Color;
	/** Window light on the floor. */
	sun: Color;
	sunAmt: number;
	/** Where the key light comes from. */
	light: V3;
	/** Floor lamp: 0 off, 1 on. */
	lamp: number;
	/** Light only the characters receive, and how much, so they read in the dark. */
	figure: Color;
	figureAmt: number;
	glass: Ramp;
	/** Screen-space grade, multiplied over the picture: top and bottom colour. */
	gradeTop: string;
	gradeBottom: string;
};

export const MOODS = {
	// soft warm daylight, lavender ceiling
	morning: {
		key: oklch(1, 0.02, 95),
		amb: oklch(0.93, 0.03, 275),
		fog: P.fog,
		floor: oklch(1, 0, 0),
		sky: oklch(0.94, 0.035, 285),
		sun: P.sun,
		sunAmt: 1,
		light: [4.5, 8.5, 5.5],
		lamp: 0,
		figure: oklch(1, 0, 0),
		figureAmt: 0,
		glass: ramp(0.9, 0.045, 215),
		gradeTop: 'rgba(150,140,255,0.3)',
		gradeBottom: 'rgba(255,205,140,0.16)',
	},
	// low orange sun through the window, violet shadows
	golden: {
		key: oklch(0.98, 0.085, 72),
		amb: oklch(0.76, 0.085, 318),
		fog: oklch(0.9, 0.075, 62),
		floor: oklch(1, 0.035, 72),
		sky: oklch(0.85, 0.075, 335),
		sun: oklch(0.9, 0.17, 66),
		sunAmt: 1.35,
		light: [2.4, 3.4, 9],
		lamp: 0,
		figure: oklch(0.96, 0.05, 60),
		figureAmt: 0.45,
		glass: ramp(0.88, 0.12, 62),
		gradeTop: 'rgba(255,120,175,0.3)',
		gradeBottom: 'rgba(255,170,80,0.2)',
	},
	// blue moonlit room, one warm lamp
	night: {
		key: oklch(0.74, 0.095, 264),
		amb: oklch(0.52, 0.115, 272),
		fog: oklch(0.3, 0.1, 270),
		floor: oklch(0.92, 0.04, 268),
		sky: oklch(0.66, 0.095, 280),
		sun: oklch(0.82, 0.09, 250),
		sunAmt: 0.55,
		light: [1.6, 5, 9],
		lamp: 1,
		// a pale moonlit lift: characters stay clearly visible against the dark room
		figure: oklch(0.9, 0.05, 250),
		figureAmt: 0.85,
		glass: ramp(0.32, 0.11, 264),
		gradeTop: 'rgba(70,60,200,0.4)',
		gradeBottom: 'rgba(60,80,190,0.16)',
	},
} satisfies Record<string, Mood>;

/** Which mood each shot uses. Swap the names here to relight a shot. */
export const moodAt = (frame: number): Mood =>
	frame < SHOT_B ? MOODS.morning : frame < SHOT_C ? MOODS.golden : MOODS.night;

/** Cross-fade two moods, for time passing inside one shot. */
export const mixMood = (a: Mood, b: Mood, t: number): Mood => {
	const c = (x: Color, y: Color) => x.clone().lerp(y, t);
	const n = (x: number, y: number) => x + (y - x) * t;
	return {
		key: c(a.key, b.key),
		amb: c(a.amb, b.amb),
		fog: c(a.fog, b.fog),
		floor: c(a.floor, b.floor),
		sky: c(a.sky, b.sky),
		sun: c(a.sun, b.sun),
		sunAmt: n(a.sunAmt, b.sunAmt),
		light: [n(a.light[0], b.light[0]), n(a.light[1], b.light[1]), n(a.light[2], b.light[2])],
		lamp: n(a.lamp, b.lamp),
		figure: c(a.figure, b.figure),
		figureAmt: n(a.figureAmt, b.figureAmt),
		glass: {base: c(a.glass.base, b.glass.base), shade: c(a.glass.shade, b.glass.shade), deep: c(a.glass.deep, b.glass.deep), light: c(a.glass.light, b.glass.light)},
		gradeTop: t < 0.5 ? a.gradeTop : b.gradeTop,
		gradeBottom: t < 0.5 ? a.gradeBottom : b.gradeBottom,
	};
};
