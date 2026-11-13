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

/** 0..1 mouth-open amount for a speaker: one pulse per word, two for long words. */
export const talk = (frame: number, who: Word['who']) => {
	for (const w of WORDS) {
		if (w.who === who && frame >= w.from && frame < w.to) {
			const p = (frame - w.from) / (w.to - w.from);
			const syllables = w.text.length > 6 ? 3 : w.text.length > 4 ? 2 : 1;
			return 0.25 + 0.75 * Math.abs(Math.sin(p * Math.PI * syllables));
		}
	}
	return 0;
};
