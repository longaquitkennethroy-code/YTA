import React, {useEffect, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Audio, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/poppins/800.css';
import {Scene} from '../../scene/Scene';
import {FPS, raiseDirection} from './direction';
import {WORDS} from './words';

/** Words that carry the idea get the highlight colour. */
const KEY = /^(money|brain|habit|raise|raises|couch|tv|car|cheap|nicer|double|zero|saved|lifestyle|creep|normal|coworker|retired|forty-five|still)$/i;
/** Short words ride along with the next word, like the reference's captions. */
const TINY = /^(a|an|the|to|at|it|in|of|so|and|you|your|he|is|off)$/i;

type Chunk = {text: string; from: number; to: number; key: boolean};
const CHUNKS: Chunk[] = (() => {
	const out: Chunk[] = [];
	for (let i = 0; i < WORDS.length; i++) {
		const w = WORDS[i];
		const bare = w.text.replace(/[^A-Za-z'-]/g, '');
		const next = WORDS[i + 1];
		if (TINY.test(bare) && next && next.from - w.to < 0.15 && !/[.,]$/.test(w.text)) {
			out.push({text: `${w.text} ${next.text}`, from: w.from, to: next.to, key: KEY.test(next.text.replace(/[^A-Za-z'-]/g, ''))});
			i++;
		} else out.push({text: w.text, from: w.from, to: w.to, key: KEY.test(bare)});
	}
	// each caption stays up until the next one starts (no flicker between words)
	for (let i = 0; i < out.length - 1; i++) if (out[i + 1].from - out[i].to < 0.5) out[i].to = out[i + 1].from;
	return out;
})();

const Captions: React.FC = () => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	const c = CHUNKS.find((x) => t >= x.from && t < x.to);
	if (!c) return null;
	const pop = interpolate(t - c.from, [0, 0.07, 0.17], [0.8, 1.08, 1], {extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', top: '68%'}}>
			<div
				style={{
					fontFamily: 'Poppins, system-ui, sans-serif',
					fontWeight: 800,
					fontSize: 84,
					color: c.key ? '#ffd43b' : 'white',
					WebkitTextStroke: '15px #0c0a1a',
					paintOrder: 'stroke fill',
					textShadow: '0 6px 0 #0c0a1a',
					transform: `scale(${pop}) rotate(${c.key ? -2 : 0}deg)`,
					letterSpacing: '-0.01em',
				}}
			>
				{c.text.replace(/[.,]$/, '')}
			</div>
		</AbsoluteFill>
	);
};

export const RaiseShort: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const mood = raiseDirection.mood(frame);
	const [handle] = useState(() => delayRender('fonts'));
	useEffect(() => {
		document.fonts.load('800 84px Poppins').finally(() => continueRender(handle));
	}, [handle]);

	return (
		<AbsoluteFill style={{backgroundColor: '#0c0a1a'}}>
			<ThreeCanvas width={width} height={height} flat shadows gl={{antialias: true}} camera={{fov: 50, near: 0.1, far: 60}}>
				<Scene direction={raiseDirection} />
			</ThreeCanvas>
			<AbsoluteFill
				style={{
					background: `linear-gradient(180deg, ${mood.gradeTop} 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 60%, ${mood.gradeBottom} 100%)`,
					mixBlendMode: 'multiply',
				}}
			/>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(20,12,40,0) 55%, rgba(20,12,40,0.3) 100%)'}} />
			<Captions />
			<Audio src={staticFile('voice-01.mp3')} />
		</AbsoluteFill>
	);
};
