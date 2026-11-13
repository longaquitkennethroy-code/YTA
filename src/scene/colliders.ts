import {Vector3} from 'three';

/**
 * Solid things in the set, as boxes [minX, minY, minZ, maxX, maxY, maxZ].
 * Characters, their limbs and the camera are kept out of these, so nothing
 * passes through anything else.
 */
type Box = [number, number, number, number, number, number];

export const SOLIDS: Box[] = [
	// sofa: base and seat, back, two arms
	[1.8, 0, 0.75, 2.8, 0.6, 3.05],
	[2.56, 0, 0.75, 2.88, 1.115, 3.05],
	[1.775, 0, 0.5, 2.825, 0.75, 0.8],
	[1.775, 0, 3.0, 2.825, 0.75, 3.3],
	// side table and the vase on it
	[2.0, 0, -2.65, 2.7, 0.76, -1.95],
	[2.2, 0.76, -2.45, 2.5, 1.6, -2.15],
	// bookshelf, floor lamp, potted plant
	[2.6, 0, -1.65, 3.0, 2.1, -0.35],
	[2.35, 0, 0.25, 2.55, 1.9, 0.45],
	[-2.85, 0, -2.65, -2.45, 1.5, -2.25],
	// kitchen cabinets, lower and upper
	[-4.2, 0, -7.2, -1.2, 0.97, -6.55],
	[-4.2, 1.72, -7.2, -2.1, 2.48, -6.84],
	// walls: dividing wall either side of and above the opening, then the rest
	[-3.2, 0, -3.2, -2.4, 3.1, -3.0],
	[0.1, 0, -3.2, 3.2, 3.1, -3.0],
	[-2.4, 2.25, -3.2, 0.1, 3.1, -3.0],
	[3.0, 0, -3.2, 3.2, 3.1, 4.7],
	[-3.2, 0, -3.0, -3.0, 3.1, 4.7],
	[-3.2, 0, 4.5, 3.2, 3.1, 4.7],
	[-4.4, 0, -7.4, 1.4, 3.1, -7.2],
	[-4.4, 0, -7.4, -4.2, 3.1, -3.2],
	[1.2, 0, -7.4, 1.4, 3.1, -3.2],
];

/**
 * Move a point of radius r out of every solid, by the shortest way out.
 * It may rise onto a top, or slide out sideways, but never sinks into the floor.
 */
export const pushOut = (p: Vector3, r: number, sidewaysOnly = false): Vector3 => {
	const q = p.clone();
	for (let pass = 0; pass < 2; pass++) {
		for (const [x0, y0, z0, x1, y1, z1] of SOLIDS) {
			if (q.x <= x0 - r || q.x >= x1 + r || q.y <= y0 - r || q.y >= y1 + r || q.z <= z0 - r || q.z >= z1 + r) continue;
			const outs: [number, 'x' | 'y' | 'z', number][] = [
				[q.x - (x0 - r), 'x', x0 - r],
				[x1 + r - q.x, 'x', x1 + r],
				[q.z - (z0 - r), 'z', z0 - r],
				[z1 + r - q.z, 'z', z1 + r],
			];
			if (!sidewaysOnly) {
				outs.push([y1 + r - q.y, 'y', y1 + r]);
				if (y0 > 0.5) outs.push([q.y - (y0 - r), 'y', y0 - r]);
			}
			outs.sort((a, b) => a[0] - b[0]);
			q[outs[0][1]] = outs[0][2];
		}
	}
	if (!sidewaysOnly) q.y = Math.max(q.y, r);
	return q;
};

/** Keep point p at least `gap` away from `from` (pushes straight away from it). */
export const keepAway = (p: Vector3, from: Vector3, gap: number): Vector3 => {
	const d = p.clone().sub(from);
	const len = d.length();
	if (len >= gap) return p;
	if (len < 1e-5) d.set(0, 0, 1);
	return from.clone().addScaledVector(d.normalize(), gap);
};
