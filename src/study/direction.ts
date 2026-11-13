import {Easing, interpolate} from 'remotion';
import type {Direction} from '../scene/Scene';
import type {Face, Pose} from '../scene/Stickman';
import type {Shot} from '../scene/acting';
import {MOODS, Mood, mixMood} from '../scene/moods';

/**
 * Staging study: the reference video's camera work rebuilt shot by shot in our
 * own rooms with our own two characters standing in. Each entry matches the
 * reference shot's timing, framing, lens angle, camera pitch and move. The
 * story, dialogue and character designs of the reference are not reproduced.
 *
 * Lens angles are vertical field of view, measured from the reference where
 * its perspective lines allowed it (see the notes on each shot).
 */

type V3 = [number, number, number];
type Key = {at: number; pos: V3; look: V3; fov: number; roll?: number};
type Cut = 'cut' | 'soft' | 'whip' | 'none';
export type StudyShot = {
	from: number;
	to: number;
	/** How this shot is entered. */
	cut: Cut;
	/** Short name of the technique, shown as the caption. */
	label: string;
	keys: Key[];
	mood: (f: number) => Mood;
	focus: V3 | ((f: number) => V3);
	blur?: number;
};

export const STUDY_FPS = 30;
export const STUDY_DURATION = 1751;

const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], CLAMP);
const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {...CLAMP, easing: Easing.inOut(Easing.cubic)});
const snap = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {...CLAMP, easing: Easing.bezier(0.2, 1.4, 0.35, 1)});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const wave = (f: number, period: number, phase = 0) => Math.sin((f / period) * Math.PI * 2 + phase);
const pulse = (f: number, t: number, w: number) => Math.max(0, 1 - Math.abs(f - t) / w);
const {morning, golden, night} = MOODS;
const hold = (m: Mood) => () => m;

// ---- places in our set -----------------------------------------------------
const SOFA_X = 2.15; // sitting on the sofa, facing into the room
const FACE_ROOM = -Math.PI / 2;
const LEG_NEAR: V3 = [1.9, 0.05, 0.72]; // sofa foot nearest the kitchen
const LEG_FAR: V3 = [1.9, 0.08, 2.95];
const DOORWAY: V3 = [-1.0, 0, -3.6];

