import React from 'react';
import {BufferGeometry, CanvasTexture, CircleGeometry, DoubleSide, Material, PlaneGeometry, SRGBColorSpace, ShaderMaterial, Shape, ShapeGeometry} from 'three';
import {globals} from '../toon/materials';
import {ramp} from '../toon/palette';
import {outline, toon} from '../toon/materials';
import {P} from '../toon/palette';
import {CHAR, HEAD_R} from './charStyle';
import type {CharSpec, Held} from './cast';

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
/** Neat hair: a smooth cap with a side parting swept over. */
const neatViews = {front: cap(HEAD_R * 0.5), side: cap(HEAD_R * 0.2), back: cap(-HEAD_R * 0.2)};
const sweep = (() => {
	const s = new Shape();
	s.moveTo(-0.3, 0.17);
	s.quadraticCurveTo(-0.05, 0.42, 0.33, 0.24);
	s.quadraticCurveTo(0.12, 0.27, -0.3, 0.17);
	return new ShapeGeometry(s, 16);
})();
/** Tufts for each hair style: [x, y, turn, scale]. */
const TUFTS: Record<string, [number, number, number, number][]> = {
	tufts: [[0.06, 0.3, -0.35, 1], [-0.09, 0.3, 0.4, 1], [0, 0.32, 0.02, 1]],
	messy: [[0.17, 0.25, -0.8, 0.8], [0.07, 0.3, -0.3, 1.1], [-0.05, 0.31, 0.15, 0.95], [-0.16, 0.26, 0.7, 0.85], [0.24, 0.17, -1.2, 0.7], [-0.25, 0.17, 1.15, 0.7]],
	neat: [],
};

// ---- materials -------------------------------------------------------------
export const LINE = 0.024; // outline weight, metres

export type Wear = ReturnType<typeof makeWear>;

/**
 * Materials for one character's flat accessories. `bias` pulls them toward the
 * camera in depth only, so a flat cap can sit in front of a round 3D head.
 */
