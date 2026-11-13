import React from 'react';
import {useThree} from '@react-three/fiber';
import {Color, Quaternion, Shape, ShapeGeometry} from 'three';
import {Box, boxLineThin} from '../../toon/Ink';
import {globals, toon} from '../../toon/materials';
import {P, Ramp, ramp} from '../../toon/palette';
import {Piece, cardOf, makeWear, square} from '../../scene/Accessories2D';

type V3 = [number, number, number];

/**
 * Set dressing for "Why your raise made you poorer". The room is the shared
 * living room; this adds what changes as the story goes: the TV, the car
 * outside, the piles of stuff, flying cash, and the wall paint.
 */

const prop = (r: Ramp, radius: number, extra: object = {}) => toon({ramp: r, flat: 0.45, grad: 0.22, band: 0.5, soft: 0.05, deep: 0.6, radius, ...extra});
const M = {
	tvBody: prop(ramp(0.24, 0.03, 270), 0.6, {spec: 0.8, stripe: {inset: 0.5}}),
	tvOld: prop(ramp(0.55, 0.04, 70), 0.4),
	screenOff: prop(ramp(0.3, 0.06, 250), 0.6, {spec: 1}),
	screenOn: toon({ramp: ramp(0.85, 0.11, 225), flat: 1, grad: 0.4, band: 0.3, soft: 0.2, deep: 0.2, radius: 0.8, fog: 0}),
	stand: prop(ramp(0.5, 0.09, 60), 0.5),
	box: prop(ramp(0.7, 0.09, 70), 0.3, {cel: 0.8}),
	boxTape: prop(ramp(0.62, 0.08, 75), 0.2),
	carOld: toon({ramp: ramp(0.78, 0.05, 90), flat: 1, grad: 0.3, band: 0.5, soft: 0.1, deep: 0.5, radius: 0.5}),
	carNew: toon({ramp: ramp(0.58, 0.2, 25), flat: 1, grad: 0.35, band: 0.5, soft: 0.1, deep: 0.6, radius: 0.5, spec: 1, stripe: {inset: 0.5}}),
	tyre: toon({ramp: ramp(0.2, 0.02, 270), flat: 1, grad: 0, deep: 0}),
	glassCar: toon({ramp: ramp(0.85, 0.06, 220), flat: 1, grad: 0.3, band: 0.5, soft: 0.1, deep: 0.3, radius: 0.3}),
};
const wear = makeWear({value: 0});

// ---- the wall paint: plain cream, or a richer sage after the move -----------
const PAINT = {
	plain: {wall: clone(P.wall), motif: clone(P.wallMotif), upper: clone(P.wallUpper)},
	nice: {wall: ramp(0.78, 0.06, 165, {shadeL: 0.84, deepL: 0.66, chroma: 1.3}), motif: ramp(0.72, 0.07, 160, {shadeL: 0.84, deepL: 0.66}), upper: ramp(0.9, 0.03, 150, {shadeL: 0.88, deepL: 0.72})},
};
function clone(r: Ramp): Ramp {
	return {base: r.base.clone(), shade: r.shade.clone(), deep: r.deep.clone(), light: r.light.clone()};
}
const paint = (to: Ramp, from: Ramp) => {
	to.base.copy(from.base);
	to.shade.copy(from.shade);
	to.deep.copy(from.deep);
	to.light.copy(from.light);
};
export const paintWalls = (nice: boolean) => {
	const p = nice ? PAINT.nice : PAINT.plain;
	paint(P.wall, p.wall);
	paint(P.wallMotif, p.motif);
	paint(P.wallUpper, p.upper);
};

// ---- TV on the left wall, facing the sofa -----------------------------------
export const TV: React.FC<{big: boolean; on: boolean; pop?: number}> = ({big, on, pop = 1}) =>
	big ? (
		<group position={[-2.93, 1.45, 1.9]} scale={[1, pop, pop]}>
			<Box size={[0.08, 1.12, 1.95]} material={M.tvBody} cast={false} />
			<Box size={[0.03, 1.0, 1.83]} position={[0.045, 0, 0]} material={on ? M.screenOn : M.screenOff} cast={false} line={boxLineThin} />
		</group>
	) : (
		<group position={[-2.78, 0, 1.9]}>
			<Box size={[0.45, 0.5, 0.9]} position={[0, 0.25, 0]} material={M.stand} />
			<group position={[0, 0.72, 0]} scale={[1, pop, pop]}>
				<Box size={[0.32, 0.42, 0.52]} material={M.tvOld} />
				<Box size={[0.03, 0.3, 0.4]} position={[0.16, 0, 0]} material={on ? M.screenOn : M.screenOff} cast={false} line={boxLineThin} />
			</group>
		</group>
	);

// ---- the car parked outside the window (a flat drawing in the view) ----------
const carShape = (sport: boolean) => {
	const s = new Shape();
	if (sport) {
		s.moveTo(-0.62, 0);
		s.lineTo(0.62, 0);
		s.lineTo(0.64, 0.16);
		s.lineTo(0.3, 0.22);
		s.quadraticCurveTo(0.08, 0.4, -0.25, 0.36);
		s.lineTo(-0.6, 0.2);
	} else {
		s.moveTo(-0.45, 0);
		s.lineTo(0.45, 0);
		s.lineTo(0.47, 0.22);
		s.lineTo(0.3, 0.26);
		s.lineTo(0.2, 0.5);
		s.lineTo(-0.38, 0.5);
		s.lineTo(-0.46, 0.25);
	}
	s.closePath();
	return new ShapeGeometry(s);
};
const CAR = {old: carShape(false), sport: carShape(true)};
const LIGHT: [number, number] = [0.6, 0.8];