// ---- the shot list ---------------------------------------------------------
export const SHOTS: StudyShot[] = [
	{
		// ref 0.0-1.9s: medium-wide, tracks sideways with a walking character
		from: 0, to: 58, cut: 'cut', label: 'track with the walker', mood: hold(night), focus: (f) => [lerp(-1.8, 0.5, ramp(f, 0, 58)), 1.3, 3.4],
		keys: [
			{at: 0, pos: [-2.0, 1.5, 0.4], look: [-1.8, 1.2, 3.3], fov: 62},
			{at: 58, pos: [0.2, 1.5, 0.9], look: [0.5, 1.2, 3.5], fov: 58},
		],
	},
	{
		// ref 2.0-2.9s: 90 deg, low, looking 3 deg up as the character drops in
		from: 58, to: 88, cut: 'soft', label: 'low and wide: the landing', mood: hold(night), focus: [0.7, 1.2, 3.5],
		keys: [
			{at: 58, pos: [1.3, 0.45, 1.3], look: [0.7, 1.15, 3.5], fov: 90},
			{at: 88, pos: [1.2, 0.5, 1.5], look: [0.7, 1.15, 3.5], fov: 88},
		],
	},
	{
		// ref 3.0-4.3s: 86-88 deg, 12-15 deg down, push-in on the action
		from: 88, to: 129, cut: 'soft', label: 'wide push-in from above', mood: hold(night), focus: [1.45, 1.5, 1.3],
		keys: [
			{at: 88, pos: [-0.7, 2.05, -0.3], look: [1.7, 0.85, 1.5], fov: 88},
			{at: 129, pos: [-0.3, 1.9, 0.0], look: [1.7, 0.85, 1.5], fov: 86},
		],
	},
	{
		// ref 4.3-5.6s: 78 deg, 35 deg down, sliding along the floor
		from: 129, to: 170, cut: 'whip', label: 'floor insert', mood: hold(night), focus: LEG_NEAR,
		keys: [
			{at: 129, pos: [1.0, 0.55, 0.0], look: [1.9, 0.04, 0.72], fov: 78},
			{at: 170, pos: [1.15, 0.5, 0.15], look: [1.9, 0.04, 0.72], fov: 78},
		],
	},
	{
		// ref 5.7-8.9s: 84 deg, 12 deg down; one move re-frames from the first subject to a second
		from: 170, to: 268, cut: 'soft', label: 'push and arc to a new subject', mood: hold(morning), focus: (f) => lerp3([SOFA_X, 1.3, 1.9], [2.45, 1.2, 0.35], ease(f, 215, 262)),
		keys: [
			{at: 170, pos: [-1.2, 1.75, 3.6], look: [2.2, 1.0, 1.9], fov: 84},
			{at: 268, pos: [1.0, 1.25, 1.3], look: [2.45, 1.15, 0.35], fov: 84},
		],
	},
	{
		// ref 9.0-15.3s: starts 86 deg / 16 deg down, travels and zooms to 59 deg / 10 deg down
		from: 268, to: 462, cut: 'soft', label: 'long push with a zoom, 86 to 59', mood: hold(morning), focus: [-2.4, 1.4, -6.1],
		keys: [
			{at: 268, pos: [0.4, 2.45, -3.8], look: [-2.4, 1.1, -6.2], fov: 86},
			{at: 462, pos: [-0.7, 1.85, -3.95], look: [-2.4, 1.25, -6.1], fov: 59},
		],
	},
	{
		// ref 15.5-21.7s: 102 deg at floor level, then the camera rises with the
		// character into a low-angle medium (about 70 deg) and pushes slowly
		from: 462, to: 652, cut: 'soft', label: 'floor level, then rise with the character', mood: hold(morning), focus: (f) => (f < 525 ? [1.1, 0.8, 0.35] : [1.5, 1.7, 0.6]),
		keys: [
			{at: 462, pos: [1.0, 0.22, 2.7], look: [0.9, 0.55, 0.3], fov: 102},
			{at: 520, pos: [1.05, 0.24, 2.6], look: [0.9, 0.55, 0.3], fov: 102},
			{at: 534, pos: [1.15, 0.95, 2.9], look: [1.25, 1.5, 0.6], fov: 72},
			{at: 652, pos: [1.2, 1.0, 2.6], look: [1.25, 1.5, 0.6], fov: 68},
		],
	},
	{
		// ref 21.9-23.3s: point of view through a peephole
		from: 652, to: 700, cut: 'cut', label: 'point of view', mood: hold(morning), focus: [0.5, 1.2, 2.4], blur: 0.4,
		keys: [
			{at: 652, pos: [-1.1, 1.55, -3.4], look: [0.6, 1.1, 3.5], fov: 100},
			{at: 700, pos: [-1.05, 1.55, -3.3], look: [0.6, 1.1, 3.5], fov: 98},
		],
	},
	{
		// ref 23.4-25.3s: flat side-on with a long lens; sunset turns to night inside the shot
		from: 700, to: 762, cut: 'soft', label: 'time passes in one framing', mood: (f) => mixMood(golden, night, ease(f, 722, 756)), focus: [0.9, 1.4, 4.0],
		keys: [
			{at: 700, pos: [-1.6, 1.45, 0.6], look: [0.9, 1.35, 4.3], fov: 46},
			{at: 762, pos: [-1.3, 1.45, 0.8], look: [0.9, 1.35, 4.3], fov: 46},
		],
	},
	{
		// ref 25.6-30.6s: straight down, pushing and rotating, with jump cuts
		from: 762, to: 920, cut: 'soft', label: 'straight down, with jump cuts', mood: hold(morning), focus: [SOFA_X, 1.2, 1.9], blur: 0.3,
		keys: [
			{at: 762, pos: [1.7, 2.98, 1.9], look: [1.72, 0, 1.9], fov: 108},
			{at: 920, pos: [1.7, 2.9, 1.9], look: [1.72, 0, 1.9], fov: 90, roll: 0.3},
		],
	},
	{
		// ref 30.7-35.0s: low beside the subject, push, pull back wider, then a
		// floor-level pan that carries us to the next place
		from: 920, to: 1052, cut: 'soft', label: 'low push, pull back, pan away', mood: hold(night), focus: (f) => lerp3([SOFA_X, 1.6, 2.3], [-2.6, 0.9, -2.45], ease(f, 1022, 1050)),
		keys: [
			{at: 920, pos: [0.9, 0.3, 3.1], look: [2.2, 1.05, 2.3], fov: 76},
			{at: 990, pos: [1.05, 0.35, 2.95], look: [2.2, 1.05, 2.3], fov: 74},
			{at: 1020, pos: [0.5, 0.55, 3.5], look: [2.2, 1.0, 2.3], fov: 86},
			{at: 1052, pos: [0.5, 0.4, 3.3], look: [-2.6, 0.8, -2.45], fov: 80},
		],
	},
	{
		// ref 35.3-35.6s: a brief close low angle before the main framing
		from: 1052, to: 1062, cut: 'soft', label: 'close low angle', mood: hold(night), focus: [SOFA_X, 1.9, 1.9],
		keys: [
			{at: 1052, pos: [1.3, 0.55, 2.7], look: [2.15, 1.5, 1.9], fov: 70},
			{at: 1062, pos: [1.28, 0.56, 2.72], look: [2.15, 1.5, 1.9], fov: 70},
		],
	},
	{
		// ref 35.6-40.3s: frontal, symmetrical medium with a slow push; night becomes morning
		from: 1062, to: 1209, cut: 'cut', label: 'symmetrical tableau, slow push', mood: (f) => mixMood(night, morning, ease(f, 1173, 1205)), focus: [SOFA_X, 1.6, 1.9],
		keys: [
			{at: 1062, pos: [-0.5, 1.05, 1.9], look: [2.3, 1.0, 1.9], fov: 60},
			{at: 1209, pos: [-0.1, 1.05, 1.9], look: [2.3, 1.0, 1.9], fov: 58},
		],
	},
	{
		// ref 40.3-43.6s: one continuous tour: down to the floor, along it, back up
		from: 1209, to: 1310, cut: 'none', label: 'crane down, along the floor, back up', mood: hold(morning), focus: (f) => (f < 1228 || f > 1296 ? [SOFA_X, 1.3, 1.9] : lerp3(LEG_NEAR, LEG_FAR, ease(f, 1256, 1284))),
		keys: [
			{at: 1209, pos: [-0.1, 1.05, 1.9], look: [2.3, 1.0, 1.9], fov: 58},
			{at: 1232, pos: [1.25, 0.32, 1.1], look: [1.9, 0.05, 0.72], fov: 76},
			{at: 1256, pos: [1.3, 0.3, 1.15], look: [1.9, 0.05, 0.72], fov: 76},
			{at: 1284, pos: [1.25, 0.3, 2.5], look: [1.9, 0.1, 2.9], fov: 76},
			{at: 1310, pos: [0.7, 1.2, 2.3], look: [2.15, 1.4, 1.9], fov: 70},
		],
	},
	{
		// ref 43.7-48.0s: rises to a 107-118 deg overview pitched 40-53 deg down,
		// orbits through jump cuts, ends 106 deg with a face large in the foreground
		from: 1310, to: 1442, cut: 'none', label: 'rise to a 118 degree overview, orbit', mood: hold(morning), focus: (f) => (f < 1410 ? [1.6, 0.8, 1.8] : [-1.3, 1.9, 0.9]), blur: 0.6,
		keys: [
			{at: 1310, pos: [0.7, 1.2, 2.3], look: [2.15, 1.4, 1.9], fov: 70},
			{at: 1345, pos: [-1.9, 2.9, 3.9], look: [1.3, 0.2, 1.6], fov: 107},
			{at: 1400, pos: [-2.5, 2.9, 2.2], look: [1.0, 0.3, 1.4], fov: 118},
			{at: 1442, pos: [-2.3, 2.3, 0.4], look: [0.6, 0.9, 1.6], fov: 106},
		],
	},
	{
		// ref 48.3-50.5s: medium on one character, then a pan that reveals the other
		from: 1442, to: 1515, cut: 'whip', label: 'the pan is the reveal', mood: hold(morning), focus: (f) => [lerp(-1.3, 0.5, ease(f, 1470, 1500)), 1.5, 1.2],
		keys: [
			{at: 1442, pos: [-0.9, 1.45, 4.2], look: [-1.3, 1.4, 1.2], fov: 50},
			{at: 1470, pos: [-0.85, 1.45, 4.2], look: [-1.3, 1.4, 1.2], fov: 50},
			{at: 1500, pos: [-0.1, 1.45, 4.2], look: [0.5, 1.4, 1.2], fov: 50},
			{at: 1515, pos: [-0.1, 1.45, 4.2], look: [0.5, 1.4, 1.2], fov: 50},
		],
	},
	{
		// ref 50.5-52.3s: frontal medium, then a push into what the character holds
		from: 1515, to: 1569, cut: 'none', label: 'push in to the object', mood: hold(morning), focus: [0.68, 1.3, 1.62],
		keys: [
			{at: 1515, pos: [-0.1, 1.45, 4.2], look: [0.5, 1.4, 1.2], fov: 50},
			{at: 1569, pos: [0.3, 1.4, 2.9], look: [0.68, 1.3, 1.62], fov: 40},
		],
	},
	{
		// ref 52.3-53.4s: through the object into another time; wide, then drift to a two-shot
		from: 1569, to: 1603, cut: 'soft', label: 'another time: wide, then two-shot', mood: hold(golden), focus: [0.75, 1.4, 3.4],
		keys: [
			{at: 1569, pos: [0.3, 1.5, 0.0], look: [0.75, 1.25, 3.4], fov: 70},
			{at: 1603, pos: [0.7, 1.45, 0.7], look: [0.8, 1.3, 3.4], fov: 62},
		],
	},
	{
		// ref 53.5-55.2s: close-up with shallow focus; the object holds its place
		// on screen while the world behind it changes
		from: 1603, to: 1656, cut: 'soft', label: 'close-up, shallow focus, match on the object', mood: (f) => mixMood(morning, night, ease(f, 1634, 1654)), focus: [0.5, 1.9, 1.2], blur: 1.4,
		keys: [
			{at: 1603, pos: [0.0, 1.62, 3.3], look: [0.62, 1.62, 1.2], fov: 40},
			{at: 1656, pos: [0.05, 1.62, 3.1], look: [0.62, 1.62, 1.2], fov: 38},
		],
	},
	{
		// ref 55.2-58.4s: pull back to a 77 deg wide, 12 deg down, then a slow push on the last tableau
		from: 1656, to: 1751, cut: 'none', label: 'pull back, then the final tableau', mood: hold(night), focus: (f) => lerp3([0.6, 1.5, 1.2], [SOFA_X, 1.2, 1.9], ease(f, 1660, 1700)),
		keys: [
			{at: 1656, pos: [0.05, 1.62, 3.1], look: [0.62, 1.62, 1.2], fov: 38},
			{at: 1700, pos: [-0.9, 1.75, 2.0], look: [2.0, 0.95, 1.9], fov: 77},
			{at: 1751, pos: [-0.6, 1.7, 2.0], look: [2.0, 0.95, 1.9], fov: 74},
		],
	},
];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.from && f < s.to) ?? SHOTS[SHOTS.length - 1];

