import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdown } from '../src/lib/markdown.ts';

test('code block keeps spacing and escapes html', () => {
  const h = markdown('Try this:\n```\nif x:\n    print("<b>")\n```\nDone');
  assert.match(h, /<pre class="lesson-code"><code>if x:\n    print\(&quot;&lt;b&gt;&quot;\)<\/code><\/pre>/);
  assert.match(h, /<p>Try this:<\/p>/);
  assert.match(h, /<p>Done<\/p>/);
});

test('unclosed code block still shows', () => {
  assert.match(markdown('```\nspeed = 50'), /<pre class="lesson-code"><code>speed = 50<\/code><\/pre>/);
});

test('stars inside code spans are not bold or italic', () => {
  const h = markdown('- `**` power: `2 ** 3` gives 8\n- `*` multiply: `4 * 2`');
  assert.match(h, /<li><code>\*\*<\/code> power: <code>2 \*\* 3<\/code> gives 8<\/li>/);
  assert.match(h, /<li><code>\*<\/code> multiply: <code>4 \* 2<\/code><\/li>/);
  assert.ok(!h.includes('<strong>') && !h.includes('<em>'));
});
