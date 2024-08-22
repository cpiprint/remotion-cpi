import type {VideoSample, VideoTrack} from '@remotion/media-parser';
import {decoderWaitForDequeue} from './wait-for-dequeue';

export const createDecoder = async ({
	track,
	onFrame,
}: {
	track: VideoTrack;
	onFrame: (frame: VideoFrame) => void;
}) => {
	if (typeof VideoDecoder === 'undefined') {
		return null;
	}

	const {supported} = await VideoDecoder.isConfigSupported(track);

	if (!supported) {
		return null;
	}

	const videoDecoder = new VideoDecoder({
		output(inputFrame) {
			onFrame(inputFrame);
		},
		error(error) {
			console.error(error);
		},
	});

	videoDecoder.configure(track);

	return {
		processSample: async (sample: VideoSample) => {
			if (videoDecoder.state === 'closed') {
				return;
			}

			await decoderWaitForDequeue(videoDecoder);

			videoDecoder.decode(new EncodedVideoChunk(sample));
		},
	};
};
