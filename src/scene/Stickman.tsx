import React, {useEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {
	CatmullRomCurve3,
	ConeGeometry,
	CylinderGeometry,
	Euler,
	ExtrudeGeometry,
	LatheGeometry,
	MeshBasicMaterial,
	Matrix3,
	Matrix4,
	Quaternion,
	Shape,
	ShaderMaterial,
	SphereGeometry,
	TubeGeometry,
	Vector2,
	Vector3,
} from 'three';
import {Box, Ink, boxLineThin} from '../toon/Ink';
import {outline, toon} from '../toon/materials';
import {P} from '../toon/palette';
import {keepAway, pushOut} from './colliders';
import {Headwear, HeldProp, Shades, makeWear} from './Accessories2D';
import {Held, specOf} from './cast';
import {CHAR, HEAD_R} from './charStyle';
import {globals} from '../toon/materials';

type V3 = [number, number, number];

export type Face = {
	blink: number;
	/** Heavy upper lid: 0 wide open, ~0.4 unimpressed, ~0.6 squint. */
	lid: number;
	look: [number, number];
	/** [height, angle] per brow; positive angle = angry slant. */
	browL: [number, number];
	browR: [number, number];
	/** [half width, open, curve (+smile / -frown), y offset] */
	mouth: [number, number, number, number];
};

/**
 * Everything is in the character's own space: +Z is where the chest points,
 * +X is the character's left, feet on y = 0. Head, body and each limb are
 * posed independently.
 */
export type Pose = {
	pos: V3;
	yaw: number;
	bob: number;
	/** Torso lean [forward, sideways] and twist, pivoting at the hips. */
	lean: [number, number];
	twist: number;
	headYaw: number;
	headPitch: number;
	headRoll: number;
	headOffset: V3;
	/** Squash (-) and stretch (+) of the torso and head; volume is preserved. */
	stretch: number;
	headStretch: number;
	handL: V3;
	handR: V3;
	/** Direction the elbows point. */
	elbowL: V3;
	elbowR: V3;
	footL: V3;
	footR: V3;
	face: Face;
	/** Sitting on furniture: the hips may rest on it instead of being pushed clear. */
	seated?: boolean;
	/** What is in the right hand; null for nothing, undefined for the cast default. */
	held?: Held | null;
	/** Sunglasses on. */
	shades?: boolean;
};

// ---- proportions -----------------------------------------------------------
export const HIP_Y = 0.74;
export const BODY_H = 0.82;
export {CHAR, HEAD_R} from './charStyle';
export const LIMB_R = 0.03;
export const ARM = 0.37;
export const LEG = 0.385;

// ---- geometry (shared by all characters) -----------------------------------
export const bodyGeo = (() => {
	const rb = 0.205;
	const rt = 0.165;
	const pts: Vector2[] = [];
	for (let i = 0; i <= 12; i++) {
		const a = (-Math.PI / 2) * (1 - i / 12);
		pts.push(new Vector2(Math.max(rb * Math.cos(a), 1e-4), rb + rb * Math.sin(a)));
	}
	for (let i = 0; i <= 12; i++) {
		const a = (Math.PI / 2) * (i / 12);
		pts.push(new Vector2(Math.max(rt * Math.cos(a), 1e-4), BODY_H - rt + rt * Math.sin(a)));
	}
	return new LatheGeometry(pts, 40);
})();
export const headGeo = new SphereGeometry(HEAD_R, 48, 32);
const jointGeo = new SphereGeometry(LIMB_R, 12, 8);

const beltGeo = new CylinderGeometry(0.207, 0.21, 0.075, 40, 1, true);
export const starGeo = (() => {
	const s = new Shape();
	for (let i = 0; i < 10; i++) {
		const r = i % 2 === 0 ? 1 : 0.42;
		const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
		if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
		else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	s.closePath();
	const g = new ExtrudeGeometry(s, {depth: 0.25, bevelEnabled: false});
	g.translate(0, 0, -0.125);
	return g;
})();

// ---- materials -------------------------------------------------------------

// The whole head (and what it wears) is drawn in front of the torso, so the
// head keeps a complete outline where it overlaps the body.
// The amount is worked out every frame from where the torso actually is.
const BIAS: Record<string, {value: number}> = {officer: {value: 0.24}, civilian: {value: 0.24}};
const biasOf = (k: string) => (BIAS[k] ??= {value: 0.24});
// Flat accessories sit in front of the round head: pulled a head's radius further.
const WEAR_BIAS: Record<string, {value: number}> = {};
const HELD_BIAS = {value: 0.1};
const wears: Record<string, ReturnType<typeof makeWear>> = {};
const wearOf = (k: string) => (wears[k] ??= makeWear((WEAR_BIAS[k] ??= {value: 0.6}), specOf(k)));
const held = makeWear(HELD_BIAS);

export const limbMat = toon({figure: true, ramp: P.limb, flat: 0.9, grad: 0.2, band: 0.62, soft: 0.2, deep: 0.5, rim: 0.28, rimWidth: 0.3, fog: 0.4});
const starMat = toon({ramp: P.gold, flat: 0.85, grad: 0.25, band: 0.5, soft: 0.2, deep: 0.3, radius: 0.1, fog: 0.2});
const inkMat = toon({ramp: P.limb, flat: 1, grad: 0, deep: 0, fog: 0.4});
const charLine = outline({width: 0.021, thin: 0.5, thick: 1.6, seed: 1.3});
const headLines: Record<string, ReturnType<typeof outline>> = {};
const headLineOf = (k: string) => (headLines[k] ??= outline({width: 0.021, thin: 0.5, thick: 1.6, seed: 1.3, depthBiasRef: biasOf(k)}));

const makeHeadMat = (variant: Variant) =>
	toon({ramp: P.skin, ...CHAR, depthBiasRef: biasOf(variant), bounce: 0.8, band: 0.44, soft: 0.2, deep: 0.5, rim: 0.9, rimWidth: 0.2, cel: 0.8, celAt: 0.05, celSoft: 0.4, radius: HEAD_R, pattern: 'face'});
const makeBodyMat = (variant: Variant) =>
	toon({
		ramp: specOf(variant).body,
		...CHAR,
		grad: 0.42,
		band: 0.56,
		rim: 0.85,
		rimWidth: 0.3,
		ground: 0.3,
		edge: 0.8,
		bounce: 0.75,
		cel: 0.9,
		celAt: 0.15,
		spec: 1,
		stripe: {y: [0.3, 0.74]},
		yRange: [0, BODY_H * 0.7],
		pivot: [0, BODY_H / 2, 0],
		radius: BODY_H / 2,
		pattern: specOf(variant).uniform ? 'uniform' : 'none',
	});

// ---- limbs -----------------------------------------------------------------
export const v = (a: V3) => new Vector3(a[0], a[1], a[2]);

/** Two-bone IK: returns shoulder, elbow, hand. */
export const solve = (root: Vector3, target: Vector3, len: number, pole: Vector3) => {
	const d = target.clone().sub(root);
	const dist = Math.min(Math.max(d.length(), 1e-4), len * 2 * 0.999);
	d.normalize();
	const side = pole.clone().addScaledVector(d, -pole.dot(d));
	if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
	side.normalize();
	const bend = Math.sqrt(Math.max(len * len - (dist * dist) / 4, 0));
	const mid = root.clone().addScaledVector(d, dist / 2).addScaledVector(side, bend);
	return [root, mid, root.clone().addScaledVector(d, dist)];
};

export const Limb: React.FC<{pts: Vector3[]; ghost?: MeshBasicMaterial}> = ({pts, ghost}) => {
	const key = pts.map((p) => p.toArray().map((n) => n.toFixed(4)).join()).join('|');
	const geo = useMemo(
		// a soft curve through the joint, so limbs read as one drawn stroke
		() => new TubeGeometry(new CatmullRomCurve3(pts, false, 'catmullrom', 0.6), 18, LIMB_R, 8),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[key],
	);
	useEffect(() => () => geo.dispose(), [geo]);
	if (ghost) return <mesh geometry={geo} material={ghost} />;
	return (
		<>
			<mesh geometry={geo} material={limbMat} castShadow />
			<mesh geometry={jointGeo} material={limbMat} position={pts[0]} />
			<mesh geometry={jointGeo} material={limbMat} position={pts[2]} castShadow />
		</>
	);
};

// Smear frames: when a hand moves fast, the arm's last two positions linger
// as fading strokes, like the drawn motion smears in the reference.
export const smears = [0.5, 0.22].map(
	(opacity) => new MeshBasicMaterial({color: P.line, transparent: true, opacity, depthWrite: false}),
);
export const SMEAR_SPEED = 0.07; // metres per frame

export const armsOf = (pose: Pose) => {
	const q = new Quaternion().setFromEuler(new Euler(pose.lean[0], pose.twist, -pose.lean[1], 'YXZ'));
	const at = (x: number) => new Vector3(x, 0.63, 0).applyQuaternion(q).add(new Vector3(0, HIP_Y + pose.bob, 0));
	return [solve(at(0.135), v(pose.handL), ARM, v(pose.elbowL)), solve(at(-0.135), v(pose.handR), ARM, v(pose.elbowR))];
};

// ---- character -------------------------------------------------------------
/** A key into the cast (see cast.ts). */
export type Variant = string;

const Star: React.FC<{position: V3; rotation?: V3; size: number}> = ({position, rotation, size}) => (
	<group position={position} rotation={rotation}>
		<mesh geometry={starGeo} material={starMat} scale={[size, size, size * 0.3]} />
		<mesh geometry={starGeo} material={inkMat} scale={[size * 1.32, size * 1.32, size * 0.2]} position={[0, 0, -size * 0.03]} />
	</group>
);

export const Stickman: React.FC<{variant: Variant; pose: Pose; trail?: Pose[]}> = ({variant, pose, trail = []}) => {
	const camera = useThree((s) => s.camera);
	const headMat = useMemo(() => makeHeadMat(variant), [variant]);
	const headLine = headLineOf(variant);
	const spec = specOf(variant);
	const bodyMat = useMemo(() => makeBodyMat(variant), [variant]);

	const {hip, bodyQ, onBody, headPos, armL, armR, legL, legR, sx, sy, hx, hy} = rigOf(pose);
	const bodyEuler = new Euler().setFromQuaternion(bodyQ);
	const headQ = new Quaternion().setFromEuler(new Euler(pose.headPitch, pose.headYaw, pose.headRoll, 'YXZ'));

	// the face is ink in the head shader, so expressions are just uniforms
	const u = (headMat as ShaderMaterial).uniforms;
	const f = pose.face;
	u.uEyes.value.set(f.blink, f.blink, f.lid, spec.glasses && !pose.shades ? 1 : 0);
	u.uLook.value.set(f.look[0], f.look[1]);
	u.uBrow.value.set(f.browL[0], f.browL[1], f.browR[0], f.browR[1]);
	u.uMouth.value.set(...f.mouth);

	// Where is the camera, as seen from inside the head? Swing the drawn face
	// part of the way toward it, and drop it once we are looking at the back.
	const toCam = camera.position
		.clone()
		.sub(v(pose.pos))
		.applyAxisAngle(new Vector3(0, 1, 0), -pose.yaw)
		.sub(headPos)
		.applyQuaternion(headQ.clone().invert())
		.normalize();
	const off = Math.acos(Math.min(1, Math.max(-1, toCam.z)));
	const cheat = Math.min(off * 0.55, 0.8);
	const axis = new Vector3(-toCam.y, toCam.x, 0);
	if (axis.lengthSq() < 1e-8) axis.set(0, 1, 0);
	(u.uFaceRot.value as Matrix3).setFromMatrix4(new Matrix4().makeRotationAxis(axis.normalize(), -cheat));
	u.uFaceFade.value = 1 - Math.min(1, Math.max(0, (off - 1.95) / 0.3));

	// Head line art always on top of its own torso: find how much nearer to the
	// camera the top of the torso gets than the head, and pull the head that far.
	const depth = (p: Vector3) =>
		-p.clone().applyAxisAngle(new Vector3(0, 1, 0), pose.yaw).add(v(pose.pos)).applyMatrix4(camera.matrixWorldInverse).z;
	let nearest = Infinity;
	for (const y of [0.3, 0.45, 0.6, 0.72, BODY_H]) nearest = Math.min(nearest, depth(onBody(0, y, 0)) - 0.24);
	biasOf(variant).value = Math.max(0.1, depth(headPos) - nearest + 0.06);

	// Follow-through: the hat and hair are loose on the head, so they lag
	// behind when it turns or drops and settle a beat later.
	const past = trail[1] ?? pose;
	const clampTo = (n: number, m: number) => Math.max(-m, Math.min(m, n));
	const dragZ = clampTo((pose.yaw + pose.headYaw - past.yaw - past.headYaw) * 0.55 + (pose.headRoll - past.headRoll) * 1.5, 0.3);
	const dragX = clampTo((pose.bob + pose.headOffset[1] - past.bob - past.headOffset[1]) * 5 - (pose.headPitch - past.headPitch) * 1.5, 0.3);

	// The plane that worn and held things are drawn on: it faces the camera.
	const headWorld = headPos.clone().applyAxisAngle(new Vector3(0, 1, 0), pose.yaw).add(v(pose.pos));
	const seen = camera.position.clone().sub(headWorld);
	const planeQ = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(seen, new Vector3(), new Vector3(0, 1, 0)));
	const planeLocal = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -pose.yaw).multiply(planeQ);
	const view = Math.atan2(seen.x, seen.z) - pose.yaw - pose.headYaw;
	const facing = Math.cos(view);
	const sideways = -Math.sin(view);
	const l3 = globals.uLightDirW.value.clone().applyQuaternion(planeQ.clone().invert());
	const ll = Math.hypot(l3.x, l3.y) || 1;
	const light: [number, number] = [l3.x / ll, l3.y / ll];
	wearOf(variant);
	WEAR_BIAS[variant].value = biasOf(variant).value + HEAD_R + 0.08;
	const holding: Held | null = pose.held === undefined ? (spec.held ?? null) : pose.held;

	return (
		<group position={pose.pos} rotation={[0, pose.yaw, 0]}>
			<Limb pts={legL} />
			<Limb pts={legR} />
			<Limb pts={armL} />
			<Limb pts={armR} />
			{trail.map((past, k) =>
				armsOf(past).map((pts, side) => {
					const now = side === 0 ? armL : armR;
					const before = armsOf(trail[0])[side];
					return now[2].distanceTo(before[2]) > SMEAR_SPEED ? <Limb key={`${k}-${side}`} pts={pts} ghost={smears[k]} /> : null;
				}),
			)}

			<group position={hip} rotation={bodyEuler} scale={[sx, sy, sx]}>
				<Ink geometry={bodyGeo} material={bodyMat} line={charLine} receive />
				{spec.uniform ? (
					<>
						<mesh geometry={beltGeo} material={inkMat} position={[0, 0.2, 0]} />
						<Box size={[0.07, 0.06, 0.03]} position={[0, 0.2, 0.205]} material={starMat} line={boxLineThin} />
						<Star position={[0.1, 0.63, 0.142]} rotation={[-0.12, 0.6, 0]} size={0.05} />
					</>
				) : null}
			</group>

			<group position={headPos} quaternion={headQ} scale={[hx, hy, hx]}>
				<Ink geometry={headGeo} material={headMat} line={headLine} />
			</group>

			{/* worn and held things are flat drawings on a plane that faces the camera */}
			<group position={headPos} quaternion={planeLocal}>
				<group rotation={[0, 0, pose.headRoll * facing]} scale={[hx, hy, 1]}>
					<Headwear spec={spec} wear={wearOf(variant)} facing={facing} sideways={sideways} drag={dragZ} light={light} />
					{pose.shades && facing > -0.3 ? <Shades wear={wearOf(variant)} facing={facing} sideways={sideways} light={light} /> : null}
				</group>
			</group>
			{holding ? (
				<group position={armR[2]} quaternion={planeLocal}>
					<HeldProp kind={holding} wear={held} light={light} />
				</group>
			) : null}
		</group>
	);
};

