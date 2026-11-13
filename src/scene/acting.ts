import {Easing, interpolate} from 'remotion';
import type {Pose} from './Stickman';
import {SHOT_B, SHOT_C, accent, talk} from './timeline';

type V3 = [number, number, number];

const io = Easing.inOut(Easing.cubic);
const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** Eased keyframe track. */
const smooth = (f: number, frames: number[], values: number[]) =>
	interpolate(f, frames, values, {...CLAMP, easing: io});
// Poses snap: most of the move happens in the first few frames, with a small
// overshoot before settling.
const snap = Easing.bezier(0.2, 1.4, 0.35, 1);
const key = (f: number, frames: number[], values: number[]) =>
	interpolate(f, frames, values, {...CLAMP, easing: snap});
// Anticipation: wind up the wrong way first, then go, then overshoot.
const windUp = Easing.bezier(0.5, -0.55, 0.3, 1.4);
const act = (f: number, frames: number[], values: number[]) =>
	interpolate(f, frames, values, {...CLAMP, easing: windUp});
/** Squash on the wind-up, stretch through the move, settle: for any 0..1 action track. */
const smear = (now: number, before: number) => Math.max(-0.1, Math.min(0.14, (now - before) * 0.9));
/** Eyes do not glide, they dart: a new small offset every ~0.7s. */
const dart = (f: number, seed: number) => {
	const x = Math.sin((Math.floor(f / 21) + seed) * 91.7) * 43758.5453;
	return (x - Math.floor(x) - 0.5) * 0.3;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const wave = (f: number, period: number, phase = 0) => Math.sin((f / period) * Math.PI * 2 + phase);
/** 1 at frame t, falling to 0 within `w` frames either side. */
const pulse = (f: number, t: number, w: number) => Math.max(0, 1 - Math.abs(f - t) / w);
const blink = (f: number, times: number[]) => Math.min(1, times.reduce((m, t) => Math.max(m, pulse(f, t, 3.5) * 1.6), 0));

// ---- staging ---------------------------------------------------------------
const OFFICER: V3 = [0.85, 0, 0.6];
const DOOR: V3 = [-1.3, 0, -3.5];
const MARK: V3 = [0.11, 0, -0.82];
const YAW_FRONT = 0.05;
const YAW_TO_DOOR = -2.66;

// ---- officer ---------------------------------------------------------------
export const officerPose = (f: number): Pose => {
	const breathe = wave(f, 75);
	const turnHead = key(f, [106, 124], [0, 1]);
	const turnBody = act(f, [112, 136], [0, 1]);
	const yaw = lerp(YAW_FRONT, YAW_TO_DOOR, turnBody);

	// A: sweeps the room, then hears the slurp and turns round
	const surveying = key(f, [0, 26, 52, 84, 104], [0.38, -0.42, -0.3, 0.12, 0.05]);
	const leanAt = (t: number) => act(t, [SHOT_C + 48, SHOT_C + 68], [0, 1]);
	const lean = leanAt(f); // C: leans in, unconvinced
	const leanLate = leanAt(f - 4); // the head arrives after the chest (overlap)
	const aside = key(f, [SHOT_C + 96, SHOT_C + 110], [0, 1]);
	const headYaw =
		lerp(surveying, 0, turnBody) +
		// the head leads the turn, but only as far as a neck allows
		Math.max(-0.75, Math.min(0.75, lerp(YAW_FRONT, YAW_TO_DOOR, turnHead) - yaw)) +
		(f >= SHOT_B ? wave(f, 120) * 0.05 : 0) +
		// side-on shot: cheat both faces toward the lens, as a 2D animator would
		(f >= SHOT_C ? 0.6 : 0) +
		aside * 0.45;

	// right hand leaves the hip to gesture at "who moved the furniture?"
	const gestureAt = (t: number) => act(t, [48, 60, 92, 106], [0, 1, 1, 0]);
	const gesture = gestureAt(f);
	const hit = accent(f, 'officer');
	const shift = wave(f, 170, 0.6); // slow weight shift from foot to foot
	const hipL: V3 = [0.2, 0.9, 0.03];
	const hipR: V3 = [-0.2, 0.9, 0.03];
	// the hand travels on an arc, not a straight line, and bounces on each word
	const out: V3 = [-0.5, 1.22 + hit * 0.05 + Math.sin(Math.min(1, Math.max(0, gesture)) * Math.PI) * 0.14, 0.3];

	// little shuffle of the feet while turning
	const stepL = Math.sin(key(f, [113, 124], [0, 1]) * Math.PI) * 0.09;
	const stepR = Math.sin(key(f, [125, 138], [0, 1]) * Math.PI) * 0.09;

	const speaking = talk(f, 'officer');
	const squint = lean * 0.22;
	return {
		pos: OFFICER,
		yaw,
		bob: breathe * 0.008 - lean * 0.02 - hit * 0.012,
		lean: [0.07 + lean * 0.2 + hit * 0.025, 0.05 - lean * 0.03 + shift * 0.035],
		twist: gesture * -0.12 + shift * 0.03,
		stretch: breathe * 0.012 + hit * 0.03 + smear(turnBody, act(f - 2, [112, 136], [0, 1])) + smear(lean, leanAt(f - 2)) * 0.6,
		headStretch: hit * 0.025 + smear(turnHead, key(f - 2, [106, 124], [0, 1])) * 0.5,
		headYaw,
		headPitch: -0.04 + leanLate * 0.1 + wave(f, 90, 1) * 0.015 + hit * 0.05,
		headRoll: 0.05 + wave(f, 110) * 0.02 + leanLate * 0.09 - shift * 0.03,
		headOffset: [shift * 0.012, breathe * 0.006 + hit * 0.014, leanLate * 0.1],
		handL: hipL,
		handR: lerp3(hipR, out, gestureAt(f - 1)),
		elbowL: [1, 0.1, -0.5],
		elbowR: [-1, lerp(0.1, -0.6, gesture), -0.5],
		footL: [0.13, 0.03 + stepL, 0.02],
		footR: [-0.13, 0.03 + stepR, -0.02],
		face: {
			blink: blink(f, [34, 120, 198, 262, 300, 360]),
			lid: 0.36 + squint,
			look: [dart(f, 3) * (1 - gesture) + key(f, [0, 26, 84], [0.5, -0.6, 0]) * (1 - turnBody) + aside * 0.9 - (f >= SHOT_C ? 0.5 * (1 - aside) : 0), 0],
			browL: [0.06 + hit * 0.05 + lean * 0.05, -0.12],
			browR: [-0.02 - lean * 0.03, 0.2 + lean * 0.2],
			mouth: [0.105 - speaking * 0.045, speaking * 0.05, -0.05 - lean * 0.06, 0],
		},
	};
};

// ---- civilian --------------------------------------------------------------
export const civilianPose = (f: number): Pose => {
	const sway = wave(f, 64);
	const walkP = smooth(f, [SHOT_C + 2, SHOT_C + 62], [0, 1]);
	const walking = smooth(f, [SHOT_C + 2, SHOT_C + 8, SHOT_C + 54, SHOT_C + 62], [0, 1, 1, 0]);
	const theta = walkP * Math.PI * 2 * 3.5;
	const arrived = key(f, [SHOT_C + 56, SHOT_C + 70], [0, 1]);

	const sip = key(f, [92, 100, 110, 118], [0, 1, 1, 0]); // the slurp that gives him away
	const shrugAt = (t: number) => act(t, [156, 168, 244, 258], [0, 1, 1, 0]);
	const shrug = shrugAt(f);
	const hit = accent(f, 'civilian');
	const jump = pulse(f, 121, 4); // startled hop: stretch up, squash on landing
	const land = pulse(f, 126, 3);
	const stepHit = walking * Math.pow(Math.abs(Math.cos(theta)), 6); // each footfall
	const caught = key(f, [118, 126], [0, 1]) * (1 - key(f, [150, 160], [0, 1]));
	const nervous = key(f, [SHOT_C + 70, SHOT_C + 84], [0, 1]);

	const hang: V3 = [0.25, 0.82, 0.03];
	const mugRest: V3 = [-0.17, 1.12, 0.22];
	const mugSip: V3 = [-0.06, 1.62, 0.3];
	// hands trail the shoulders by a couple of frames (overlapping action)
	const shrugLate = shrugAt(f - 2);
	let handL = lerp3(hang, [0.48, 1.28 + hit * 0.04, 0.16], shrugLate);
	let handR = lerp3(lerp3(mugRest, mugSip, sip), [-0.46, 1.26 + hit * 0.04, 0.2], shrugLate);
	// arms swing against the legs while walking
	handL = lerp3(handL, [0.25, 0.86, -0.2 * Math.sin(theta)], walking);
	handR = lerp3(handR, [-0.2, 1.1, 0.2 + 0.03 * Math.sin(theta)], walking);
	handL = lerp3(handL, [0.16, 1.5, -0.06], nervous); // scratches the back of his head

	const speaking = talk(f, 'civilian');
	return {
		pos: lerp3(DOOR, MARK, walkP),
		yaw: 0.483,
		bob: sway * 0.006 + walking * (Math.abs(Math.sin(theta)) * 0.035 - 0.02) + shrug * 0.03 - caught * 0.02 + jump * 0.07 - land * 0.03 - hit * 0.01,
		stretch: sway * 0.01 + jump * 0.13 - land * 0.1 + smear(shrug, shrugAt(f - 2)) - stepHit * 0.06 + hit * 0.03,
		headStretch: jump * 0.06 - land * 0.07 - stepHit * 0.03 + hit * 0.02,
		lean: [walking * 0.1 - arrived * 0.1 + sip * -0.06, sway * 0.025 + walking * Math.sin(theta) * 0.04],
		twist: walking * Math.sin(theta) * 0.12,
		headYaw: sway * 0.06 * (1 - walking) - (f >= SHOT_C ? 0.5 : 0) - nervous * 0.25,
		headPitch: -sip * 0.3 + shrug * 0.05 + nervous * 0.08,
		headRoll: shrug * -0.14 + sway * 0.03 + nervous * 0.1,
		headOffset: [0, shrug * -0.025 + caught * 0.03 + jump * 0.04 - stepHit * 0.02 + hit * 0.012, 0],
		handL,
		handR,
		elbowL: [1, lerp(-0.2, -0.9, shrug) + nervous * 1.2, -0.6],
		elbowR: [-1, lerp(-0.6, -0.9, shrug), -0.4],
		footL: [0.11, 0.03 + jump * 0.06 + walking * Math.max(0, Math.cos(theta)) * 0.14, walking * 0.27 * Math.sin(theta)],
		footR: [-0.11, 0.03 + jump * 0.06 + walking * Math.max(0, -Math.cos(theta)) * 0.14, -walking * 0.27 * Math.sin(theta)],
		face: {
			blink: blink(f, [22, 70, 129, 136, 215, 290, 352, 372]),
			lid: 0,
			look: [dart(f, 11) + (f >= SHOT_C ? 0.6 : 0) * (1 - nervous) - nervous * 0.8 + caught * 0.3, sip * 0.6],
			browL: [0.03 + caught * 0.07 + shrug * 0.05 + nervous * 0.04, -0.1 - shrug * 0.25],
			browR: [0.03 + caught * 0.07 + shrug * 0.05, -0.1 - shrug * 0.25 - nervous * 0.15],
			mouth: [0.075 + nervous * 0.05 - speaking * 0.03, speaking * 0.045 + caught * 0.025, 0.02 + nervous * 0.1 - shrug * 0.04, 0],
		},
	};
};

// ---- camera ----------------------------------------------------------------
export type Shot = {pos: V3; target: V3; fov: number; roll: number};

const shotAt = (f: number): Shot => {
	if (f < SHOT_B) {
		// low and close on the officer; slow push-in with a sideways drift
		const t = smooth(f, [0, SHOT_B], [0, 1]);
		return {pos: lerp3([1.3, 0.8, 3.15], [1.1, 0.88, 2.9], t), target: [0.58, 1.5, 0.6], fov: 64, roll: lerp(-0.07, -0.03, t)};
	}
	if (f < SHOT_C) {
		// reverse angle from the kitchen, over the civilian's shoulder
		const t = smooth(f, [SHOT_B, SHOT_C], [0, 1]);
		return {pos: lerp3([-1.4, 1.62, -5.95], [-1.6, 1.66, -5.8], t), target: [0.7, 1.2, 0.6], fov: 50, roll: 0.06};
	}
	// side-on two-shot, arcing round as they meet
	const t = smooth(f, [SHOT_C, 390], [0, 1]);
	return {pos: lerp3([-2.5, 1.2, 2.7], [-1.8, 1.3, 3.4], t), target: [0.55, 1.25, 0.0], fov: 56, roll: lerp(-0.06, -0.02, t)};
};

/** The camera never sits still: a slow handheld drift on top of every shot. */
export const cameraAt = (f: number): Shot => {
	const s = shotAt(f);
	const d = (p: number, ph: number) => Math.sin((f / p) * Math.PI * 2 + ph);
	return {
		...s,
		pos: [s.pos[0] + d(97, 0) * 0.02, s.pos[1] + d(71, 1.3) * 0.014, s.pos[2] + d(113, 2.1) * 0.02],
		roll: s.roll + d(131, 0.7) * 0.006,
	};
};
