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
	handL: V3;
	handR: V3;
	/** Direction the elbows point. */
	elbowL: V3;
	elbowR: V3;
	footL: V3;
	footR: V3;
	face: Face;
};

// ---- proportions -----------------------------------------------------------
const HIP_Y = 0.74;
const BODY_H = 0.82;
const HEAD_R = 0.34;
const LIMB_R = 0.03;
const ARM = 0.37;
const LEG = 0.385;

// ---- geometry (shared by all characters) -----------------------------------
const bodyGeo = (() => {
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
const headGeo = new SphereGeometry(HEAD_R, 48, 32);
const jointGeo = new SphereGeometry(LIMB_R, 12, 8);
const unitSphere = new SphereGeometry(1, 32, 20);

const crownGeo = new LatheGeometry(
	[
		[0.262, 0],
		[0.268, 0.07],
		[0.3, 0.13],
		[0.36, 0.2],
		[0.375, 0.235],
		[0.35, 0.265],
		[0.22, 0.285],
		[0.0001, 0.29],
	].map(([x, y]) => new Vector2(x, y)),
	40,
);
const bandGeo = new CylinderGeometry(0.274, 0.268, 0.07, 40, 1, true);
const beltGeo = new CylinderGeometry(0.207, 0.21, 0.075, 40, 1, true);
const starGeo = (() => {
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
const hairGeo = new SphereGeometry(HEAD_R * 1.05, 40, 16, 0, Math.PI * 2, 0, 1.05);
const tuftGeo = new ConeGeometry(0.07, 0.24, 16, 1, true);
const mugGeo = new CylinderGeometry(0.055, 0.05, 0.11, 20);

// ---- materials -------------------------------------------------------------
// flat ~0.8: the lighting normal is 80% "a sheet of paper facing the camera".
const CHAR = {flat: 0.8, grad: 0.3, band: 0.5, soft: 0.16, deep: 0.85, fog: 0.25};

// The whole head (and what it wears) is drawn in front of the torso, so the
// head keeps a complete outline where it overlaps the body.
const HEAD = {depthBias: 0.24};

const limbMat = toon({ramp: P.limb, flat: 0.9, grad: 0.2, band: 0.62, soft: 0.2, deep: 0.5, rim: 0.28, rimWidth: 0.3, fog: 0.4});
const starMat = toon({ramp: P.gold, flat: 0.85, grad: 0.25, band: 0.5, soft: 0.2, deep: 0.3, radius: 0.1, fog: 0.2});
const inkMat = toon({ramp: P.limb, flat: 1, grad: 0, deep: 0, fog: 0.4});
const starMatHead = toon({ramp: P.gold, flat: 0.85, grad: 0.25, band: 0.5, soft: 0.2, deep: 0.3, radius: 0.1, fog: 0.2, ...HEAD});
const inkMatHead = toon({ramp: P.limb, flat: 1, grad: 0, deep: 0, fog: 0.4, ...HEAD});
const visorMat = toon({ramp: P.visor, ...CHAR, ...HEAD, spec: 1, shine: 50, rim: 0.7, rimWidth: 0.55, radius: 0.3});
const bandMat = toon({ramp: P.uniformDark, ...CHAR, ...HEAD, radius: 0.3});
const mugMat = toon({ramp: P.mug, ...CHAR, cel: 0.8, spec: 0.8, shine: 20, radius: 0.08});
const charLine = outline({width: 0.021, thin: 0.5, thick: 1.6, seed: 1.3});
const propLine = outline({width: 0.012, thin: 0.5, thick: 1.5, seed: 4.1});
const headLine = outline({width: 0.021, thin: 0.5, thick: 1.6, seed: 1.3, ...HEAD});
const headPropLine = outline({width: 0.012, thin: 0.5, thick: 1.5, seed: 4.1, ...HEAD});

const makeHeadMat = () =>
	toon({ramp: P.skin, ...CHAR, ...HEAD, band: 0.44, soft: 0.2, deep: 0.5, rim: 0.9, rimWidth: 0.2, cel: 0.9, celAt: 0.05, radius: HEAD_R, pattern: 'face'});
const makeBodyMat = (variant: Variant) =>
	toon({
		ramp: variant === 'officer' ? P.uniform : P.shirt,
		...CHAR,
		grad: 0.42,
		band: 0.56,
		rim: 0.85,
		rimWidth: 0.3,
		ground: 0.3,
		edge: 0.8,
		cel: 0.9,
		celAt: 0.15,
		spec: 1,
		shine: 60,
		yRange: [0, BODY_H * 0.7],
		pivot: [0, BODY_H / 2, 0],
		radius: BODY_H / 2,
		pattern: variant === 'officer' ? 'uniform' : 'none',
	});
const hatMat = toon({ramp: P.uniform, ...CHAR, ...HEAD, edge: 0.5, cel: 0.9, celAt: 0.15, spec: 1, shine: 22, rim: 0.8, rimWidth: 0.35, pivot: [0, 0.15, 0], radius: 0.36});
const hairMat = toon({ramp: P.hair, ...CHAR, ...HEAD, cel: 0.85, celAt: 0.15, spec: 0.7, shine: 18, rim: 0.6, rimWidth: 0.35, radius: 0.36});

// ---- limbs -----------------------------------------------------------------
const v = (a: V3) => new Vector3(a[0], a[1], a[2]);

/** Two-bone IK: returns shoulder, elbow, hand. */
const solve = (root: Vector3, target: Vector3, len: number, pole: Vector3) => {
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

const Limb: React.FC<{pts: Vector3[]; ghost?: MeshBasicMaterial}> = ({pts, ghost}) => {
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
const smears = [0.5, 0.22].map(
	(opacity) => new MeshBasicMaterial({color: P.line, transparent: true, opacity, depthWrite: false}),
);
const SMEAR_SPEED = 0.07; // metres per frame

const armsOf = (pose: Pose) => {
	const q = new Quaternion().setFromEuler(new Euler(pose.lean[0], pose.twist, -pose.lean[1], 'YXZ'));
	const at = (x: number) => new Vector3(x, 0.63, 0).applyQuaternion(q).add(new Vector3(0, HIP_Y + pose.bob, 0));
	return [solve(at(0.135), v(pose.handL), ARM, v(pose.elbowL)), solve(at(-0.135), v(pose.handR), ARM, v(pose.elbowR))];
};

// ---- character -------------------------------------------------------------
export type Variant = 'officer' | 'civilian';

const Star: React.FC<{position: V3; rotation?: V3; size: number; head?: boolean}> = ({position, rotation, size, head}) => (
	<group position={position} rotation={rotation}>
		<mesh geometry={starGeo} material={head ? starMatHead : starMat} scale={[size, size, size * 0.3]} />
		<mesh geometry={starGeo} material={head ? inkMatHead : inkMat} scale={[size * 1.32, size * 1.32, size * 0.2]} position={[0, 0, -size * 0.03]} />
	</group>
);

export const Stickman: React.FC<{variant: Variant; pose: Pose; trail?: Pose[]}> = ({variant, pose, trail = []}) => {
	const camera = useThree((s) => s.camera);
	const headMat = useMemo(makeHeadMat, []);
	const bodyMat = useMemo(() => makeBodyMat(variant), [variant]);

	const bodyQ = new Quaternion().setFromEuler(new Euler(pose.lean[0], pose.twist, -pose.lean[1], 'YXZ'));
	const hip = new Vector3(0, HIP_Y + pose.bob, 0);
	const onBody = (x: number, y: number, z: number) => new Vector3(x, y, z).applyQuaternion(bodyQ).add(hip);
	const bodyEuler = new Euler().setFromQuaternion(bodyQ);

	const headPos = onBody(0, BODY_H, 0).add(new Vector3(0, 0.2, 0)).add(v(pose.headOffset));
	const headQ = new Quaternion().setFromEuler(new Euler(pose.headPitch, pose.headYaw, pose.headRoll, 'YXZ'));

	const armL = solve(onBody(0.135, 0.63, 0), v(pose.handL), ARM, v(pose.elbowL));
	const armR = solve(onBody(-0.135, 0.63, 0), v(pose.handR), ARM, v(pose.elbowR));
	const fwd = new Vector3(0, 0.15, 1);
	const legL = solve(onBody(0.085, 0.05, 0), v(pose.footL), LEG, fwd);
	const legR = solve(onBody(-0.085, 0.05, 0), v(pose.footR), LEG, fwd);

	// the face is ink in the head shader, so expressions are just uniforms
	const u = (headMat as ShaderMaterial).uniforms;
	const f = pose.face;
	u.uEyes.value.set(f.blink, f.blink, f.lid, variant === 'civilian' ? 1 : 0);
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

			<group position={hip} rotation={bodyEuler}>
				<Ink geometry={bodyGeo} material={bodyMat} line={charLine} receive />
				{variant === 'officer' ? (
					<>
						<mesh geometry={beltGeo} material={inkMat} position={[0, 0.2, 0]} />
						<Box size={[0.07, 0.06, 0.03]} position={[0, 0.2, 0.205]} material={starMat} line={boxLineThin} />
						<Star position={[0.1, 0.63, 0.142]} rotation={[-0.12, 0.6, 0]} size={0.05} />
					</>
				) : null}
			</group>

			<group position={headPos} quaternion={headQ}>
				<Ink geometry={headGeo} material={headMat} line={headLine} />
				{variant === 'officer' ? (
					<group position={[0, 0.2, -0.01]} rotation={[-0.1, 0, 0.03]}>
						<Ink geometry={crownGeo} material={hatMat} line={headLine} />
						<mesh geometry={bandGeo} material={bandMat} position={[0, 0.036, 0]} />
						<Ink
							geometry={unitSphere}
							material={visorMat}
							line={headPropLine}
							position={[0, 0.0, 0.2]}
							rotation={[0.3, 0, 0]}
							scale={[0.3, 0.028, 0.24]}
						/>
						<Star position={[0, 0.165, 0.338]} rotation={[-0.42, 0, 0]} size={0.062} head />
					</group>
				) : (
					<group rotation={[-0.42, 0, 0.05]}>
						<Ink geometry={hairGeo} material={hairMat} line={headLine} />
						<Ink geometry={tuftGeo} material={hairMat} line={headPropLine} position={[0.05, 0.39, 0.13]} rotation={[0.55, 0, -0.35]} />
						<Ink geometry={tuftGeo} material={hairMat} line={headPropLine} position={[-0.08, 0.4, 0.08]} rotation={[0.3, 0, 0.4]} />
						<Ink geometry={tuftGeo} material={hairMat} line={headPropLine} position={[0.0, 0.41, -0.02]} rotation={[-0.15, 0, 0.02]} scale={0.9} />
					</group>
				)}
			</group>

			{variant === 'civilian' ? (
				<Ink
					geometry={mugGeo}
					material={mugMat}
					line={propLine}
					position={[pose.handR[0], pose.handR[1] + 0.03, pose.handR[2] + 0.03]}
				/>
			) : null}
		</group>
	);
};
