import React, {useEffect, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, continueRender, delayRender, useVideoConfig} from 'remotion';
import {Captions} from './Captions';
import {Scene} from './scene/Scene';

export const Short: React.FC = () => {
	const {width, height} = useVideoConfig();
	const [handle] = useState(() => delayRender('fonts'));
	useEffect(() => {
		document.fonts.load('800 92px Poppins').finally(() => continueRender(handle));
	}, [handle]);

	return (
		<AbsoluteFill style={{backgroundColor: '#0c0a1a'}}>
			<ThreeCanvas width={width} height={height} flat shadows gl={{antialias: true}} camera={{fov: 50, near: 0.1, far: 60}}>
				<Scene />
			</ThreeCanvas>
			{/* soft vignette to pull the eye to the middle of the frame */}
			<AbsoluteFill
				style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(20,12,40,0) 55%, rgba(20,12,40,0.28) 100%)'}}
			/>
			<Captions />
		</AbsoluteFill>
	);
};
