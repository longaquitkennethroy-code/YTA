import React from 'react';
import {Composition} from 'remotion';
import {Short} from './Short';
import {DURATION, FPS} from './scene/timeline';
import {Study} from './study/Study';
import {RaiseShort} from './shorts/raise/RaiseShort';
import {DURATION as RAISE_DURATION, FPS as RAISE_FPS} from './shorts/raise/direction';
import {STUDY_DURATION, STUDY_FPS} from './study/direction';

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
	{/* the reference's staging, camera moves and lens angles, rebuilt shot by shot in our set */}
	<Composition
		id="StagingStudy"
		component={Study}
		width={1080}
		height={1920}
		fps={STUDY_FPS}
		durationInFrames={STUDY_DURATION}
		defaultProps={{flat: false}}
	/>
	{/* short 01: "Why your raise made you poorer" */}
	<Composition id="Short01Raise" component={RaiseShort} width={1080} height={1920} fps={RAISE_FPS} durationInFrames={RAISE_DURATION} />
	</>
);
