import React from 'react';
import {Composition} from 'remotion';
import {Short} from './Short';
import {DURATION, FPS} from './scene/timeline';

export const Root: React.FC = () => (
	<>
	<Composition
		id="StickmanShort"
		component={Short}
		width={1080}
		height={1920}
		fps={FPS}
		durationInFrames={DURATION}
		defaultProps={{flat: false}}
	/>
	{/* same scene, characters as flat 2D cut-outs */}
	<Composition
		id="StickmanShort2D"
		component={Short}
		width={1080}
		height={1920}
		fps={FPS}
		durationInFrames={DURATION}
		defaultProps={{flat: true}}
	/>
	</>
);