export const Car: React.FC<{sport: boolean}> = ({sport}) => (
	// just inside the glass, facing into the room
	<group position={[1.15, 0.95, 4.4]} rotation={[0, Math.PI, 0]} scale={0.95}>
		<Piece geometry={sport ? CAR.sport : CAR.old} material={sport ? M.carNew : M.carOld} layer={0} lined={{half: [0.6, 0.22], center: [0, 0.2], weight: 0.03}} ink={wear.line} light={LIGHT} />
		<Piece geometry={square} material={M.glassCar} layer={0.005} at={sport ? [-0.05, 0.27] : [-0.08, 0.38]} scale={sport ? [0.34, 0.08] : [0.42, 0.18]} light={LIGHT} />
		{[-1, 1].map((k) => (
			<group key={k} position={[k * (sport ? 0.4 : 0.28), 0.02, 0.01]} scale={[0.12, 0.12, 1]}>
				<Piece geometry={square} material={M.tyre} layer={0} turn={Math.PI / 4} scale={[1.2, 1.2]} light={LIGHT} />
			</group>
		))}
	</group>
);

// ---- stuff: cardboard boxes piling up --------------------------------------
/** Where each box lands, in the order they arrive: [x, z, size, turn]. */
const PILE: [number, number, number, number][] = [
	[-2.4, 3.6, 0.5, 0.1],
	[-1.75, 3.9, 0.42, -0.2],
	[-2.45, 3.6, 0.38, 0.4],
	[-0.6, 3.9, 0.48, 0.05],
	[1.4, -2.5, 0.5, -0.1],
	[-2.5, -0.4, 0.44, 0.3],
	[-1.1, 3.95, 0.36, -0.35],
	[0.85, -2.55, 0.4, 0.2],
	[-2.45, 0.2, 0.4, -0.15],
	[-0.6, 3.9, 0.34, 0.5],
	[-2.45, -0.4, 0.32, 0.6],
	[1.4, -2.5, 0.36, 0.45],
];
const stackHeight = (k: number) => {
	let h = 0;
	for (let j = 0; j < k; j++) if (Math.hypot(PILE[j][0] - PILE[k][0], PILE[j][1] - PILE[k][1]) < 0.15) h += PILE[j][2];
	return h;
};

export const Boxes: React.FC<{times: number[]; frame: number}> = ({times, frame}) => (
	<>
		{times.map((t, k) => {
			if (frame < t || k >= PILE.length) return null;
			const [x, z, s, r] = PILE[k];
			// drops in from above, squashes on landing
			const d = frame - t;
			const fall = Math.max(0, 1 - d / 6);
			const land = Math.max(0, 1 - Math.abs(d - 6) / 4);
			const y = stackHeight(k) + s / 2 + fall * fall * 1.4;
			return (
				<group key={k} position={[x, y - land * s * 0.08, z]} rotation={[0, r, 0]} scale={[1 + land * 0.15, 1 - land * 0.18, 1 + land * 0.15]}>
					<Box size={[s, s, s]} material={M.box} />
					<Box size={[s * 1.01, s * 0.12, s * 0.3]} position={[0, s * 0.45, 0]} material={M.boxTape} line={false} />
				</group>
			);
		})}
	</>
);

// ---- cash: bills that flutter in from the top of the frame -------------------
/** Each bill: when it starts, where it lands (the hand), where it comes from. */
export const Cash: React.FC<{bills: {at: number; from: V3; to: V3}[]; frame: number; flight?: number}> = ({bills, frame, flight = 12}) => {
	const camera = useThree((s) => s.camera);
	const q = new Quaternion().copy(camera.quaternion);
	return (
		<>
			{bills.map((b, k) => {
				const t = (frame - b.at) / flight;
				if (t < 0 || t > 1.4) return null;
				const p = Math.min(1, t);
				const e = 1 - (1 - p) * (1 - p);
				const pos: V3 = [b.from[0] + (b.to[0] - b.from[0]) * e, b.from[1] + (b.to[1] - b.from[1]) * e + Math.sin(p * Math.PI) * 0.25, b.from[2] + (b.to[2] - b.from[2]) * e];
				const shrink = t > 1 ? Math.max(0, 1 - (t - 1) / 0.4) : 1;
				return (
					<group key={k} position={pos} quaternion={q}>
						<mesh geometry={square} material={cardOf(wear, 'cash')} rotation={[0, 0, Math.sin(frame * 0.6 + k) * 0.5]} scale={[0.32 * shrink, 0.32 * shrink, 1]} />
					</group>
				);
			})}
		</>
	);
};

// ---- the TV's glow at night -------------------------------------------------
export const tvGlow = (amount: number) => {
	globals.uLampPos.value.set(-2.6, 1.4, 1.9);
	globals.uLampColor.value.copy(new Color(0.55, 0.75, 1.2));
	globals.uLampRadius.value = 5.5;
	globals.uLampAmt.value = amount;
};
export const lampGlow = (amount: number) => {
	globals.uLampPos.value.set(2.45, 1.55, 0.35);
	globals.uLampColor.value.copy(new Color(1, 0.8, 0.5));
	globals.uLampRadius.value = 4.2;
	globals.uLampAmt.value = amount;
};
