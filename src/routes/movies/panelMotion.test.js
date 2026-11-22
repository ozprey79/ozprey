import test from 'node:test';
import assert from 'node:assert/strict';
import { panelDrift, elasticSnap } from './panelMotion.js';

test('incoming panels overlap the outgoing panel by exactly 33% at the handoff', () => {
	const width = 1200;
	for (const index of [0, 1, 2, 3]) {
		for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
			const scroll = (index + progress) * width;
			const outgoingRight = (index + 1) * width - scroll + panelDrift(scroll, index, width);
			const incomingLeft = (index + 1) * width - scroll + panelDrift(scroll, index + 1, width);
			assert.ok(Math.abs(outgoingRight - incomingLeft - progress * width * 0.33) < 0.00001);
		}
	}
});

test('panels ahead stay in place and previous panels stop drifting after the handoff', () => {
	assert.equal(panelDrift(400, 1, 1000), 0);
	assert.equal(panelDrift(2000, 0, 1000), 330);
	assert.equal(panelDrift(0, 0, 0), 0);
});

test('elastic snaps overshoot gently and land exactly on the panel', () => {
	assert.equal(elasticSnap(0), 0);
	assert.equal(elasticSnap(1), 1);
	const samples = Array.from({ length: 101 }, (_, index) => elasticSnap(index / 100));
	assert.ok(Math.max(...samples) > 1.05);
	assert.ok(Math.max(...samples) < 1.15);
	assert.ok(Math.min(...samples) >= 0);
	assert.ok(Math.abs(elasticSnap(0.99) - 1) < 0.001);
});
