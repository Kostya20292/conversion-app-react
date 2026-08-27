import { describe, expect, it } from 'vitest';
import { REQUEST_SOURCES } from './request-source';

describe('REQUEST_SOURCES (ТЗ §3.2)', () => {
  it('marks a job as coming from ui or api', () => {
    expect([...REQUEST_SOURCES]).toEqual(['ui', 'api']);
  });
});
