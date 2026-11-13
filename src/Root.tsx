import React from 'react';
import {Composition} from 'remotion';
import {Short} from './Short';
import {DURATION, FPS} from './scene/timeline';

export const Root: React.FC = () => (
	<Composition
		id="StickmanShort"
		component={Short}
		width={1080}
		height={1920}
		fps={FPS}
		durationInFrames={DURATION}
	/>
);
