import {RenderInternals} from '@remotion/renderer';
import {expect, test} from 'bun:test';
import {readFromNode} from '../from-node';

// If this is fixed we can unflag https://github.com/oven-sh/bun/issues/10890
if (process.platform !== 'win32') {
	test('Parse Big Buck bunny', async () => {
		const data = await readFromNode(RenderInternals.exampleVideos.bigBuckBunny);
		expect(data.segments).toEqual([
			{
				offset: 0,
				boxSize: 32,
				type: 'ftyp-box',
				majorBrand: 'isom',
				minorVersion: 512,
				compatibleBrands: ['isom', 'iso2', 'avc1', 'mp41'],
			},
			{
				offset: 32,
				boxSize: 8,
				boxType: 'free',
				type: 'regular-box',
				children: [],
			},
		]);
	});

	test('Parse an iPhone video', async () => {
		const data = await readFromNode(RenderInternals.exampleVideos.iphonevideo);
		expect(data.segments).toEqual([
			{
				boxSize: 20,
				type: 'ftyp-box',
				majorBrand: 'qt',
				minorVersion: 0,
				compatibleBrands: ['qt'],
				offset: 0,
			},
			{
				type: 'regular-box',
				boxType: 'wide',
				boxSize: 8,
				offset: 20,
				children: [],
			},
		]);
	});

	test('Parse framer', async () => {
		const parsed = await readFromNode(
			RenderInternals.exampleVideos.framerWithoutFileExtension,
		);
		expect(parsed.segments).toEqual([
			{
				offset: 0,
				boxSize: 32,
				compatibleBrands: ['isom', 'iso2', 'avc1', 'mp41'],
				majorBrand: 'isom',
				minorVersion: 512,
				type: 'ftyp-box',
			},
			{
				offset: 32,
				boxSize: 8,
				boxType: 'free',
				type: 'regular-box',
				children: [],
			},
		]);
	});

	test('Parse a full video', async () => {
		const data = await readFromNode(RenderInternals.exampleVideos.framer24fps);
		if (!data) throw new Error('No data');

		const [first, second, third] = data.segments;

		if (first.type !== 'ftyp-box') {
			throw new Error('Expected ftyp-box');
		}

		expect(first).toEqual({
			offset: 0,
			boxSize: 32,
			type: 'ftyp-box',
			majorBrand: 'isom',
			minorVersion: 512,
			compatibleBrands: ['isom', 'iso2', 'avc1', 'mp41'],
		});
		expect(second).toEqual({
			offset: 32,
			boxType: 'free',
			boxSize: 8,
			type: 'regular-box',
			children: [],
		});
		expect(third).toEqual({
			offset: 40,
			boxSize: 57014,
			boxType: 'mdat',
			children: [],
			type: 'regular-box',
		});
	});
}
