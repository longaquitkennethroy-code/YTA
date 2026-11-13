import React from 'react';
import {ConeGeometry, CylinderGeometry, LatheGeometry, Material, SphereGeometry, Vector2} from 'three';
import {Box, Ink, boxLineThin} from '../toon/Ink';
import {outline, toon} from '../toon/materials';
import {P, Ramp, ramp} from '../toon/palette';

type V3 = [number, number, number];

// Architecture keeps its true normals (flat: low) but still gets the planar
// gradient, so big walls are never one dead flat colour.
const arch = (ramp: Ramp, radius: number, extra: object = {}) =>
	toon({ramp, flat: 0.25, grad: 0.16, band: 0.42, soft: 0.1, deep: 0.35, radius, ...extra});
const prop = (ramp: Ramp, radius: number, extra: object = {}) =>
	toon({ramp, flat: 0.45, grad: 0.22, band: 0.5, soft: 0.05, deep: 0.6, radius, ...extra});

const M = {
	wood: arch(P.wood, 5, {pattern: 'wood', alt: P.woodAlt, grad: 0.22, sun: 1}),
	wall: arch(P.wall, 3.5, {pattern: 'wallpaper', alt: P.wallMotif, patScale: 0.34}),
	wallUpper: arch(P.wallUpper, 3.5),
	ceiling: arch(P.wallUpper, 5, {flat: 1, band: 0.3}),
	trim: arch(P.trim, 1.5),
	rug: arch(P.rug, 2.4, {grad: 0.2, pattern: 'carpet', alt: P.wallMotif, sun: 1}),
	rugBorder: arch(P.rugBorder, 2.4, {sun: 1}),
	sofa: prop(P.sofa, 1.2, {rim: 0.5, rimWidth: 0.25}),
	sofaDark: prop(P.sofaDark, 1.2),
	table: prop(P.woodAlt, 0.5),
	vase: toon({ramp: P.vase, flat: 0.75, grad: 0.3, band: 0.58, soft: 0.14, deep: 0.8, cel: 0.85, spec: 1, stripe: {y: [0.06, 0.3]}, rim: 0.8, rimWidth: 0.32, radius: 0.25, pivot: [0, 0.2, 0]}),
	plant: toon({ramp: P.plant, flat: 0.75, grad: 0.3, band: 0.58, soft: 0.12, deep: 0.8, cel: 0.85, radius: 0.25}),
	frame: prop(P.frame, 0.5),
	art: prop(P.art, 0.5),
	kWall: arch(P.kWall, 3.5),
	tiles: arch(P.tileA, 4, {pattern: 'checker', alt: P.tileB, patScale: 0.5}),
	cabinet: prop(P.cabinet, 1.6),
	glass: prop(P.glass, 0.8, {grad: 0.35}),
	phone: prop(P.phone, 0.2),
	lamp: toon({ramp: P.lamp, flat: 0.7, grad: 0.3, band: 0.55, soft: 0.12, deep: 0.7, radius: 0.3}),
	pumpkin: toon({ramp: P.rugBorder, flat: 0.75, grad: 0.3, band: 0.58, soft: 0.12, deep: 0.8, radius: 0.14}),
	curtain: prop(ramp(0.84, 0.16, 88), 1.4, {grad: 0.3}),
	shelf: prop(ramp(0.45, 0.08, 205), 1.2),
	shade: toon({ramp: ramp(0.8, 0.045, 265), flat: 0.7, grad: 0.3, band: 0.55, soft: 0.1, deep: 0.6, cel: 0.8, radius: 0.3}),
	pot: prop(ramp(0.68, 0.12, 45), 0.3, {cel: 0.8}),
	ink: toon({ramp: P.limb, flat: 1, grad: 0, deep: 0, fog: 0.5}),
};
// book spines and picture mats: accents drawn from the same hue families
const ACCENTS = [P.sofa, P.gold, P.shirt, P.frame, P.rugBorder, P.plant, P.art, P.hair].map((r) => prop(r, 0.4));
const rand = (n: number) => {
	const x = Math.sin(n * 127.1) * 43758.5453;
	return x - Math.floor(x);
};
const softLine = outline({width: 0.012, thin: 0.5, thick: 1.5, seed: 2.2});

