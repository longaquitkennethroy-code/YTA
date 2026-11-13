import {Easing, interpolate} from 'remotion';
import type {Pose} from './Stickman';
import {SHOT_B, SHOT_C, talk} from './timeline';

type V3 = [number, number, number];

const io = Easing.inOut(Easing.cubic);
const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** Eased keyframe track. */
const key = (f: number, frames: number[], values: number[]) =>
	interpolate(f, frames, values, {...CLAMP, easing: io});
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
	const turnBody = key(f, [113, 138], [0, 1]);
	const yaw = lerp(YAW_FRONT, YAW_TO_DOOR, turnBody);

	// A: sweeps the room, then hears the slurp and turns round
	const surveying = key(f, [0, 26, 52, 84, 104], [0.38, -0.42, -0.3, 0.12, 0.05]);
	const lean = key(f, [SHOT_C + 48, SHOT_C + 72], [0, 1]); // C: leans in, unconvinced
	const aside = key(f, [SHOT_C + 96, SHOT_C + 110], [0, 1]);
	const headYaw =
		lerp(surveying, 0, turnBody) +
		(lerp(YAW_FRONT, YAW_TO_DOOR, turnHead) - yaw) +
		(f >= SHOT_B ? wave(f, 120) * 0.05 : 0) +
		// side-on shot: cheat both faces toward the lens, as a 2D animator would
		(f >= SHOT_C ? 0.6 : 0) +
		aside * 0.45;

	// right hand leaves the hip to gesture at "who moved the furniture?"
	const gesture = key(f, [50, 62, 92, 106], [0, 1, 1, 0]);
	const hipL: V3 = [0.2, 0.9, 0.03];
	const hipR: V3 = [-0.2, 0.9, 0.03];
	const out: V3 = [-0.5, 1.22 + wave(f, 14) * 0.02, 0.3];

	// little shuffle of the feet while turning
	const stepL = Math.sin(key(f, [113, 124], [0, 1]) * Math.PI) * 0.09;
	const stepR = Math.sin(key(f, [125, 138], [0, 1]) * Math.PI) * 0.09;

	const speaking = talk(f, 'officer');
	const squint = lean * 0.22;
	return {
		pos: OFFICER,
		yaw,
		bob: breathe * 0.008 - lean * 0.02,
		lean: [0.07 + lean * 0.2, 0.05 - lean * 0.03],
		twist: 0,
		headYaw,
		headPitch: -0.04 + lean * 0.1 + wave(f, 90, 1) * 0.015,
		headRoll: 0.05 + wave(f, 110) * 0.02 + lean * 0.09,
		headOffset: [0, breathe * 0.006, lean * 0.1],
		handL: hipL,
		handR: lerp3(hipR, out, gesture),
		elbowL: [1, 0.1, -0.5],
		elbowR: [-1, lerp(0.1, -0.6, gesture), -0.5],
		footL: [0.13, 0.03 + stepL, 0.02],
		footR: [-0.13, 0.03 + stepR, -0.02],
		face: {
			blink: blink(f, [34, 120, 198, 262, 300, 360]),
			lid: 0.36 + squint,
			look: [key(f, [0, 26, 84], [0.5, -0.6, 0]) * (1 - turnBody) + aside * 0.9 - (f >= SHOT_C ? 0.5 * (1 - aside) : 0), 0],
			browL: [0.06 + speaking * 0.015 + lean * 0.05, -0.12],
			browR: [-0.02 - lean * 0.03, 0.2 + lean * 0.2],
			mouth: [0.105, speaking * 0.045, -0.05 - lean * 0.06, 0],
		},
	};
};