// ---- camera ----------------------------------------------------------------
const camera = (f: number): Shot => {
	const s = shotAt(f);
	const k = s.keys;
	let i = 0;
	while (i < k.length - 2 && f >= k[i + 1].at) i++;
	const a = k[i];
	const b = k[i + 1];
	// A shot with two keys is already moving when it starts and settles at the
	// end; longer paths ease through each leg so the move reads as one.
	const t = interpolate(f, [a.at, b.at], [0, 1], {...CLAMP, easing: k.length === 2 ? Easing.out(Easing.quad) : Easing.inOut(Easing.sin)});
	const d = (p: number, ph: number) => Math.sin((f / p) * Math.PI * 2 + ph);
	const pos = lerp3(a.pos, b.pos, t);
	return {
		// the camera never sits completely still
		pos: [pos[0] + d(97, 0) * 0.012, pos[1] + d(71, 1.3) * 0.008, pos[2] + d(113, 2.1) * 0.012],
		target: lerp3(a.look, b.look, t),
		fov: lerp(a.fov, b.fov, t),
		roll: lerp(a.roll ?? 0, b.roll ?? 0, t),
	};
};

// ---- acting ----------------------------------------------------------------
const FACE: Face = {blink: 0, lid: 0.25, look: [0, 0], browL: [0.03, -0.1], browR: [0.03, -0.1], mouth: [0.09, 0, 0, 0]};