export const makeWear = (bias: {value: number} = {value: 0}, spec?: CharSpec) => {
	const hairRamp = spec && spec.head.kind === 'hair' ? spec.head.ramp : P.hair;
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
		shades: toon({ramp: ramp(0.18, 0.03, 270), ...CHAR, spec: 1, radius: 0.1, depthBiasRef}),
		paper: toon({ramp: ramp(0.97, 0.01, 95), figure: true, flat: 1, grad: 0.2, band: 0.5, soft: 0.2, deep: 0.3, radius: 0.1, depthBiasRef}),
		cash: toon({ramp: ramp(0.74, 0.13, 145), figure: true, flat: 1, grad: 0.25, band: 0.5, soft: 0.2, deep: 0.4, radius: 0.1, depthBiasRef}),
		dark: toon({ramp: ramp(0.25, 0.03, 270), figure: true, flat: 1, grad: 0.2, band: 0.5, soft: 0.2, deep: 0.3, radius: 0.1, depthBiasRef}),
		drink: toon({ramp: ramp(0.78, 0.15, 40), figure: true, flat: 1, grad: 0.3, band: 0.5, soft: 0.2, deep: 0.4, radius: 0.1, depthBiasRef}),
		texts: new Map<string, ShaderMaterial>(),
		bias: depthBiasRef,
		hair: toon({
			ramp: hairRamp,
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
	spec: CharSpec;
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
export const Headwear: React.FC<HeadwearProps> = ({spec, wear, facing, sideways, drag, light}) =>
	spec.head.kind === 'cap' ? (
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
			{(TUFTS[spec.head.style] ?? TUFTS.tufts).map(([x, y, r, k], i) => (
				<Piece key={i} geometry={tuftShape} material={wear.hair} layer={-0.004} at={[x, y]} turn={r} scale={[k, k]} lined={{half: [0.07, 0.12], center: [0, 0.12], weight: 0.012}} ink={wear.line} light={light} />
			))}
			{spec.head.style === 'neat' && facing > -0.5 ? (
				<Piece geometry={sweep} material={wear.hair} layer={0.004} at={[sideways * 0.1, 0]} scale={[Math.sign(facing || 1) * (0.6 + 0.4 * Math.abs(facing)), 1]} lined={{half: [0.32, 0.12], center: [0, 0.27], weight: 0.012}} ink={wear.line} light={light} />
			) : null}
			<Piece
				geometry={(spec.head.style === 'neat' ? neatViews : hairViews)[facing > 0.5 ? 'front' : facing < -0.5 ? 'back' : 'side']}
				material={wear.hair}
				layer={0}
				lined={{half: [HEAD_R * 1.05, HEAD_R * 1.05], weight: 0.014}}
				ink={wear.line}
				light={light}
			/>
		</group>
	);

// ---- printed things: a flat card with text on it ---------------------------
/** A flat material that shows a drawn canvas, and writes true depth like the toon shaders. */
const textMaterial = (draw: (c: CanvasRenderingContext2D) => void, bias: {value: number}) => {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	draw(canvas.getContext('2d')!);
	const map = new CanvasTexture(canvas);
	map.colorSpace = SRGBColorSpace;
	map.anisotropy = 4;
	return new ShaderMaterial({
		uniforms: {map: {value: map}, uDepthOut: globals.uDepthOut, uDepthBias: bias, uAmb: globals.uAmbTint, uKey: globals.uKeyTint},
		vertexShader: `
			uniform float uDepthBias;
			varying vec2 vUv; varying float vDepth;
			void main() {
				vUv = uv;
				vec4 mv = modelViewMatrix * vec4(position, 1.0);
				vDepth = -mv.z;
				gl_Position = projectionMatrix * mv;
				vec4 nearer = projectionMatrix * (mv + vec4(0.0, 0.0, uDepthBias, 0.0));
				gl_Position.z = nearer.z / nearer.w * gl_Position.w;
			}`,
		fragmentShader: `
			uniform sampler2D map; uniform float uDepthOut; uniform vec3 uAmb; uniform vec3 uKey;
			varying vec2 vUv; varying float vDepth;
			void main() {
				vec4 t = texture2D(map, vUv);
				if (t.a < 0.5) discard;
				gl_FragColor = vec4(t.rgb * mix(uAmb, uKey, 0.75), 1.0);
				gl_FragColor.a = mix(1.0, vDepth, uDepthOut);
			}`,
	});
};

const roundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
	c.beginPath();
	c.moveTo(x + r, y);
	c.arcTo(x + w, y, x + w, y + h, r);
	c.arcTo(x + w, y + h, x, y + h, r);
	c.arcTo(x, y + h, x, y, r);
	c.arcTo(x, y, x + w, y, r);
	c.closePath();
};
const INK = '#1b1530';
const FONT = '800 {s}px Poppins, system-ui, sans-serif';

/** The printed cards, each drawn once onto a canvas. */
const CARDS: Record<string, (c: CanvasRenderingContext2D) => void> = {
	paycheck: (c) => {
		c.lineWidth = 14;
		c.strokeStyle = INK;
		c.fillStyle = '#fbf6e6';
		roundRect(c, 10, 52, 236, 152, 14);
		c.fill();
		c.stroke();
		c.fillStyle = '#7cc47a';
		c.fillRect(17, 59, 222, 34);
		c.fillStyle = INK;
		c.font = FONT.replace('{s}', '58');
		c.textAlign = 'center';
		c.fillText('$$$', 128, 162);
		c.fillRect(40, 178, 176, 7);
	},
	phone: (c) => {
		c.lineWidth = 14;
		c.strokeStyle = INK;
		c.fillStyle = '#2b2440';
		roundRect(c, 58, 8, 140, 240, 24);
		c.fill();
		c.stroke();
		c.fillStyle = '#e9f3ff';
		roundRect(c, 74, 30, 108, 196, 10);
		c.fill();
		c.fillStyle = '#7a8197';
		c.font = FONT.replace('{s}', '20');
		c.textAlign = 'center';
		c.fillText('SAVINGS', 128, 92);
		c.fillStyle = '#e0443a';
		c.font = FONT.replace('{s}', '64');
		c.fillText('$0', 128, 162);
	},
	bill: (c) => {
		c.lineWidth = 12;
		c.strokeStyle = INK;
		c.fillStyle = '#fbf6e6';
		roundRect(c, 40, 8, 176, 240, 10);
		c.fill();
		c.stroke();
		c.fillStyle = INK;
		c.textAlign = 'center';
		c.font = FONT.replace('{s}', '30');
		c.fillText('TV', 128, 60);
		c.font = FONT.replace('{s}', '22');
		c.fillText('PAYMENT', 128, 104);
		c.fillStyle = '#e0443a';
		c.font = FONT.replace('{s}', '40');
		c.fillText('48/60', 128, 156);
		c.fillStyle = INK;
		for (let y = 182; y < 230; y += 14) c.fillRect(70, y, 116, 6);
	},
	cash: (c) => {
		c.lineWidth = 12;
		c.strokeStyle = INK;
		c.fillStyle = '#9fd68c';
		roundRect(c, 8, 70, 240, 116, 10);
		c.fill();
		c.stroke();
		c.beginPath();
		c.arc(128, 128, 34, 0, Math.PI * 2);
		c.fillStyle = '#d7f0c8';
		c.fill();
		c.stroke();
		c.fillStyle = INK;
		c.font = FONT.replace('{s}', '50');
		c.textAlign = 'center';
		c.fillText('$', 128, 146);
	},
};

/** A printed card for a given wear set (text drawn once per set). */
export const cardOf = (wear: Wear, kind: string) => {
	let m = wear.texts.get(kind);
	if (!m) {
		m = textMaterial(CARDS[kind], wear.bias);
		wear.texts.set(kind, m);
	}
	return m;
};

/** Something held in the hand, as a flat drawing. Origin is the hand. */
export const HeldProp: React.FC<{kind: Held; wear: Wear; light: [number, number]}> = ({kind, wear, light}) => {
	if (kind === 'mug') return <Mug wear={wear} light={light} />;
	if (kind === 'remote')
		return <Piece geometry={square} material={wear.dark} layer={0} at={[0, 0.05]} turn={-0.3} scale={[0.05, 0.16]} lined={{half: [0.5, 0.5], weight: 0.01}} ink={wear.line} light={light} />;
	if (kind === 'drink')
		return (
			<>
				<Piece geometry={square} material={wear.drink} layer={0} at={[0, 0.07]} scale={[0.09, 0.15]} lined={{half: [0.5, 0.5], weight: 0.012}} ink={wear.line} light={light} />
				<Piece geometry={square} material={wear.paper} layer={0.004} at={[0.03, 0.19]} turn={-0.3} scale={[0.012, 0.13]} light={light} />
			</>
		);
	const size: Record<string, [number, number]> = {paycheck: [0.3, 0.3], phone: [0.34, 0.34], bill: [0.28, 0.28], cash: [0.26, 0.26]};
	const [w, h] = size[kind] ?? [0.25, 0.25];
	return (
		<mesh geometry={square} material={cardOf(wear, kind)} position={[0, h * 0.42, 0.01]} scale={[w, h, 1]} />
	);
};

/** Sunglasses, drawn over the face. Origin is the head centre. */
export const Shades: React.FC<{wear: Wear; facing: number; sideways: number; light: [number, number]}> = ({wear, facing, sideways, light}) => (
	<group position={[sideways * 0.2, 0.07, 0.03]}>
		{[-1, 1].map((k) => (
			<Piece key={k} geometry={disc} material={wear.shades} layer={0} at={[k * 0.115 * Math.max(0.35, facing), 0]} scale={[0.1 * Math.max(0.4, facing), 0.075]} lined={{half: [1, 1], weight: 0.012}} ink={wear.line} light={light} />
		))}
		<Piece geometry={square} material={wear.shades} layer={0.002} at={[0, 0.02]} scale={[0.08 * Math.max(0.35, facing), 0.02]} light={light} />
	</group>
);

/** The mug, as a flat drawing. Origin is the hand. */
export const Mug: React.FC<{wear: Wear; light: [number, number]; layer?: number}> = ({wear, light, layer = 0}) => (
	<Piece geometry={square} material={wear.mug} layer={layer} at={[0, 0.03]} scale={[0.11, 0.11]} lined={{half: [0.5, 0.5], weight: 0.012}} ink={wear.line} light={light} />
);
