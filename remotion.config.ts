import {Config} from '@remotion/cli/config';

// WebGL is required for Three.js. "angle" uses the GPU on desktop machines;
// set REMOTION_GL=swangle on GPU-less Linux boxes / CI.
Config.setChromiumOpenGlRenderer(
	(process.env.REMOTION_GL as 'angle' | 'swangle' | undefined) ?? 'angle',
);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