/** Standing idle: breathing, a slow weight shift, the odd blink. */
const stand = (pos: V3, yaw: number, f: number, o: Partial<Pose> = {}, face: Partial<Face> = {}): Pose => {
	const br = wave(f, 75);
	const shift = wave(f, 170, 0.6);
	return {
		pos,
		yaw,
		bob: br * 0.008,
		lean: [0.04, shift * 0.03],
		twist: 0,
		stretch: br * 0.012,
		headStretch: 0,
		headYaw: 0,
		headPitch: 0,
		headRoll: wave(f, 110) * 0.03,
		headOffset: [0, br * 0.006, 0],
		handL: [0.25, 0.82, 0.03],
		handR: [-0.25, 0.82, 0.03],
		elbowL: [1, -0.2, -0.6],
		elbowR: [-1, -0.2, -0.6],
		footL: [0.11, 0.03, 0],
		footR: [-0.11, 0.03, 0],
		...o,
		face: {...FACE, blink: (f + pos[0] * 40) % 97 < 4 ? 1 : 0, ...face},
	};
};

/** Walking from a to b; p is progress 0..1. */
const walk = (a: V3, b: V3, p: number, f: number, o: Partial<Pose> = {}): Pose => {
	const dist = Math.hypot(b[0] - a[0], b[2] - a[2]);
	const th = (p * dist) / 0.55 * Math.PI;
	const moving = Math.min(1, p * 8, (1 - p) * 8);
	const s = Math.sin(th);
	return stand(lerp3(a, b, p), Math.atan2(b[0] - a[0], b[2] - a[2]), f, {
		bob: moving * (Math.abs(s) * 0.035 - 0.02),
		lean: [moving * 0.1, moving * s * 0.04],
		twist: moving * s * 0.12,
		stretch: -moving * Math.pow(Math.abs(Math.cos(th)), 6) * 0.05,
		handL: [0.25, 0.86, -0.2 * s * moving],
		handR: [-0.25, 0.86, 0.2 * s * moving],
		footL: [0.11, 0.03 + moving * Math.max(0, Math.cos(th)) * 0.14, moving * 0.27 * s],
		footR: [-0.11, 0.03 + moving * Math.max(0, -Math.cos(th)) * 0.14, -moving * 0.27 * s],
		...o,
	});
};

