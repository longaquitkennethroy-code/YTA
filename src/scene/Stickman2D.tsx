import React, {useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {
	BufferGeometry,
	CircleGeometry,
	DoubleSide,
	Euler,
	Material,
	Matrix3,
	Matrix4,
	MeshBasicMaterial,
	PlaneGeometry,
	Quaternion,
	ShaderMaterial,
	Shape,
	ShapeGeometry,
	Vector3,
} from 'three';
import {globals, outline, toon} from '../toon/materials';
import {P} from '../toon/palette';
import {BODY_H, CHAR, HEAD_R, Limb, Pose, SMEAR_SPEED, Variant, bodyGeo, headGeo, rigOf, smears, v} from './Stickman';

/**
 * The same characters as flat paper cut-outs standing in the 3D room.
 *
 * Every part is a flat shape on one plane that always faces the camera. The
 * pose comes from the same skeleton as the 3D version, flattened onto that
 * plane. Nothing rotates in depth: when a character turns, its parts swap
 * between eight drawn views (front, three-quarter, side, back...), and depth
 * is only a stacking order.
 */

// ---- flat shapes -----------------------------------------------------------
/** A shape that is symmetric about the y axis, from its right-hand profile. */
const mirrored = (profile: [number, number][]) => {
	const s = new Shape();
	profile.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
	[...profile].reverse().forEach(([x, y]) => s.lineTo(-x, y));
	s.closePath();
	return new ShapeGeometry(s);
};

const bodyShape = (() => {
	const rb = 0.205;
	const rt = 0.165;
	const pts: [number, number][] = [];
	for (let i = 0; i <= 12; i++) {
		const a = (-Math.PI / 2) * (1 - i / 12);
		pts.push([rb * Math.cos(a), rb + rb * Math.sin(a)]);
	}
	for (let i = 0; i <= 12; i++) {
		const a = (Math.PI / 2) * (i / 12);
		pts.push([rt * Math.cos(a), BODY_H - rt + rt * Math.sin(a)]);
	}
	return mirrored(pts);
})();
const crownShape = mirrored([
	[0.262, 0],
	[0.268, 0.07],
	[0.3, 0.13],
	[0.36, 0.2],
	[0.375, 0.235],
	[0.35, 0.265],
	[0.22, 0.285],
	[0, 0.29],
]);
const disc = new CircleGeometry(1, 56);
const square = new PlaneGeometry(1, 1);
const starShape = (() => {
	const s = new Shape();
	for (let i = 0; i < 10; i++) {
		const r = i % 2 === 0 ? 1 : 0.42;
		const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
		if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
		else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	s.closePath();
	return new ShapeGeometry(s);
})();
const tuftShape = (() => {
	const s = new Shape();
	s.moveTo(-0.07, 0);
	s.lineTo(0.07, 0);
	s.lineTo(0, 0.24);
	s.closePath();
	return new ShapeGeometry(s);
})();
/** Hair: the part of the head disc above a hairline. Three drawn views. */
const cap = (cut: number) => {
	const r = HEAD_R * 1.05;
	const a = Math.asin(cut / r);
	const s = new Shape();
	s.absarc(0, 0, r, a, Math.PI - a, false);
	s.closePath();
	return new ShapeGeometry(s, 24);
};
const hairViews = {front: cap(HEAD_R * 0.42), side: cap(HEAD_R * 0.12), back: cap(-HEAD_R * 0.25)};

// ---- materials -------------------------------------------------------------
const LINE = 0.024; // outline weight, metres
const ink = outline({width: 0});
ink.side = DoubleSide;
const shadowOnly = new MeshBasicMaterial({colorWrite: false, depthWrite: false});
const flatGold = toon({ramp: P.gold, flat: 1, grad: 0.25, band: 0.5, soft: 0.2, deep: 0.3, radius: 0.1, fog: 0.2});
const flatInk = toon({ramp: P.limb, flat: 1, grad: 0, deep: 0, fog: 0.4});
const flatMug = toon({ramp: P.mug, flat: 1, grad: 0.3, band: 0.5, soft: 0.15, deep: 0.5, radius: 0.08});

const makeMats = (variant: Variant) => {
	const bodyView = {value: 0};
	const headView = {value: 0};
	return {
		bodyView,
		headView,
		head: toon({
			ramp: P.skin,
			...CHAR,
			band: 0.44,
			soft: 0.2,
			deep: 0.5,
			rim: 0.9,
			rimWidth: 0.2,
			cel: 0.8,
			celAt: 0.05,
			celSoft: 0.4,
			bounce: 0.8,
			radius: HEAD_R,
			pattern: 'face',
			// the head disc is a unit circle scaled up, so its outline is +-1
			paper: {center: [0, 0], half: [1, 1], roundY: 1},
			viewYaw: headView,
		}),
		body: toon({
			ramp: variant === 'officer' ? P.uniform : P.shirt,
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
			pattern: variant === 'officer' ? 'uniform' : 'none',
			paper: {center: [0, BODY_H / 2], half: [0.205, BODY_H / 2], roundY: 0.3},
			viewYaw: bodyView,
		}),
		crown: toon({
			ramp: P.uniform,
			...CHAR,
			edge: 0.5,
			bounce: 0.7,
			cel: 0.9,
			celAt: 0.15,
			spec: 0.9,
			stripe: {y: [0.1, 0.27], inset: 0.38},
			rim: 0.8,
			rimWidth: 0.35,
			pivot: [0, 0.15, 0],
			radius: 0.36,
			paper: {center: [0, 0.13], half: [0.375, 0.17], roundY: 0.55},
		}),
		band: toon({ramp: P.uniformDark, ...CHAR, radius: 0.3}),
		visor: toon({ramp: P.visor, ...CHAR, spec: 1, radius: 1, paper: {center: [0, 0], half: [1, 1], roundY: 1}}),
		hair: toon({
			ramp: P.hair,
			...CHAR,
			bounce: 0.6,
			cel: 0.85,
			celAt: 0.15,
			spec: 0.7,
			rim: 0.6,
			rimWidth: 0.35,
			radius: 0.36,
			paper: {center: [0, 0], half: [HEAD_R * 1.05, HEAD_R * 1.05], roundY: 1},
		}),
	};
};

// ---- helpers ---------------------------------------------------------------
type Cut = {
	geometry: BufferGeometry;
	material: Material;
	/** Stacking order: higher is nearer the camera. */
	layer: number;
	at?: [number, number];
	turn?: number;
	scale?: [number, number];
	/** Draw line art round it: half size of the shape, and its centre if not at the origin. */
	lined?: {half: [number, number]; center?: [number, number]; weight?: number};
	/** Which way the light falls across the drawing plane (unit 2D vector). */
	light: [number, number];
};

/**
 * One flat piece plus its line art. The line is a slightly larger ink copy
 * behind it, nudged away from the light: heavy on the shadow side, thin on the
 * lit side.
 */
const Piece: React.FC<Cut> = ({geometry, material, layer, at = [0, 0], turn = 0, scale = [1, 1], lined, light}) => {
	let line = null;
	if (lined) {
		const w = lined.weight ?? LINE;
		const [cx, cy] = lined.center ?? [0, 0];
		const gx = (lined.half[0] * scale[0] + w) / (lined.half[0] * scale[0]);
		const gy = (lined.half[1] * scale[1] + w) / (lined.half[1] * scale[1]);
		// the nudge is given in plane space, so undo this piece's own turn and scale
		const c = Math.cos(-turn);
		const s = Math.sin(-turn);
		const nx = (-(light[0] * c - light[1] * s) * w * 0.42) / scale[0];
		const ny = (-(light[0] * s + light[1] * c) * w * 0.42) / scale[1];
		line = <mesh geometry={geometry} material={ink} position={[cx * (1 - gx) + nx, cy * (1 - gy) + ny, -0.006]} scale={[gx, gy, 1]} />;
	}
	return (
		<group position={[at[0], at[1], layer]} rotation={[0, 0, turn]} scale={[scale[0], scale[1], 1]}>
			<mesh geometry={geometry} material={material} />
			{line}
		</group>
	);
};

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Snap an angle to one of eight drawn views. */
const view8 = (a: number) => wrap(Math.round(wrap(a) / (Math.PI / 4)) * (Math.PI / 4));

// ---- character -------------------------------------------------------------
export const Stickman2D: React.FC<{variant: Variant; pose: Pose; trail?: Pose[]}> = ({variant, pose, trail = []}) => {
	const camera = useThree((s) => s.camera);
	const m = useMemo(() => makeMats(variant), [variant]);

	// The drawing plane: stands on the character's feet and faces the camera.
	const toCam = camera.position.clone().sub(v(pose.pos)).sub(new Vector3(0, 1, 0));
	const planeQ = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(toCam, new Vector3(), new Vector3(0, 1, 0)));
	const camYaw = Math.atan2(toCam.x, toCam.z);

	// Flatten a point of the skeleton onto the plane. Heights are kept as
	// drawn, so nothing foreshortens when the camera is high or low.
	const a = pose.yaw - camYaw;
	const flat = (p: Vector3) => ({x: p.x * Math.cos(a) + p.z * Math.sin(a), y: p.y, d: -p.x * Math.sin(a) + p.z * Math.cos(a)});
	const rig = rigOf(pose);
	const hip = flat(rig.hip);
	const top = flat(rig.top);
	const head = flat(rig.headPos);

	// which drawn view of the body and of the head is showing
	const bodyV = view8(-a);
	const headV = view8(-a - pose.headYaw);
	m.bodyView.value = bodyV;
	m.headView.value = headV;
	const facing = Math.cos(headV); // 1 toward camera, -1 away
	const sideways = -Math.sin(headV); // where the front of the head sits on the disc

	// light direction across the plane, for the line weight
	const l3 = globals.uLightDirW.value.clone().applyQuaternion(planeQ.clone().invert());
	const ll = Math.hypot(l3.x, l3.y) || 1;
	const light: [number, number] = [l3.x / ll, l3.y / ll];

	// face: same ink as the 3D head, on the drawn view
	const u = (m.head as ShaderMaterial).uniforms;
	const f = pose.face;
	u.uEyes.value.set(f.blink, f.blink, f.lid, variant === 'civilian' ? 1 : 0);
	u.uLook.value.set(f.look[0], f.look[1]);
	u.uBrow.value.set(f.browL[0], f.browL[1], f.browR[0], f.browR[1]);
	u.uMouth.value.set(...f.mouth);
	const off = Math.abs(headV);
	const cheat = Math.min(off * 0.55, 0.8) * Math.sign(headV || 1);
	(u.uFaceRot.value as Matrix3).setFromMatrix4(new Matrix4().makeRotationY(-cheat).multiply(new Matrix4().makeRotationX(pose.headPitch * 0.6)));
	u.uFaceFade.value = off > 1.9 ? 0 : 1;

	// limbs: flat strokes; an arm goes in front of or behind the torso
	const stroke = (pts: Vector3[]) => pts.map((p) => new Vector3(flat(p).x, flat(p).y, 0));
	const armLayer = (pts: Vector3[]) => {
		const hand = flat(pts[2]);
		const elbow = flat(pts[1]);
		if ((hand.d + elbow.d) / 2 < hip.d - 0.02) return -0.03;
		return hand.y > head.y - 0.3 ? 0.2 : 0.06; // a raised hand passes in front of the face
	};
	const arms = [rig.armL, rig.armR];
	const past = trail.map((t) => rigOf(t)).map((r) => [r.armL, r.armR]);

	const bodyTurn = Math.atan2(-(top.x - hip.x), top.y - hip.y);
	const headTurn = pose.headRoll * facing + bodyTurn * 0.25;
	const lag = trail[1] ?? pose;
	const drag = Math.max(-0.3, Math.min(0.3, (pose.yaw + pose.headYaw - lag.yaw - lag.headYaw) * 0.4 + (pose.headRoll - lag.headRoll) * 1.5));
	const mugAt = flat(v(pose.handR));

	return (
		<>
			{/* invisible stand-ins, so the cut-out still casts a believable shadow */}
			<group position={pose.pos} rotation={[0, pose.yaw, 0]}>
				<mesh geometry={headGeo} material={shadowOnly} position={rig.headPos} castShadow />
				<mesh geometry={bodyGeo} material={shadowOnly} position={rig.hip} rotation={new Euler().setFromQuaternion(rig.bodyQ)} castShadow />
			</group>

			<group position={pose.pos} quaternion={planeQ}>
				<group scale={[1, 1, 0.05]}>
					<Limb pts={stroke(rig.legL)} />
					<Limb pts={stroke(rig.legR)} />
				</group>
				{arms.map((pts, side) => (
					<group key={side} position={[0, 0, armLayer(pts)]} scale={[1, 1, 0.05]}>
						<Limb pts={stroke(pts)} />
						{past.map((sides, k) =>
							pts[2].distanceTo(past[0][side][2]) > SMEAR_SPEED ? <Limb key={k} pts={stroke(sides[side])} ghost={smears[k]} /> : null,
						)}
					</group>
				))}

				{/* torso */}
				<group position={[hip.x, hip.y, 0.02]} rotation={[0, 0, bodyTurn]} scale={[rig.sx, rig.sy, 1]}>
					<Piece geometry={bodyShape} material={m.body} layer={0} lined={{half: [0.205, BODY_H / 2], center: [0, BODY_H / 2]}} light={light} />
					{variant === 'officer' ? (
						<>
							<Piece geometry={square} material={flatInk} layer={0.004} at={[0, 0.2]} scale={[0.41, 0.075]} light={light} />
							{Math.cos(bodyV) > 0.1 ? (
								<Piece
									geometry={square}
									material={flatGold}
									layer={0.008}
									at={[-Math.sin(bodyV) * 0.2, 0.2]}
									scale={[0.07 * Math.cos(bodyV), 0.06]}
									lined={{half: [0.5, 0.5], weight: 0.007}}
									light={light}
								/>
							) : null}
							{Math.cos(0.6 - bodyV) > 0.15 ? (
								<>
									<Piece geometry={starShape} material={flatInk} layer={0.006} at={[Math.sin(0.6 - bodyV) * 0.165, 0.63]} scale={[0.066 * Math.cos(0.6 - bodyV), 0.066]} light={light} />
									<Piece geometry={starShape} material={flatGold} layer={0.008} at={[Math.sin(0.6 - bodyV) * 0.165, 0.63]} scale={[0.05 * Math.cos(0.6 - bodyV), 0.05]} light={light} />
								</>
							) : null}
						</>
					) : null}
				</group>

				{variant === 'civilian' ? (
					<Piece
						geometry={square}
						material={flatMug}
						layer={armLayer(rig.armR) + 0.01}
						at={[mugAt.x, mugAt.y + 0.03]}
						scale={[0.11, 0.11]}
						lined={{half: [0.5, 0.5], weight: 0.012}}
						light={light}
					/>
				) : null}

				{/* head: always above the torso, so its circle of line art is never cut */}
				<group position={[head.x, head.y, 0.1]} rotation={[0, 0, headTurn]} scale={[rig.hx, rig.hy, 1]}>
					<Piece geometry={disc} material={m.head} layer={0} scale={[HEAD_R, HEAD_R]} lined={{half: [1, 1]}} light={light} />
					{variant === 'officer' ? (
						<group position={[0, 0.2, 0.02]} rotation={[0, 0, 0.03 + drag]}>
							{/* the peak points wherever the head faces; behind the crown from the back */}
							{facing > -0.75 ? (
								<Piece
									geometry={disc}
									material={m.visor}
									layer={facing > 0.1 ? 0.012 : -0.012}
									at={[sideways * 0.21, -0.02 - 0.02 * Math.max(facing, 0)]}
									turn={sideways * -0.12}
									scale={[0.19 + 0.11 * Math.abs(facing), 0.03 + 0.016 * Math.max(facing, 0)]}
									lined={{half: [1, 1], weight: 0.012}}
									light={light}
								/>
							) : null}
							<Piece geometry={crownShape} material={m.crown} layer={0} lined={{half: [0.375, 0.145], center: [0, 0.145]}} light={light} />
							<Piece geometry={square} material={m.band} layer={0.004} at={[0, 0.036]} scale={[0.535, 0.07]} light={light} />
							{facing > 0.25 ? (
								<>
									<Piece geometry={starShape} material={flatInk} layer={0.006} at={[sideways * 0.3, 0.165]} scale={[0.08 * facing, 0.08]} light={light} />
									<Piece geometry={starShape} material={flatGold} layer={0.008} at={[sideways * 0.3, 0.165]} scale={[0.062 * facing, 0.062]} light={light} />
								</>
							) : null}
						</group>
					) : (
						<group position={[0, 0, 0.02]} rotation={[0, 0, sideways * 0.4 * (1 - Math.abs(facing)) + drag]}>
							{[
								[0.06, 0.3, -0.35],
								[-0.09, 0.3, 0.4],
								[0, 0.32, 0.02],
							].map(([x, y, r], i) => (
								<Piece key={i} geometry={tuftShape} material={m.hair} layer={-0.004} at={[x, y]} turn={r} lined={{half: [0.07, 0.12], center: [0, 0.12], weight: 0.012}} light={light} />
							))}
							<Piece
								geometry={facing > 0.5 ? hairViews.front : facing < -0.5 ? hairViews.back : hairViews.side}
								material={m.hair}
								layer={0}
								lined={{half: [HEAD_R * 1.05, HEAD_R * 1.05], weight: 0.014}}
								light={light}
							/>
						</group>
					)}
				</group>
			</group>
		</>
	);
};