const H = 3.1; // ceiling height
const RAIL = 2.5; // picture-rail height: patterned paper below, plain above

/** A wall run: wallpaper up to the picture rail, plain above it, rail between. */
const Wall: React.FC<{size: V3; position: V3; from?: number; paper?: Material; upper?: Material; rail?: boolean}> = ({
	size,
	position,
	from = 0,
	paper = M.wall,
	upper = M.wallUpper,
	rail = true,
}) => {
	const [w, , d] = size;
	const alongX = w > d;
	const grow = (n: number): V3 => (alongX ? [w + 0.02, n, d + 0.06] : [w + 0.06, n, d + 0.02]);
	return (
		<group position={position}>
			{RAIL > from ? (
				<Box size={[w, RAIL - from, d]} position={[0, (RAIL + from) / 2, 0]} material={paper} cast={false} receive />
			) : null}
			<Box size={[w, H - RAIL, d]} position={[0, (H + RAIL) / 2, 0]} material={upper} cast={false} receive line={false} />
			{rail ? <Box size={grow(0.07)} position={[0, RAIL, 0]} material={M.trim} cast={false} line={boxLineThin} /> : null}
			{from === 0 ? <Box size={grow(0.15)} position={[0, 0.075, 0]} material={M.trim} cast={false} line={boxLineThin} /> : null}
		</group>
	);
};

const vaseGeo = new LatheGeometry(
	[
		[0.0001, 0],
		[0.11, 0.0],
		[0.17, 0.12],
		[0.15, 0.27],
		[0.07, 0.37],
		[0.085, 0.44],
		[0.0001, 0.44],
	].map(([x, y]) => new Vector2(x, y)),
	28,
);
const ball = new SphereGeometry(1, 28, 18);
const shadeGeo = new ConeGeometry(0.3, 0.26, 28, 1, true);
const poleGeo = new CylinderGeometry(0.022, 0.022, 1.6, 8);
const baseGeo = new CylinderGeometry(0.17, 0.2, 0.04, 24);
const lampShadeGeo = new CylinderGeometry(0.17, 0.3, 0.36, 28, 1, true);
const potGeo = new CylinderGeometry(0.2, 0.14, 0.4, 24);
const cordGeo = new CylinderGeometry(0.012, 0.012, 0.5, 6);

const Window: React.FC<{position: V3; size: [number, number]; rotation?: V3}> = ({position, size: [w, h], rotation}) => (
	<group position={position} rotation={rotation}>
		<Box size={[w + 0.16, h + 0.16, 0.06]} material={M.trim} cast={false} />
		<Box size={[w, h, 0.08]} material={M.glass} cast={false} line={boxLineThin} />
		<Box size={[0.045, h, 0.1]} material={M.trim} cast={false} line={false} />
		<Box size={[w, 0.045, 0.1]} material={M.trim} cast={false} line={false} />
	</group>
);

