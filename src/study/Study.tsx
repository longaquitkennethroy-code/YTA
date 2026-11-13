import React, {useEffect, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/poppins/800.css';
import {Scene} from '../scene/Scene';
import {SHOTS, shotAt, studyDirection} from './direction';

const EDGE = 5; // frames either side of a transition

/** How the picture is treated around each change of shot. */
const transition = (frame: number): React.CSSProperties => {
	for (const s of SHOTS) {
		if (s.cut === 'cut' || s.cut === 'none' || s.from === 0) continue;
		const d = frame - s.from;
		if (d < -EDGE || d >= EDGE) continue;
		const p = d < 0 ? (d + EDGE + 1) / EDGE : 1 - (d + 1) / EDGE;
		if (s.cut === 'whip') {
			const dir = d < 0 ? -1 : 1;
			return {transform: `translateX(${dir * 34 * p * p}%) scale(${1 + 0.72 * p * p})`, filter: `blur(${p * 22}px)`};
		}
		// soft: the two shots melt through a blur and a slight push
		return {transform: `scale(${1 + 0.1 * p})`, filter: `blur(${p * p * 26}px) brightness(${1 + 0.12 * p})`};
	}
	return {};
};

export const Study: React.FC<{flat?: boolean}> = ({flat}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const shot = shotAt(frame);
	const mood = studyDirection.mood(frame);
	const [handle] = useState(() => delayRender('fonts'));
	useEffect(() => {
		document.fonts.load('800 60px Poppins').finally(() => continueRender(handle));
	}, [handle]);

	const peephole = frame >= 652 && frame < 700;
	// red and blue wash sweeping the room at the end of the kitchen shot
	const siren = frame >= 436 && frame < 462 ? interpolate(frame, [436, 444], [0, 1], {extrapolateRight: 'clamp'}) : 0;
	const pop = interpolate(frame - shot.from, [0, 2, 5], [0.85, 1.06, 1], {extrapolateRight: 'clamp'});

	return (
		<AbsoluteFill style={{backgroundColor: '#0c0a1a'}}>
			<AbsoluteFill style={transition(frame)}>
				<ThreeCanvas width={width} height={height} flat shadows gl={{antialias: true}} camera={{fov: 50, near: 0.1, far: 60}}>
					<Scene flat={flat} direction={studyDirection} />
				</ThreeCanvas>
			</AbsoluteFill>
			<AbsoluteFill
				style={{
					background: `linear-gradient(180deg, ${mood.gradeTop} 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 60%, ${mood.gradeBottom} 100%)`,
					mixBlendMode: 'multiply',
				}}
			/>
			{siren > 0 ? (
				<AbsoluteFill
					style={{
						background: Math.floor(frame / 5) % 2 ? 'rgba(255,60,60,0.9)' : 'rgba(70,110,255,0.9)',
						mixBlendMode: 'soft-light',
						opacity: siren * 0.75,
					}}
				/>
			) : null}
			{peephole ? (
				<AbsoluteFill
					style={{background: 'radial-gradient(circle at 50% 44%, rgba(0,0,0,0) 26%, rgba(40,26,10,0.55) 28.5%, #120c0a 31%, #1b1310 60%, #000 100%)'}}
				/>
			) : (
				<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(20,12,40,0) 55%, rgba(20,12,40,0.28) 100%)'}} />
			)}
			{/* caption: the technique this shot is studying, in the reserved lower third */}
			<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', top: '70%'}}>
				<div
					style={{
						fontFamily: 'Poppins, system-ui, sans-serif',
						fontWeight: 800,
						fontSize: 46,
						maxWidth: '86%',
						textAlign: 'center',
						lineHeight: 1.15,
						color: 'white',
						WebkitTextStroke: '10px #0c0a1a',
						paintOrder: 'stroke fill',
						transform: `scale(${pop})`,
					}}
				>
					{shot.label}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
