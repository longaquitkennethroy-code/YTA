export const FPS = 30;

/** Shot boundaries, in frames. */
export const SHOT_B = 150;
export const SHOT_C = 270;
export const DURATION = 390;

export type Word = {text: string; from: number; to: number; who: 'officer' | 'civilian'};

/** Placeholder dialogue: swap for your script (and add a voice-over track). */
export const WORDS: Word[] = [
	{text: 'So...', from: 16, to: 40, who: 'officer'},
	{text: 'who', from: 44, to: 55, who: 'officer'},
	{text: 'moved', from: 55, to: 68, who: 'officer'},
	{text: 'the', from: 68, to: 76, who: 'officer'},
	{text: 'furniture?', from: 76, to: 104, who: 'officer'},
	{text: 'It', from: 162, to: 170, who: 'civilian'},
	{text: 'was', from: 170, to: 179, who: 'civilian'},
	{text: 'like', from: 179, to: 189, who: 'civilian'},
	{text: 'that', from: 189, to: 202, who: 'civilian'},
	{text: 'when', from: 206, to: 214, who: 'civilian'},
	{text: 'I', from: 214, to: 220, who: 'civilian'},
	{text: 'got', from: 220, to: 230, who: 'civilian'},
	{text: 'here.', from: 230, to: 254, who: 'civilian'},
	{text: '...Sure', from: 338, to: 356, who: 'officer'},
	{text: 'it', from: 356, to: 364, who: 'officer'},
	{text: 'was.', from: 364, to: 386, who: 'officer'},
];

/** A quick hit on the first frames of each word: speech drives the whole body. */
export const accent = (frame: number, who: Word['who']) =>
	WORDS.reduce((m, w) => (w.who === who ? Math.max(m, Math.max(0, 1 - Math.abs(frame - w.from - 1.5) / 3.5)) : m), 0);

/** 0..1 mouth-open amount for a speaker. */
export const talk = (frame: number, who: Word['who']) => {
	for (const w of WORDS) {
		if (w.who === who && frame >= w.from && frame < w.to) {
			// Mouth shapes are swapped and held for three frames, not blended:
			// that is how the lip-sync in the reference reads.
			const shapes = [1, 0.2, 0.6, 0.9, 0.05, 0.75, 0.35];
			const step = Math.floor(frame / 3);
			return shapes[(step * 5 + w.from) % shapes.length];
		}
	}
	return 0;
};