/**
 * The skeleton for a pose, in character space. Shared by the 3D and 2D
 * renderers. Nothing is allowed to pass through anything: hands and elbows are
 * kept outside the character's own torso and head, and every joint is kept out
 * of the furniture and walls.
 */
export const rigOf = (pose: Pose) => {
	const bodyQ = new Quaternion().setFromEuler(new Euler(pose.lean[0], pose.twist, -pose.lean[1], 'YXZ'));
	const hip = new Vector3(0, HIP_Y + pose.bob, 0);
	const sy = 1 + pose.stretch;
	const sx = 1 / Math.sqrt(sy);
	const hy = 1 + pose.headStretch;
	const hx = 1 / Math.sqrt(hy);
	const onBody = (x: number, y: number, z: number) => new Vector3(x * sx, y * sy, z * sx).applyQuaternion(bodyQ).add(hip);
	const top = onBody(0, BODY_H, 0);

	// character space <-> the room
	const up = new Vector3(0, 1, 0);
	const origin = v(pose.pos);
	const toRoom = (p: Vector3) => p.clone().applyAxisAngle(up, pose.yaw).add(origin);
	const toSelf = (p: Vector3) => p.clone().sub(origin).applyAxisAngle(up, -pose.yaw);
	const clearOfSet = (p: Vector3, r: number) => toSelf(pushOut(toRoom(p), r));

	const headPos = clearOfSet(top.clone().add(new Vector3(0, 0.2, 0)).add(v(pose.headOffset)), HEAD_R + 0.03);

	// a point kept outside this character's own torso (a capsule) and head (a ball)
	const axis = top.clone().sub(hip);
	const clearOfSelf = (p: Vector3, r: number) => {
		const t = Math.min(1, Math.max(0, p.clone().sub(hip).dot(axis) / axis.lengthSq()));
		const onAxis = hip.clone().addScaledVector(axis, t);
		return keepAway(keepAway(p, onAxis, 0.205 * sx + r), headPos, HEAD_R * hx + r);
	};
	const arm = (shoulder: Vector3, hand: V3, pole: V3) => {
		const target = clearOfSet(clearOfSelf(v(hand), LIMB_R + 0.01), LIMB_R);
		const pts = solve(shoulder, target, ARM, v(pole));
		pts[1] = clearOfSet(clearOfSelf(pts[1], LIMB_R), LIMB_R);
		return pts;
	};
	const fwd = new Vector3(0, 0.15, 1);
	const leg = (hipJoint: Vector3, foot: V3) => {
		const pts = solve(hipJoint, clearOfSet(v(foot), LIMB_R), LEG, fwd);
		pts[1] = clearOfSet(pts[1], LIMB_R + 0.01);
		return pts;
	};
	return {
		hip,
		bodyQ,
		onBody,
		top,
		headPos,
		armL: arm(onBody(0.135, 0.63, 0), pose.handL, pose.elbowL),
		armR: arm(onBody(-0.135, 0.63, 0), pose.handR, pose.elbowR),
		legL: leg(onBody(0.085, 0.05, 0), pose.footL),
		legR: leg(onBody(-0.085, 0.05, 0), pose.footR),
		sx,
		sy,
		hx,
		hy,
	};
};