/** Sitting on the sofa at depth z. */
const sit = (z: number, f: number, o: Partial<Pose> = {}, face: Partial<Face> = {}): Pose =>
	stand([SOFA_X, 0, z], FACE_ROOM, f, {
		bob: -0.12 + wave(f, 75) * 0.006,
		lean: [-0.1, 0],
		handL: [0.2, 0.74, 0.3],
		handR: [-0.2, 0.74, 0.3],
		elbowL: [1, -0.3, -0.3],
		elbowR: [-1, -0.3, -0.3],
		footL: [0.12, 0.03, 0.46],
		footR: [-0.12, 0.03, 0.46],
		...o,
	}, face);

const HIPS: Partial<Pose> = {handL: [0.2, 0.9, 0.03], handR: [-0.2, 0.9, 0.03], elbowL: [1, 0.1, -0.5], elbowR: [-1, 0.1, -0.5]};
const BORED: Partial<Face> = {lid: 0.38, browL: [0.06, -0.12], browR: [-0.02, 0.2], mouth: [0.105, 0, -0.05, 0]};
const WORRIED: Partial<Face> = {lid: 0, browL: [0.06, -0.3], browR: [0.06, -0.3], mouth: [0.07, 0, -0.06, 0]};
/** Mouth shapes swapped every three frames while a character is speaking. */
const chat = (f: number) => [1, 0.2, 0.6, 0.9, 0.05, 0.75, 0.35][Math.floor(f / 3) % 7] * 0.05;

