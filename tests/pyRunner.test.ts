import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inputsFromOutput, looksLikePython, withInputHeader } from '../src/lib/pyRunner.ts';

test('hand-in output keeps the inputs the learner typed, and they can be read back', () => {
  const out = withInputHeader('30\nyes\n', 'Temperature: 30\nMove to cooler area\n');
  assert.equal(out, 'Input typed (one answer per line):\n30\nyes\n-----\nTemperature: 30\nMove to cooler area\n');
  assert.equal(inputsFromOutput(out), '30\nyes');
});
test('no inputs: output is unchanged and nothing is read back', () => {
  assert.equal(withInputHeader('', 'Hello\n'), 'Hello\n');
  assert.equal(inputsFromOutput('Hello\n'), null);
});
test('one blank input line is kept', () => {
  assert.equal(inputsFromOutput(withInputHeader('5\n\n7', 'x')), '5\n\n7');
});
test('looksLikePython tells code from ordinary answers', () => {
  assert.ok(looksLikePython('name = input("Name: ")\nprint("Hi", name)'));
  assert.ok(looksLikePython('for i in range(3):\n    print(i)'));
  assert.ok(looksLikePython('if battery < 20:\n    print("Low")'));
  assert.ok(!looksLikePython('1. EduBot helps one teacher with a big class.\n2. Faster feedback for learners.'));
  assert.ok(!looksLikePython('If the robot is wrong, the designer is responsible.'));
});
