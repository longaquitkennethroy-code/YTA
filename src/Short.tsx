import React, {useEffect, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {SHOT_B, SHOT_C} from './scene/timeline';
import {moodAt} from './scene/moods';
import {Captions} from './Captions';
import {Scene} from './scene/Scene';

const WHIP = 4; // frames either side of a cut

/** Whip between shots: the outgoing shot smears off one way, the next lands from the other. */
const whip = (frame: number) => {
	for (const cut of [SHOT_B, SHOT_C]) {
		const d = frame - cut;
		if (d >= -WHIP && d < WHIP) {
			const p = d < 0 ? (d + WHIP + 1) / WHIP : 1 - (d + 1) / WHIP;
			const dir = d < 0 ? -1 : 1;
			return {transform: `translateX(${dir * 34 * p * p}%) scale(${1 + 0.72 * p * p})`, filter: `blur(${p * 22}px)`};
		}
	}
	return {};
};

export const Short: React.FC<{flat?: boolean}> = ({flat}) => {
	const frame = useCurrentFrame();
	const mood = moodAt(frame);
	const {width, height} = useVideoConfig();
	const [handle] = useState(() => delayRender('fonts'));
	useEffect(() => {
		document.fonts.load('800 92px Poppins').finally(() => continueRender(handle));
	}, [handle]);

	return (
		<AbsoluteFill style={{backgroundColor: '#0c0a1a'}}>
			<AbsoluteFill style={whip(frame)}>
			<ThreeCanvas width={width} height={height} flat shadows gl={{antialias: true}} camera={{fov: 50, near: 0.1, far: 60}}>
				<Scene flat={flat} />
			</ThreeCanvas>
			</AbsoluteFill>
			{/* grade: cool lavender falling from the top, warm lift from the floor */}
			<AbsoluteFill
				style={{
					background: `linear-gradient(180deg, ${mood.gradeTop} 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 60%, ${mood.gradeBottom} 100%)`,
					mixBlendMode: 'multiply',
				}}
			/>
			{/* soft vignette to pull the eye to the middle of the frame */}
			<AbsoluteFill
				style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(20,12,40,0) 55%, rgba(20,12,40,0.28) 100%)'}}
			/>
			<Captions />
		</AbsoluteFill>
	);
};