const officer = (f: number): Pose | null => {
	if (f < 58) return walk([-1.8, 0, 3.3], [0.5, 0, 3.5], ramp(f, 0, 58), f, {}, );
	if (f < 88) {
		// drops in and lands: stretch on the way down, squash on impact
		const fall = 1 - ease(f, 58, 67);
		const land = pulse(f, 68, 4);
		return stand([0.7, fall * 0.9, 3.5], Math.PI, f, {bob: -land * 0.12, stretch: fall * 0.12 - land * 0.16, headStretch: -land * 0.08, handL: [0.42, 1.1 + fall * 0.3, 0], handR: [-0.42, 1.1 + fall * 0.3, 0], footL: [0.14, 0.03, 0.02], footR: [-0.14, 0.03, 0]}, {lid: 0.1});
	}
	if (f < 170) {
		// shoving the sofa: lean in, small rhythmic pushes
		const shove = Math.max(0, wave(f, 16));
		return stand([1.42 + shove * 0.03, 0, 1.3], Math.PI / 2, f, {lean: [0.38 + shove * 0.06, 0], bob: -0.05, stretch: -shove * 0.03, handL: [0.16, 0.98, 0.42], handR: [-0.16, 0.98, 0.42], footL: [0.12, 0.03, -0.18], footR: [-0.12, 0.03, 0.1], headPitch: 0.15}, {lid: 0.45, mouth: [0.08, 0, -0.08, 0]});
	}
	if (f < 462) return null;
	if (f < 652) {
		// peeks out sideways from behind the sofa arm, then stands up
		const up = snap(f, 520, 534);
		const speaking = f > 548 && f < 622 ? chat(f) : 0;
		const laugh = ramp(f, 628, 636);
		const point = snap(f, 596, 604) * (1 - ramp(f, 622, 630));
		return stand(lerp3([2.05, 0, 0.3], [1.5, 0, 0.6], up), 0.05, f, {
			...HIPS,
			bob: lerp(-0.3, 0, up) + laugh * Math.abs(wave(f, 8)) * 0.02,
			lean: [0.06, lerp(-1.15, 0.05, up)],
			stretch: pulse(f, 526, 5) * 0.12 - pulse(f, 533, 3) * 0.05,
			headRoll: lerp(-0.25, 0.05, up),
			headYaw: lerp(0, -0.2, up) * (1 - point),
			handL: lerp3([0.2, 0.9, 0.03], [0.3, 1.5, 0.25], point),
			footL: [0.13, 0.03, 0.02],
			footR: [-0.13, 0.03, -0.02],
		}, {...BORED, lid: lerp(0.5, 0.36, up) - laugh * 0.1, look: [lerp(-0.6, 0, up), 0], mouth: [0.105 - speaking * 0.8, speaking + laugh * 0.05, -0.05 + laugh * 0.16, 0]});
	}
	if (f < 700) return walk([0.2, 0, 1.2], [0.7, 0, 3.6], ramp(f, 652, 700), f);
	if (f < 1345) return null;
	if (f < 1442) return stand(f < 1410 ? [0.9, 0, 2.9] : [1.0, 0, 2.4], -2.2, f, HIPS, BORED);
	if (f < 1569) {
		// the handshake, then holds something up for the camera to push in on
		const shake = ease(f, 1474, 1486) * (1 - ease(f, 1512, 1522));
		const show = snap(f, 1520, 1532);
		return stand([0.5, 0, 1.2], -0.3, f, {
			handR: lerp3([-0.25, 0.82, 0.03], [-0.5, 1.0 + wave(f, 9) * 0.03, 0.2], shake),
			handL: lerp3([0.25, 0.82, 0.03], [0.3, 1.3, 0.35], show),
			headYaw: lerp(0.5, 0, show),
		}, {...BORED, lid: 0.3, mouth: [0.1, 0, 0.08, 0]});
	}
	if (f < 1603) return stand([1.3, 0, 3.4], Math.PI, f, {handL: [0.45, 1.55 + wave(f, 10) * 0.05, 0.1], elbowL: [1, -0.5, -0.3]}, {lid: 0.15, mouth: [0.1, 0, 0.12, 0]});
	if (f < 1656) {
		// close-up: a slow smirk, hand raised beside the head
		const smirk = ease(f, 1608, 1622);
		return stand([0.5, 0, 1.2], -0.3, f, {handL: [0.42, 1.72, 0.2], elbowL: [1, -0.6, -0.2], headRoll: 0.08 * smirk}, {lid: 0.3 + smirk * 0.25, browL: [0.07, -0.15], browR: [-0.02, 0.25], mouth: [0.1, 0, 0.14 * smirk, 0]});
	}
	// crosses to the sofa and flops onto it
	if (f < 1690) return walk([0.5, 0, 1.2], [1.75, 0, 1.9], ramp(f, 1656, 1690), f);
	const flop = snap(f, 1690, 1700);
	const settle = pulse(f, 1699, 4);
	return sit(1.9, f, {
		pos: [lerp(1.75, SOFA_X, flop), 0, 1.9],
		yaw: lerp(1.06, FACE_ROOM, flop),
		bob: lerp(0, -0.12, flop) - settle * 0.05,
		stretch: -settle * 0.12,
		lean: [lerp(0.05, -0.2, flop), 0],
		handL: lerp3([0.25, 0.82, 0.03], [0.5, 0.95, -0.1], flop),
		headRoll: 0.08,
	}, {lid: 0.5, mouth: [0.1, 0, 0.14, 0]});
};

