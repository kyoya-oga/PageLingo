// Placeholder test; install Vitest to run.
// Example: npm i -D vitest @types/node typescript ts-node

import { describe, it, expect } from 'vitest';
import { NoopTranslator } from '../../src/app/main.js';

describe('NoopTranslator', () => {
  it('returns passthrough translation', async () => {
    const t = new NoopTranslator();
    const res = await t.translate('Hello', { target: 'ja' });
    expect(res.content).toBe('Hello');
    expect(res.target).toBe('ja');
  });
});

