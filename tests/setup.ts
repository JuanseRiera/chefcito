import { config } from 'dotenv';
import { beforeEach } from 'vitest';
import { Logger } from '@/lib/infra/Logger';

// Load .env.test before any test module initializes (overrides existing vars)
config({ path: '.env.test', override: true });

// Reset Logger singleton's correlationId between tests to prevent state leakage.
// The Logger is a singleton that stores correlationId in memory; without this reset,
// a correlationId set in one test would bleed into the next.
beforeEach(() => {
  // setCorrelationId only accepts string, so we cast to reset to undefined
  Logger.getInstance().setCorrelationId(undefined as unknown as string);
});