const civilian = (f: number): Pose | null => {
	if (f < 170) return null;
	if (f < 268) return sit(1.9, f, {headYaw: lerp(-0.5, 0.4, ease(f, 190, 225)), handR: [-0.17, 0.95, 0.32]}, {look: [lerp(-0.5, 0.4, ease(f, 190, 225)), 0]});
	if (f < 462) {
		// uneasy in the kitchen, then a hand goes up to the head (the call)
		const call = snap(f, 400, 414);
		return stand([-2.4, 0, -6.05], 0.55, f, {
			lean: [0.03, wave(f, 64) * 0.04],
			headYaw: wave(f, 90) * 0.3 * (1 - call),
			handL: lerp3([0.25, 0.82, 0.03], [0.2, 1.6, 0.02], call),
			elbowL: [1, lerp(-0.2, -0.7, call), -0.3],
			handR: [-0.17, 1.12, 0.22],
		}, {...WORRIED, look: [wave(f, 90) * 0.6, 0], mouth: [0.07, call * chat(f), -0.06, 0]});
	}
	if (f < 652) return stand(DOORWAY, 0.4, f, {handR: [-0.17, 1.12, 0.22], lean: [0, wave(f, 64) * 0.04]}, WORRIED);
	if (f < 700) return null;
	if (f < 762) {
		// reaching up to the window
		return stand([0.9, 0, 4.05], 0, f, {handL: [0.22, 1.55 + wave(f, 22) * 0.04, 0.3], handR: [-0.22, 1.5 + wave(f, 22, 1) * 0.04, 0.3], elbowL: [1, -0.5, 0], elbowR: [-1, -0.5, 0], headPitch: -0.15});
	}
	if (f < 920) {
		// seen from straight above: each jump cut finds them further along
		const step = Math.min(4, Math.floor((f - 762) / 32));
		return sit(1.15 + step * 0.4, f, {headPitch: -0.5}, {...WORRIED, look: [0, 0.6]});
	}
	if (f < 1052) return sit(2.3, f, {headYaw: wave(f, 50) * 0.45, lean: [-0.02, 0], handL: [0.2, 0.95, 0.25], handR: [-0.2, 0.95, 0.25]}, {...WORRIED, look: [wave(f, 50) * 0.8, 0]});
	if (f < 1310) {
		// keeping watch, nodding off, then waking with a start
		const sleep = ease(f, 1090, 1160) * (1 - snap(f, 1209, 1216));
		const start = pulse(f, 1213, 5);
		return sit(1.9, f, {
			headPitch: sleep * 0.45,
			headRoll: sleep * 0.15,
			headOffset: [0, -sleep * 0.03 + start * 0.04, 0],
			stretch: start * 0.1,
			lean: [-0.1 + sleep * 0.08, sleep * 0.05],
			headYaw: f > 1216 ? wave(f, 40) * 0.4 : 0,
		}, {...(f > 1209 ? WORRIED : {}), lid: sleep * 0.9, blink: sleep > 0.9 ? 1 : 0, look: [f > 1216 ? wave(f, 40) * 0.7 : 0, 0]});
	}
	if (f < 1345) return sit(1.9, f, {}, WORRIED);
	if (f < 1410) return sit(1.3, f, {headYaw: 0.4}, WORRIED);
	if (f < 1442) return stand([-1.3, 0, 0.9], -2.2, f, HIPS, {lid: 0.3, browL: [-0.02, 0.3], browR: [-0.02, 0.3], mouth: [0.08, 0, -0.1, 0]});
	if (f < 1569) {
		const shake = ease(f, 1474, 1486) * (1 - ease(f, 1512, 1522));
		return stand([-1.3, 0, 1.2], 0.3, f, {handL: lerp3([0.25, 0.82, 0.03], [0.5, 1.0 + wave(f, 9) * 0.03, 0.2], shake), headYaw: -0.3 * shake}, {lid: 0.2, browL: [0, 0.2], browR: [0, 0.2], mouth: [0.08, 0, -0.06, 0]});
	}
	if (f < 1603) return stand([0.2, 0, 3.4], Math.PI, f, {handR: [-0.45, 1.5 + wave(f, 10, 2) * 0.05, 0.1], elbowR: [-1, -0.5, -0.3]}, {lid: 0, mouth: [0.09, 0, 0.12, 0]});
	return null;
};

export const studyDirection: Direction = {
	camera,
	mood: (f) => shotAt(f).mood(f),
	focus: (f) => {
		const s = shotAt(f).focus;
		return typeof s === 'function' ? s(f) : s;
	},
	blur: (f) => shotAt(f).blur ?? 1,
	officer,
	civilian,
};
