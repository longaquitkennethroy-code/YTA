import React from 'react';
import {Easing, interpolate} from 'remotion';
import type {Direction} from '../../scene/Scene';
import type {Face, Pose} from '../../scene/Stickman';
import type {Shot} from '../../scene/acting';
import type {SofaStyle} from '../../scene/Room';
import {MOODS, Mood, mixMood} from '../../scene/moods';
import {FACE_ROOM, HIPS, SOFA_X, ease, lerp, lerp3, pulse, ramp, sit, snap, stand, walk, wave} from '../../study/direction';
import {Boxes, Car, Cash, TV, lampGlow, paintWalls, tvGlow} from './Set';
import {WORDS} from './words';

/**
 * "Why your raise made you poorer" — one continuous camera, cut to the voice.
 * Times are frames at 30 fps; each beat is keyed to the word it lands on.
 */

type V3 = [number, number, number];
export const FPS = 30;
const END_OF_VOICE = Math.ceil(44.75 * FPS);
export const DURATION = END_OF_VOICE + 30;

/** Frame where the n-th occurrence of a word starts (1-based). */
const at = (word: string, n = 1) => {
	let k = 0;
	for (const w of WORDS) {
		if (w.text.toLowerCase().replace(/[^a-z'-]/g, '') === word) {
			k++;
			if (k === n) return Math.round(w.from * FPS);
		}
	}
	throw new Error(`no word ${word} #${n}`);
};

// ---- story beats -----------------------------------------------------------
const B = {
	brain: at('brain'),
	money: at('money'),
	habit: at('habit'),
	oldCouch: at('couch'),
	tired: at('tired'),
	newCouch: at('new'),
	tvSmall: at('tv'),
	small: at('small'),
	bigTV: at('then', 2) - 6,
	car: at('car'),
	cheap: at('cheap'),
	nicer: at('nicer'),
	apartment: at('apartment'),
	moved: at('moved'),
	fitTV: at('tv', 2),
	every: at('every'),
	raise2: at('raise', 2),
	moreMoney: at('more'),
	moneyIn: at('money', 2),
	in: at('in'),
	moreStuff: at('more', 2),
	stuff: at('stuff'),
	out: at('out'),
	five: at('five'),
	double: at('double'),
	zero: at('zero'),
	saved: at('saved'),
	called: at('called'),
	creep: at('creep'),
	resets: at('resets'),
	normal: at('normal'),
	everyTime: at('every', 2),
	earnMore: at('earn', 2),
	more: at('more', 3),
	coworker: at('coworker') - 6,
	sameRaises: at('raises'),
	kept: at('kept'),
	oldCouch2: at('couch', 3),
	retired: at('retired'),
	fortyFive: at('forty-five'),
	still: at("you're") - 4,
	tv: at('tv', 3),
};

// ---- moods -----------------------------------------------------------------
const {morning, golden, night} = MOODS;
const mood = (f: number): Mood => {
	if (f < B.five) return morning;
	if (f < B.coworker) return mixMood(morning, golden, ease(f, B.five, B.five + 20) * 0.6);
	if (f < B.retired) return morning;
	if (f < B.still) return mixMood(morning, golden, ease(f, B.retired, B.retired + 12));
	return night;
};

// ---- camera: one continuous move -------------------------------------------
type Key = {at: number; pos: V3; look: V3; fov: number; roll?: number};
const YOU_HOME: V3 = [0.3, 0, 1.2];
const KEYS: Key[] = [
	// close on the paycheck, then the camera backs away to show the plain little room
	{at: 0, pos: [0.45, 1.38, 2.75], look: [0.28, 1.3, 1.2], fov: 50},
	{at: B.brain, pos: [0.42, 1.45, 2.8], look: [0.3, 1.45, 1.2], fov: 54},
	{at: B.habit + 20, pos: [-0.9, 1.85, 4.05], look: [1.0, 0.95, 1.4], fov: 84},
	// arc toward the tired couch; hold while the new one lands
	{at: B.tired + 10, pos: [-0.5, 1.7, 3.7], look: [1.5, 0.9, 1.65], fov: 82},
	{at: B.newCouch + 18, pos: [-0.2, 1.6, 3.3], look: [2.1, 0.9, 1.9], fov: 78},
	// over the shoulder to the TV across the room
	{at: B.small, pos: [2.75, 1.85, 1.45], look: [-2.9, 1.0, 1.95], fov: 100},
	{at: B.bigTV + 14, pos: [2.75, 1.82, 1.5], look: [-2.9, 1.35, 1.95], fov: 96},
	// swing round to the window: the car outside; the room repaints around us
	{at: B.cheap, pos: [0.75, 1.45, 1.9], look: [0.6, 1.15, 4.5], fov: 72},
	{at: B.moved, pos: [0.3, 1.75, 0.4], look: [0.6, 1.2, 4.5], fov: 90},
	// back out wide: the new apartment, the big TV
	{at: B.fitTV + 10, pos: [-1.2, 1.9, 3.9], look: [0.8, 1.0, 1.4], fov: 92},
	// medium on you for the next raise and the cash
	{at: B.raise2, pos: [-0.15, 1.5, 3.7], look: [0.3, 1.3, 1.2], fov: 64},
	{at: B.in + 6, pos: [-0.25, 1.55, 3.85], look: [0.3, 1.35, 1.2], fov: 70},
	{at: B.out + 10, pos: [-1.0, 1.95, 4.0], look: [0.6, 1.0, 1.4], fov: 92},
	// years pass: drift to the sofa, then push right into the phone
	{at: B.double, pos: [0.1, 1.45, 2.6], look: [2.1, 1.05, 1.9], fov: 70},
	{at: B.zero, pos: [0.7, 1.45, 1.25], look: [1.75, 1.45, 1.7], fov: 54},
	{at: B.saved + 8, pos: [0.8, 1.45, 1.3], look: [1.75, 1.45, 1.7], fov: 50},
	// rise to the wide-angle overview of everything you bought
	{at: B.creep + 6, pos: [-2.55, 2.92, 4.25], look: [0.9, 0.15, 1.3], fov: 112},
	{at: B.more + 12, pos: [-2.7, 2.92, 2.6], look: [0.9, 0.2, 1.6], fov: 116},
	// drop back into the plain room: the coworker
	{at: B.sameRaises, pos: [-0.2, 1.55, 3.9], look: [0.4, 1.3, 1.4], fov: 66},
	{at: B.kept + 4, pos: [-0.1, 1.45, 3.4], look: [2.1, 1.0, 1.9], fov: 72},
	{at: B.retired + 4, pos: [0.3, 1.35, 2.9], look: [2.1, 1.15, 1.9], fov: 64},
	{at: B.still - 1, pos: [0.55, 1.3, 2.7], look: [2.1, 1.15, 1.9], fov: 60},
	// last shot: you, small on the huge sofa in the TV light
	{at: B.still, pos: [-1.3, 1.65, 3.4], look: [2.0, 0.9, 1.9], fov: 70},
	{at: DURATION, pos: [-0.75, 1.5, 3.0], look: [2.0, 0.95, 1.9], fov: 64},
];
/** Places where the picture jumps instead of moving (a cut within the move). */
const JUMPS = [B.still];

const camera = (f: number): Shot => {
	let i = 0;
	while (i < KEYS.length - 2 && f >= KEYS[i + 1].at) i++;
	const a = KEYS[i];
	const b = KEYS[i + 1];
	const jump = JUMPS.includes(b.at) && f < b.at;
	const t = jump ? 0 : interpolate(f, [a.at, b.at], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
	const p = lerp3(a.pos, b.pos, t);
	const d = (q: number, ph: number) => Math.sin((f / q) * Math.PI * 2 + ph);
	return {
		pos: [p[0] + d(97, 0) * 0.012, p[1] + d(71, 1.3) * 0.008, p[2] + d(113, 2.1) * 0.012],
		target: lerp3(a.look, b.look, t),
		fov: lerp(a.fov, b.fov, t),
		roll: 0,
	};
};

// ---- acting ----------------------------------------------------------------
const GRIN: Partial<Face> = {lid: 0.1, browL: [0.07, -0.1], browR: [0.07, -0.1], mouth: [0.11, 0.03, 0.16, 0]};
const SMUG: Partial<Face> = {lid: 0.3, browL: [0.04, -0.12], browR: [0.08, 0.1], mouth: [0.1, 0, 0.12, 0]};
const SQUINT: Partial<Face> = {lid: 0.5, browL: [-0.02, 0.25], browR: [-0.02, 0.25], mouth: [0.07, 0, -0.06, 0]};
const SAD: Partial<Face> = {lid: 0.35, browL: [0.05, -0.32], browR: [0.05, -0.32], mouth: [0.08, 0, -0.12, 0]};
const SHOCK: Partial<Face> = {lid: 0, browL: [0.1, -0.15], browR: [0.1, -0.15], mouth: [0.06, 0.07, 0, 0]};

/** You: the viewer's stand-in. */
const you = (f: number): Pose | null => {
	if (f < B.newCouch) {
		// proud of the paycheck, then sizing up the tired old couch
		const turn = snap(f, B.oldCouch - 4, B.oldCouch + 6);
		const go = ease(f, B.oldCouch - 6, B.tired);
		const hop = pulse(f, 8, 6);
		const brainTap = snap(f, B.brain - 2, B.brain + 4) * (1 - ease(f, B.habit, B.habit + 10));
		return stand(lerp3(YOU_HOME, [1.1, 0, 1.75], go), lerp(0.05, 1.05, turn), f, {
			bob: hop * 0.05,
			stretch: hop * 0.08 + pulse(f, B.money, 4) * 0.05,
			handR: lerp3([-0.15, 1.3, 0.38], [-0.25, 0.85, 0.05], turn),
			handL: lerp3([0.15, 1.25, 0.36], [0.22, 1.72, 0.12], brainTap),
			elbowL: [1, -0.3, -0.4],
			headYaw: turn * 0.2,
			headPitch: turn * 0.1,
			held: f < B.oldCouch ? 'paycheck' : null,
		}, f < B.oldCouch ? GRIN : SQUINT);
	}
	if (f < B.car) {
		// sitting on the new couch: proud, then staring at the TV
		const drop = pulse(f, B.newCouch + 1, 4);
		const stare = ease(f, B.small - 6, B.small + 4);
		const big = f >= B.bigTV;
		return sit(1.9, f, {
			bob: -0.12 - drop * 0.06,
			stretch: -drop * 0.12,
			lean: [lerp(-0.18, 0.16, stare) * (big ? 0 : 1) - (big ? 0.2 : 0), 0],
			handL: f < B.small - 10 ? [0.55, 1.0, -0.1] : [0.2, 0.74, 0.3],
			handR: f < B.small - 10 ? [-0.55, 1.0, -0.1] : big ? [-0.2, 0.95, 0.35] : [-0.2, 0.74, 0.3],
			held: big ? 'remote' : null,
		}, f < B.small - 10 ? SMUG : big ? GRIN : SQUINT);
	}
	if (f < B.raise2 - 20) {
		// at the window, frowning at the car; then pleased with the new place
		const happy = f >= B.fitTV;
		// beside the window, looking out at the car, then back to us
		const back = snap(f, B.fitTV - 6, B.fitTV + 4);
		return stand([-0.05, 0, 3.75], lerp(2.6, 0.4, back), f, {...HIPS, headPitch: 0.05}, happy ? GRIN : SQUINT);
	}
	if (f < B.five) {
		// another raise: catches the paycheck, the cash rains in
		const catchIt = snap(f, B.raise2 - 4, B.raise2 + 4);
		const hit = Math.max(pulse(f, B.moreMoney + 12, 3), pulse(f, B.moneyIn + 12, 3), pulse(f, B.in + 12, 3));
		return stand(YOU_HOME, 0.08, f, {
			bob: -hit * 0.03,
			stretch: catchIt * 0.0 + pulse(f, B.raise2, 4) * 0.1 - hit * 0.08,
			handR: [-0.2, 1.3, 0.4],
			handL: [0.3, 1.35, 0.38],
			elbowL: [1, -0.3, -0.3],
			held: catchIt > 0.5 ? 'paycheck' : null,
		}, f < B.moreStuff ? GRIN : SHOCK);
	}
	if (f < B.coworker) {
		// years later, sunk into the big sofa; the phone says it all
		const lift = snap(f, B.zero - 14, B.zero - 4);
		const slump = ease(f, B.creep, B.creep + 20);
		const shrug = snap(f, B.resets - 4, B.resets + 6) * (1 - ease(f, B.normal + 10, B.normal + 25));
		return sit(1.9, f, {
			bob: -0.12 - slump * 0.04,
			lean: [-0.12 - slump * 0.08, 0],
			handR: lerp3([-0.2, 0.74, 0.3], [-0.3, 1.35, 0.5], lift * (1 - slump)),
			handL: shrug > 0 ? lerp3([0.2, 0.74, 0.3], [0.45, 1.25, 0.15], shrug) : [0.2, 0.74, 0.3],
			elbowR: [-1, -0.4, -0.3],
			headPitch: lift * (1 - slump) * 0.15,
			held: f < B.creep + 10 ? 'phone' : null,
		}, f < B.zero ? {...GRIN, lid: 0.2} : f < B.creep ? SHOCK : SAD);
	}
	if (f < B.still) return null;
	// still paying off the TV: alone in the dark with the bill
	return sit(1.9, f, {
		bob: -0.16,
		lean: [-0.05, 0.04],
		handR: [-0.1, 1.05, 0.42],
		handL: [0.2, 0.74, 0.3],
		headPitch: 0.15,
		held: 'bill',
	}, {...SAD, blink: (f - B.still) % 70 < 4 ? 1 : 0});
};

/** The coworker: same raises, different habit. */
const coworker = (f: number): Pose | null => {
	if (f < B.coworker || f >= B.still) return null;
	if (f < B.kept - 2) {
		const show = snap(f, B.coworker + 2, B.coworker + 10);
		return stand([0.4, 0, 1.4], 0.1, f, {handR: lerp3([-0.25, 0.82, 0.03], [-0.15, 1.3, 0.4], show), held: 'paycheck'}, SMUG);
	}
	if (f < B.retired) {
		// sits on the old couch and pats it
		const pat = Math.max(0, wave(f, 9)) * ease(f, B.oldCouch2 - 4, B.oldCouch2 + 4);
		return sit(1.9, f, {handL: [0.5, 0.62 + pat * 0.08, -0.1], held: null}, {...SMUG, lid: 0.2});
	}
	// retired: leans back, shades on, drink in hand
	const relax = snap(f, B.retired - 2, B.retired + 8);
	return sit(1.9, f, {
		lean: [lerp(-0.1, -0.32, relax), 0],
		bob: -0.14,
		handL: lerp3([0.2, 0.74, 0.3], [0.3, 1.75, -0.12], relax),
		elbowL: [1, -0.6, -0.4],
		handR: [-0.22, 1.0, 0.36],
		held: 'drink',
		shades: relax > 0.5,
		headRoll: 0.1,
	}, {lid: 0.2, mouth: [0.1, 0, 0.16, 0]});
};

// ---- set dressing ----------------------------------------------------------
const sofa = (f: number): SofaStyle => {
	if (f >= B.coworker && f < B.still) return 'old';
	return f < B.newCouch ? 'old' : 'new';
};

/** Box arrivals: three on "stuff out", then the piles keep growing. */
const BOX_TIMES = [B.moreStuff, B.stuff, B.out, B.five, B.double, B.zero - 10, B.called, B.creep, B.everyTime, B.everyTime + 12, B.earnMore, B.more];

const set = (f: number): React.ReactNode => {
	const coworkerWorld = f >= B.coworker && f < B.still;
	const upgraded = !coworkerWorld && f >= B.apartment;
	paintWalls(upgraded);
	if (f >= B.still) tvGlow(1);
	else lampGlow(0);
	const bigTV = !coworkerWorld && f >= B.bigTV;
	const pop = bigTV ? 1 + pulse(f, B.bigTV + 2, 4) * 0.25 : 1;
	const sportCar = !coworkerWorld && f >= B.fitTV + 8;
	const bills = [B.moreMoney, B.moneyIn, B.in, B.in + 5].map((t, k) => ({
		at: t - 10,
		from: [-0.4 + k * 0.35, 2.7, 2.4 + (k % 2) * 0.4] as V3,
		to: [0.15 + (k % 2) * 0.2, 1.35, 1.55] as V3,
	}));
	return React.createElement(
		React.Fragment,
		null,
		React.createElement(TV, {big: bigTV, on: f >= B.still || (bigTV && f >= B.five && !coworkerWorld), pop}),
		React.createElement(Car, {sport: sportCar}),
		coworkerWorld ? null : React.createElement(Boxes, {times: BOX_TIMES, frame: f}),
		React.createElement(Cash, {bills, frame: f}),
	);
};

export const raiseDirection: Direction = {
	camera,
	mood,
	focus: (f) => {
		if (f < B.oldCouch) return [0.3, 1.45, 1.35];
		if (f < B.car) return f > B.small - 20 ? [-2.85, 1.1, 1.9] : [SOFA_X, 1.4, 1.9];
		if (f < B.raise2 - 20) return f < B.moved ? [0.9, 1.1, 4.4] : [0.8, 1.6, 3.5];
		if (f < B.five) return [0.3, 1.5, 1.3];
		if (f < B.called) return f > B.zero - 20 ? [1.65, 1.42, 1.6] : [SOFA_X, 1.5, 1.9];
		if (f < B.coworker) return [1.6, 0.9, 1.9];
		return f < B.kept ? [0.4, 1.6, 1.45] : [SOFA_X, 1.5, 1.9];
	},
	blur: (f) => (f >= B.called && f < B.coworker ? 0.4 : 1),
	officer: you,
	civilian: coworker,
	cast: {officer: 'you', civilian: 'coworker'},
	sofa,
	set,
};

export const BEATS = B;
export {FACE_ROOM, ramp};