// ---- civilian --------------------------------------------------------------
export const civilianPose = (f: number): Pose => {
	const sway = wave(f, 64);
	const walkP = key(f, [SHOT_C + 2, SHOT_C + 62], [0, 1]);
	const walking = key(f, [SHOT_C + 2, SHOT_C + 8, SHOT_C + 54, SHOT_C + 62], [0, 1, 1, 0]);
	const theta = walkP * Math.PI * 2 * 3.5;
	const arrived = key(f, [SHOT_C + 56, SHOT_C + 70], [0, 1]);

	const sip = key(f, [92, 100, 110, 118], [0, 1, 1, 0]); // the slurp that gives him away
	const shrug = key(f, [158, 170, 244, 258], [0, 1, 1, 0]);
	const caught = key(f, [118, 126], [0, 1]) * (1 - key(f, [150, 160], [0, 1]));
	const nervous = key(f, [SHOT_C + 70, SHOT_C + 84], [0, 1]);

	const hang: V3 = [0.25, 0.82, 0.03];
	const mugRest: V3 = [-0.17, 1.12, 0.22];
	const mugSip: V3 = [-0.06, 1.62, 0.3];
	let handL = lerp3(hang, [0.48, 1.28, 0.16], shrug);
	let handR = lerp3(lerp3(mugRest, mugSip, sip), [-0.46, 1.26, 0.2], shrug);
	// arms swing against the legs while walking
	handL = lerp3(handL, [0.25, 0.86, -0.2 * Math.sin(theta)], walking);
	handR = lerp3(handR, [-0.2, 1.1, 0.2 + 0.03 * Math.sin(theta)], walking);
	handL = lerp3(handL, [0.16, 1.5, -0.06], nervous); // scratches the back of his head

	const speaking = talk(f, 'civilian');
	return {
		pos: lerp3(DOOR, MARK, walkP),
		yaw: 0.483,
		bob: sway * 0.006 + walking * (Math.abs(Math.sin(theta)) * 0.035 - 0.02) + shrug * 0.03 - caught * 0.02,
		lean: [walking * 0.1 - arrived * 0.1 + sip * -0.06, sway * 0.025 + walking * Math.sin(theta) * 0.04],
		twist: walking * Math.sin(theta) * 0.12,
		headYaw: sway * 0.06 * (1 - walking) - (f >= SHOT_C ? 0.5 : 0) - nervous * 0.25,
		headPitch: -sip * 0.3 + shrug * 0.05 + nervous * 0.08,
		headRoll: shrug * -0.14 + sway * 0.03 + nervous * 0.1,
		headOffset: [0, shrug * -0.025 + caught * 0.03, 0],
		handL,
		handR,
		elbowL: [1, lerp(-0.2, -0.9, shrug) + nervous * 1.2, -0.6],
		elbowR: [-1, lerp(-0.6, -0.9, shrug), -0.4],
		footL: [0.11, 0.03 + walking * Math.max(0, Math.cos(theta)) * 0.14, walking * 0.27 * Math.sin(theta)],
		footR: [-0.11, 0.03 + walking * Math.max(0, -Math.cos(theta)) * 0.14, -walking * 0.27 * Math.sin(theta)],
		face: {
			blink: blink(f, [22, 70, 129, 136, 215, 290, 352, 372]),
			lid: 0,
			look: [(f >= SHOT_C ? 0.6 : 0) * (1 - nervous) - nervous * 0.8 + caught * 0.3, sip * 0.6],
			browL: [0.03 + caught * 0.07 + shrug * 0.05 + nervous * 0.04, -0.1 - shrug * 0.25],
			browR: [0.03 + caught * 0.07 + shrug * 0.05, -0.1 - shrug * 0.25 - nervous * 0.15],
			mouth: [0.075 + nervous * 0.05, speaking * 0.04 + caught * 0.025, 0.02 + nervous * 0.1 - shrug * 0.04, 0],
		},
	};
};

// ---- camera ----------------------------------------------------------------
export type Shot = {pos: V3; target: V3; fov: number; roll: number};

export const cameraAt = (f: number): Shot => {
	if (f < SHOT_B) {
		// low and close on the officer; slow push-in with a sideways drift
		const t = key(f, [0, SHOT_B], [0, 1]);
		return {pos: lerp3([1.3, 0.8, 3.15], [1.1, 0.88, 2.9], t), target: [0.58, 1.5, 0.6], fov: 64, roll: lerp(-0.07, -0.03, t)};
	}
	if (f < SHOT_C) {
		// reverse angle from the kitchen, over the civilian's shoulder
		const t = key(f, [SHOT_B, SHOT_C], [0, 1]);
		return {pos: lerp3([-1.4, 1.62, -5.95], [-1.6, 1.66, -5.8], t), target: [0.7, 1.2, 0.6], fov: 50, roll: 0.06};
	}
	// side-on two-shot, arcing round as they meet
	const t = key(f, [SHOT_C, 390], [0, 1]);
	return {pos: lerp3([-2.5, 1.2, 2.7], [-1.8, 1.3, 3.4], t), target: [0.55, 1.25, 0.0], fov: 56, roll: lerp(-0.06, -0.02, t)};
};
