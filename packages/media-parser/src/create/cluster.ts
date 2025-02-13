import {getVariableInt} from '../boxes/webm/ebml';
import {matroskaToHex} from '../boxes/webm/make-header';
import {matroskaElements} from '../boxes/webm/segments/all-segments';
import type {AudioOrVideoSample} from '../webcodec-sample-types';
import type {Writer} from '../writers/writer';
import {
	CLUSTER_MIN_VINT_WIDTH,
	createClusterSegment,
	makeSimpleBlock,
} from './cluster-segment';
import {CREATE_TIME_SCALE} from './timescale';

const maxClusterTimestamp = 2 ** 15;

export const timestampToClusterTimestamp = (timestamp: number) => {
	return Math.round((timestamp / CREATE_TIME_SCALE) * 1000);
};

export const makeCluster = async (w: Writer, timestamp: number) => {
	const cluster = createClusterSegment(timestampToClusterTimestamp(timestamp));
	const clusterVIntPosition =
		w.getWrittenByteCount() +
		cluster.offsets.offset +
		matroskaToHex(matroskaElements.Cluster).byteLength;

	let clusterSize =
		cluster.bytes.byteLength -
		matroskaToHex(matroskaElements.Cluster).byteLength -
		CLUSTER_MIN_VINT_WIDTH;
	await w.write(cluster.bytes);

	const addSample = async (chunk: AudioOrVideoSample, trackNumber: number) => {
		const timecodeRelativeToCluster =
			timestampToClusterTimestamp(chunk.timestamp) -
			timestampToClusterTimestamp(timestamp);
		if (timecodeRelativeToCluster < 0) {
			throw new Error(
				`timecodeRelativeToCluster is negative (track ${trackNumber})`,
			);
		}

		if (timecodeRelativeToCluster > maxClusterTimestamp) {
			throw new Error(
				`timecodeRelativeToCluster is too big: ${timecodeRelativeToCluster} > ${maxClusterTimestamp}`,
			);
		}

		const keyframe = chunk.type === 'key';
		const simpleBlock = makeSimpleBlock({
			bytes: chunk.data,
			invisible: false,
			keyframe,
			lacing: 0,
			trackNumber,
			timecodeRelativeToCluster,
		});

		clusterSize += simpleBlock.byteLength;
		await w.updateDataAt(
			clusterVIntPosition,
			getVariableInt(clusterSize, CLUSTER_MIN_VINT_WIDTH),
		);
		await w.write(simpleBlock);
		return {timecodeRelativeToCluster};
	};

	const shouldMakeNewCluster = ({
		isVideo,
		keyframe,
		newT,
	}: {
		newT: number;
		keyframe: boolean;
		isVideo: boolean;
	}) => {
		const newTimestamp = timestampToClusterTimestamp(newT);
		const oldTimestamp = timestampToClusterTimestamp(timestamp);

		return newTimestamp - oldTimestamp >= 2000 && keyframe && isVideo;
	};

	return {addSample, shouldMakeNewCluster};
};
