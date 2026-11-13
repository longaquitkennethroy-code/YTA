import React from 'react';
import {BufferGeometry, CircleGeometry, DoubleSide, Material, PlaneGeometry, Shape, ShapeGeometry} from 'three';
import {outline, toon} from '../toon/materials';
import {P} from '../toon/palette';
import {CHAR, HEAD_R} from './charStyle';
import type {Variant} from './Stickman';

/**
 * Everything a character wears or holds is a flat 2D drawing: the cap, its
 * peak and badge, the hair, the mug. Each is a flat shape on a plane that
 * faces the camera and swaps between drawn views as the character turns.
 * Only the set is built in 3D.
 */

// ---- flat shapes -----------------------------------------------------------
/** A shape that is symmetric about the y axis, from its right-hand profile. */
export const mirrored = (profile: [number, number][]) => {
	const s = new Shape();
	profile.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
	[...profile].reverse().forEach(([x, y]) => s.lineTo(-x, y));
	s.closePath();
	return new ShapeGeometry(s);
};

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
export const disc = new CircleGeometry(1, 56);
export const square = new PlaneGeometry(1, 1);
export const starShape = (() => {
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
export const LINE = 0.024; // outline weight, metres

export type Wear = ReturnType<typeof makeWear>;

/**
 * Materials for one character's flat accessories. `bias` pulls them toward the
 * camera in depth only, so a flat cap can sit in front of a round 3D head.
 */
export const makeWear = (bias: {value: number} = {value: 0}) => {
	const depthBiasRef = bias;
	const line = outline({width: 0, depthBiasRef});
	line.side = DoubleSide;
	return {
		line,
		gold: toon({ramp: P.gold, figure: true, flat: 1, grad: 0.25, band: 0.5, soft: 0.2, deep: 0.3, radius: 0.1, fog: 0.2, depthBiasRef}),
		inkFill: toon({ramp: P.limb, figure: true, flat: 1, grad: 0, deep: 0, fog: 0.4, depthBiasRef}),
		mug: toon({ramp: P.mug, figure: true, flat: 1, grad: 0.3, band: 0.5, soft: 0.15, deep: 0.5, radius: 0.08, depthBiasRef}),
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
			depthBiasRef,
		}),
		band: toon({ramp: P.uniformDark, ...CHAR, radius: 0.3, depthBiasRef}),
		visor: toon({ramp: P.visor, ...CHAR, spec: 1, radius: 1, paper: {center: [0, 0], half: [1, 1], roundY: 1}, depthBiasRef}),
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
			depthBiasRef,
		}),
	};
};

// ---- one flat piece --------------------------------------------------------
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
	/** Ink material for the line art. */
	ink?: Material;
	/** Which way the light falls across the drawing plane (unit 2D vector). */
	light: [number, number];
};

/**
 * One flat piece plus its line art. The line is a slightly larger ink copy
 * behind it, nudged away from the light: heavy on the shadow side, thin on the
 * lit side.
 */
export const Piece: React.FC<Cut> = ({geometry, material, layer, at = [0, 0], turn = 0, scale = [1, 1], lined, ink, light}) => {
	let line = null;
	if (lined && ink) {
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

// ---- what goes on the head -------------------------------------------------
type HeadwearProps = {
	variant: Variant;
	wear: Wear;
	/** 1 when the head faces the camera, -1 when it faces away. */
	facing: number;
	/** Where the front of the head sits across the disc, -1..1. */
	sideways: number;
	/** Follow-through lean, radians. */
	drag: number;
	light: [number, number];
};

/** The officer's cap or the civilian's hair, drawn for the current view. Origin is the head centre. */
export const Headwear: React.FC<HeadwearProps> = ({variant, wear, facing, sideways, drag, light}) =>
	variant === 'officer' ? (
		<group position={[0, 0.2, 0.02]} rotation={[0, 0, 0.03 + drag]}>
			{/* the peak points wherever the head faces; behind the crown from the back */}
			{facing > -0.75 ? (
				<Piece
					geometry={disc}
					material={wear.visor}
					layer={facing > 0.1 ? 0.012 : -0.012}
					at={[sideways * 0.21, -0.02 - 0.02 * Math.max(facing, 0)]}
					turn={sideways * -0.12}
					scale={[0.19 + 0.11 * Math.abs(facing), 0.03 + 0.016 * Math.max(facing, 0)]}
					lined={{half: [1, 1], weight: 0.012}}
					ink={wear.line}
					light={light}
				/>
			) : null}
			<Piece geometry={crownShape} material={wear.crown} layer={0} lined={{half: [0.375, 0.145], center: [0, 0.145]}} ink={wear.line} light={light} />
			<Piece geometry={square} material={wear.band} layer={0.004} at={[0, 0.036]} scale={[0.535, 0.07]} light={light} />
			{facing > 0.25 ? (
				<>
					<Piece geometry={starShape} material={wear.inkFill} layer={0.006} at={[sideways * 0.3, 0.165]} scale={[0.08 * facing, 0.08]} light={light} />
					<Piece geometry={starShape} material={wear.gold} layer={0.008} at={[sideways * 0.3, 0.165]} scale={[0.062 * facing, 0.062]} light={light} />
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
				<Piece key={i} geometry={tuftShape} material={wear.hair} layer={-0.004} at={[x, y]} turn={r} lined={{half: [0.07, 0.12], center: [0, 0.12], weight: 0.012}} ink={wear.line} light={light} />
			))}
			<Piece
				geometry={facing > 0.5 ? hairViews.front : facing < -0.5 ? hairViews.back : hairViews.side}
				material={wear.hair}
				layer={0}
				lined={{half: [HEAD_R * 1.05, HEAD_R * 1.05], weight: 0.014}}
				ink={wear.line}
				light={light}
			/>
		</group>
	);

/** The mug, as a flat drawing. Origin is the hand. */
export const Mug: React.FC<{wear: Wear; light: [number, number]; layer?: number}> = ({wear, light, layer = 0}) => (
	<Piece geometry={square} material={wear.mug} layer={layer} at={[0, 0.03]} scale={[0.11, 0.11]} lined={{half: [0.5, 0.5], weight: 0.012}} ink={wear.line} light={light} />
);