export const Room: React.FC = () => (
	<group>
		{/* ---------------- living room: x -3..3, z -3..4.5 ---------------- */}
		<Box size={[6.4, 0.1, 7.8]} position={[0, -0.05, 0.75]} material={M.wood} cast={false} receive line={false} />
		<Box size={[3.5, 0.02, 3.9]} position={[0.25, 0.01, 1.1]} material={M.rugBorder} cast={false} receive />
		<Box size={[3.1, 0.02, 3.5]} position={[0.25, 0.018, 1.1]} material={M.rug} cast={false} receive line={boxLineThin} />
		<Box size={[6.4, 0.1, 7.8]} position={[0, H + 0.05, 0.75]} material={M.ceiling} cast={false} line={false} />

		{/* back wall with the wide opening to the kitchen (x -2.4..0.1) */}
		<Wall size={[0.8, H, 0.2]} position={[-2.8, 0, -3.1]} />
		<Wall size={[3.1, H, 0.2]} position={[1.65, 0, -3.1]} />
		<Wall size={[2.5, H, 0.2]} position={[-1.15, 0, -3.1]} from={2.25} rail={false} />
		<Box size={[6.42, 0.07, 0.26]} position={[0, RAIL, -3.1]} material={M.trim} cast={false} line={boxLineThin} />
		<Box size={[0.12, 2.25, 0.3]} position={[-2.44, 1.125, -3.1]} material={M.trim} cast={false} />
		<Box size={[0.12, 2.25, 0.3]} position={[0.14, 1.125, -3.1]} material={M.trim} cast={false} />
		<Box size={[2.82, 0.13, 0.32]} position={[-1.15, 2.3, -3.1]} material={M.trim} cast={false} />

		<Wall size={[0.2, H, 7.8]} position={[3.1, 0, 0.75]} />
		<Wall size={[0.2, H, 7.8]} position={[-3.1, 0, 0.75]} />
		<Wall size={[6.4, H, 0.2]} position={[0, 0, 4.6]} />
		<Window position={[0.9, 1.55, 4.49]} size={[1.7, 1.5]} />
		<Box size={[0.55, 2.3, 0.08]} position={[-0.32, 1.4, 4.42]} rotation={[0, 0, 0.05]} material={M.curtain} cast={false} />
		<Box size={[0.55, 2.3, 0.08]} position={[2.12, 1.4, 4.42]} rotation={[0, 0, -0.05]} material={M.curtain} cast={false} />
		<Box size={[3.3, 0.05, 0.05]} position={[0.9, 2.58, 4.4]} material={M.curtain} cast={false} line={boxLineThin} />
		{/* street outside */}
		<Box size={[1.7, 0.5, 0.02]} position={[0.9, 1.05, 4.44]} material={M.plant} cast={false} line={false} />
		<Box size={[0.9, 0.62, 0.02]} position={[0.55, 1.6, 4.435]} material={M.table} cast={false} line={boxLineThin} />
		<Box size={[1.05, 0.14, 0.02]} position={[0.55, 1.97, 4.43]} material={M.sofaDark} cast={false} line={boxLineThin} />

		{/* sofa against the right wall */}
		<group position={[2.3, 0, 1.9]}>
			<Box size={[1.0, 0.3, 2.3]} position={[0, 0.27, 0]} material={M.sofaDark} receive />
			<Box size={[0.85, 0.2, 2.0]} position={[-0.05, 0.5, 0]} material={M.sofa} receive />
			<Box size={[0.32, 0.75, 2.3]} position={[0.42, 0.74, 0]} material={M.sofa} receive />
			<Box size={[1.05, 0.5, 0.3]} position={[0, 0.5, -1.25]} material={M.sofa} receive />
			<Box size={[1.05, 0.5, 0.3]} position={[0, 0.5, 1.25]} material={M.sofa} receive />
			<Box size={[0.08, 0.12, 0.08]} position={[-0.4, 0.06, -1.2]} material={M.ink} line={false} />
			<Box size={[0.08, 0.12, 0.08]} position={[-0.4, 0.06, 1.2]} material={M.ink} line={false} />
		</group>

		{/* side table, vase and plant */}
		<group position={[2.35, 0, -2.3]}>
			<Box size={[0.7, 0.07, 0.7]} position={[0, 0.72, 0]} material={M.table} receive />
			<Box size={[0.07, 0.7, 0.07]} position={[-0.27, 0.35, 0.27]} material={M.table} line={boxLineThin} />
			<Box size={[0.07, 0.7, 0.07]} position={[0.27, 0.35, 0.27]} material={M.table} line={boxLineThin} />
			<Box size={[0.07, 0.7, 0.07]} position={[-0.27, 0.35, -0.27]} material={M.table} line={boxLineThin} />
			<Box size={[0.07, 0.7, 0.07]} position={[0.27, 0.35, -0.27]} material={M.table} line={boxLineThin} />
			<Ink geometry={vaseGeo} material={M.vase} line={softLine} position={[0, 0.755, 0]} />
			<Ink geometry={ball} material={M.plant} line={softLine} position={[0, 1.42, 0]} scale={[0.26, 0.24, 0.26]} />
			<Ink geometry={ball} material={M.plant} line={softLine} position={[-0.2, 1.3, 0.05]} scale={0.16} />
			<Ink geometry={ball} material={M.plant} line={softLine} position={[0.19, 1.33, 0.06]} scale={0.17} />
		</group>

		{/* bookshelf on the right wall */}
		<group position={[2.8, 0, -1.0]}>
			<Box size={[0.4, 2.1, 1.3]} position={[0, 1.05, 0]} material={M.shelf} receive />
			{[0.12, 0.6, 1.08, 1.56].map((y, row) => (
				<React.Fragment key={y}>
					<Box size={[0.36, 0.42, 1.18]} position={[-0.04, y + 0.23, 0]} material={M.ink} cast={false} line={false} />
					{Array.from({length: 9}, (_, i) => {
						const r = rand(row * 31 + i);
						const h = 0.26 + r * 0.13;
						const lean = r > 0.86 ? 0.22 : 0;
						return (
							<Box
								key={i}
								size={[0.26, h, 0.1]}
								position={[-0.12, y + 0.03 + h / 2, -0.5 + i * 0.125]}
								rotation={[lean, 0, 0]}
								material={ACCENTS[Math.floor(rand(row * 17 + i * 3 + 5) * ACCENTS.length)]}
								cast={false}
								line={boxLineThin}
							/>
						);
					})}
				</React.Fragment>
			))}
		</group>

		{/* floor lamp */}
		<group position={[2.45, 0, 0.35]}>
			<mesh geometry={poleGeo} material={M.ink} position={[0, 0.8, 0]} castShadow />
			<Ink geometry={baseGeo} material={M.ink} position={[0, 0.02, 0]} />
			<Ink geometry={lampShadeGeo} material={M.shade} line={softLine} position={[0, 1.72, 0]} />
		</group>

		{/* potted plant by the opening */}
		<group position={[-2.65, 0, -2.45]}>
			<Ink geometry={potGeo} material={M.pot} line={softLine} position={[0, 0.2, 0]} />
			{[[0, 0.75, 0, 0.2], [-0.16, 0.98, 0.06, 0.17], [0.15, 1.08, -0.04, 0.18], [0.02, 1.32, 0.03, 0.16]].map(([x, y, z, s], i) => (
				<Ink key={i} geometry={ball} material={M.plant} line={softLine} position={[x, y, z]} scale={[s, s * 1.15, s * 0.5]} />
			))}
			<mesh geometry={poleGeo} material={M.ink} position={[0, 0.6, 0]} scale={[0.7, 0.55, 0.7]} />
		</group>

		{/* gallery wall */}
		{[
			[0.55, 2.05, 0.34, 0.42],
			[0.62, 1.42, 0.3, 0.3],
			[2.25, 2.0, 0.4, 0.5],
			[2.3, 1.36, 0.46, 0.32],
		].map(([x, y, w, h], i) => (
			<React.Fragment key={i}>
				<Box size={[w, h, 0.04]} position={[x, y, -2.98]} material={ACCENTS[(i * 3 + 1) % ACCENTS.length]} cast={false} />
				<Box size={[w - 0.1, h - 0.1, 0.05]} position={[x, y, -2.98]} material={i % 2 ? M.art : M.trim} cast={false} line={boxLineThin} />
				<Box size={[(w - 0.1) * 0.5, (h - 0.1) * 0.35, 0.055]} position={[x, y - (h - 0.1) * 0.2, -2.98]} material={ACCENTS[(i * 5 + 2) % ACCENTS.length]} cast={false} line={false} />
			</React.Fragment>
		))}

		{/* pictures */}
		<Box size={[0.9, 0.66, 0.05]} position={[1.5, 1.72, -2.98]} material={M.frame} cast={false} />
		<Box size={[0.72, 0.48, 0.06]} position={[1.5, 1.72, -2.98]} material={M.art} cast={false} line={boxLineThin} />
		<Box size={[0.05, 0.7, 0.56]} position={[2.98, 1.75, 0.2]} material={M.frame} cast={false} />
		<Box size={[0.06, 0.52, 0.38]} position={[2.98, 1.75, 0.2]} material={M.art} cast={false} line={boxLineThin} />

		{/* ---------------- kitchen: x -4.2..1.2, z -7.2..-3.2 -------------- */}
		<Box size={[5.8, 0.1, 4.2]} position={[-1.5, -0.05, -5.3]} material={M.tiles} cast={false} receive line={false} />
		<Box size={[5.8, 0.1, 4.2]} position={[-1.5, H + 0.05, -5.3]} material={M.ceiling} cast={false} line={false} />
		<Wall size={[5.8, H, 0.2]} position={[-1.5, 0, -7.3]} paper={M.kWall} upper={M.kWall} rail={false} />
		<Wall size={[0.2, H, 4.2]} position={[-4.3, 0, -5.3]} paper={M.kWall} upper={M.kWall} rail={false} />
		<Wall size={[0.2, H, 4.2]} position={[1.3, 0, -5.3]} paper={M.kWall} upper={M.kWall} rail={false} />
		{/* kitchen side of the dividing wall */}
		<Box size={[2.0, H, 0.04]} position={[-3.4, H / 2, -3.22]} material={M.kWall} cast={false} line={false} />
		<Box size={[1.3, H, 0.04]} position={[0.75, H / 2, -3.22]} material={M.kWall} cast={false} line={false} />

		<Box size={[3.0, 0.9, 0.62]} position={[-2.7, 0.45, -6.88]} material={M.cabinet} receive />
		<Box size={[3.1, 0.07, 0.7]} position={[-2.7, 0.935, -6.86]} material={M.table} receive />
		{[-3.7, -2.7, -1.7].map((x) => (
			<React.Fragment key={x}>
				<Box size={[0.86, 0.66, 0.02]} position={[x, 0.45, -6.565]} material={M.cabinet} cast={false} line={boxLineThin} />
				<Box size={[0.14, 0.035, 0.03]} position={[x, 0.68, -6.55]} material={M.ink} cast={false} line={false} />
			</React.Fragment>
		))}
		<Box size={[2.1, 0.75, 0.36]} position={[-3.15, 2.1, -7.02]} material={M.cabinet} cast={false} />
		<Box size={[0.98, 0.6, 0.02]} position={[-3.66, 2.1, -6.835]} material={M.cabinet} cast={false} line={boxLineThin} />
		<Box size={[0.98, 0.6, 0.02]} position={[-2.64, 2.1, -6.835]} material={M.cabinet} cast={false} line={boxLineThin} />
		<Ink geometry={ball} material={M.pumpkin} line={softLine} position={[-3.7, 1.08, -6.85]} scale={[0.14, 0.11, 0.14]} />

		<Window position={[-0.95, 1.75, -7.19]} size={[1.0, 0.95]} />
		<Box size={[0.9, 2.1, 0.06]} position={[0.55, 1.05, -7.18]} material={M.trim} cast={false} />
		<Box size={[0.6, 0.75, 0.07]} position={[0.55, 1.5, -7.18]} material={M.glass} cast={false} line={boxLineThin} />
		<Box size={[0.06, 0.06, 0.06]} position={[0.22, 1.02, -7.13]} material={M.ink} cast={false} line={false} />
		<Box size={[0.17, 0.28, 0.08]} position={[-0.12, 1.42, -7.16]} material={M.phone} cast={false} />
		<Box size={[0.3, 0.4, 0.02]} position={[-0.1, 2.15, -7.19]} material={M.trim} cast={false} line={boxLineThin} />
		<Box size={[0.3, 0.1, 0.03]} position={[-0.1, 2.3, -7.19]} material={M.phone} cast={false} line={false} />

		<group position={[-1.4, 2.42, -4.9]}>
			<Ink geometry={shadeGeo} material={M.lamp} line={softLine} cast={false} />
			<mesh geometry={cordGeo} material={M.ink} position={[0, 0.38, 0]} />
		</group>
	</group>
);
