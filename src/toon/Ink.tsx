import React from 'react';
import {BoxGeometry, BufferGeometry, Material} from 'three';
import {outline} from './materials';

type Props = {
	geometry: BufferGeometry;
	material: Material;
	/** Outline material (inverted hull). Omit for shapes that are ink already. */
	line?: Material | null;
	cast?: boolean;
	receive?: boolean;
	position?: [number, number, number];
	rotation?: [number, number, number];
	scale?: [number, number, number] | number;
};

/** A toon-shaded mesh plus its inverted-hull line art. */
export const Ink: React.FC<Props> = ({geometry, material, line, cast = true, receive = false, ...t}) => (
	<group {...t}>
		<mesh geometry={geometry} material={material} castShadow={cast} receiveShadow={receive} />
		{line ? <mesh geometry={geometry} material={line} /> : null}
	</group>
);

const boxes = new Map<string, BoxGeometry>();
export const boxGeo = (w: number, h: number, d: number) => {
	const k = `${w}|${h}|${d}`;
	let g = boxes.get(k);
	if (!g) {
		g = new BoxGeometry(w, h, d);
		boxes.set(k, g);
	}
	return g;
};

export const boxLine = outline({box: true, width: 0.011, thin: 0.6, thick: 1.4});
export const boxLineThin = outline({box: true, width: 0.007, thin: 0.6, thick: 1.4});

type BoxProps = Omit<Props, 'geometry' | 'line'> & {
	size: [number, number, number];
	line?: Material | null | false;
};

export const Box: React.FC<BoxProps> = ({size, line, ...rest}) => (
	<Ink geometry={boxGeo(...size)} line={line === false ? null : (line ?? boxLine)} {...rest} />
);
