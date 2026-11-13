import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import '@fontsource/poppins/800.css';
import {WORDS} from './scene/timeline';

/** One punchy word at a time, Shorts style. */
export const Captions: React.FC = () => {
	const frame = useCurrentFrame();
	const word = WORDS.find((w) => frame >= w.from && frame < w.to);
	if (!word) return null;
	const pop = interpolate(frame - word.from, [0, 2, 5], [0.82, 1.08, 1], {extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', top: '66%'}}>
			<div
				style={{
					fontFamily: 'Poppins, system-ui, sans-serif',
					fontWeight: 800,
					fontSize: 92,
					color: 'white',
					WebkitTextStroke: '16px #0c0a1a',
					paintOrder: 'stroke fill',
					textShadow: '0 8px 0 #0c0a1a',
					transform: `scale(${pop})`,
					letterSpacing: '-0.01em',
				}}
			>
				{word.text}
			</div>
		</AbsoluteFill>
	);
};
