import {
  handleWhen,
  retry,
  circuitBreaker,
  wrap,
  ExponentialBackoff,
  ConsecutiveBreaker,
} from 'cockatiel';

/**
 * Creates a composed resilience policy (Circuit Breaker + Retry) for any
 * operation that needs transient-error handling.
 *
 * @param isTransient - Predicate that returns true for retryable errors.
 * @param isFailure - Predicate that returns true for errors the circuit breaker should track.
 * @param options - Tuning parameters for retry and circuit breaker.
 */
export function createResiliencePolicy(
  isTransient: (err: Error) => boolean,
  isFailure: (err: Error) => boolean,
  options: {
    maxRetryAttempts?: number;
    initialRetryDelay?: number;
    consecutiveFailures?: number;
    halfOpenAfter?: number;
  } = {},
) {
  const {
    maxRetryAttempts = 3,
    initialRetryDelay = 500,
    consecutiveFailures = 5,
    halfOpenAfter = 60_000,
  } = options;

  const retryPolicy = retry(handleWhen(isTransient), {
    maxAttempts: maxRetryAttempts,
    backoff: new ExponentialBackoff({ initialDelay: initialRetryDelay }),
  });

  const cbPolicy = circuitBreaker(handleWhen(isFailure), {
    breaker: new ConsecutiveBreaker(consecutiveFailures),
    halfOpenAfter,
  });

  cbPolicy.onBreak(() =>
    console.warn('[CircuitBreaker] OPEN — requests blocked.'),
  );
  cbPolicy.onHalfOpen(() =>
    console.warn('[CircuitBreaker] HALF_OPEN — probe allowed.'),
  );
  cbPolicy.onReset(() =>
    console.info('[CircuitBreaker] CLOSED — circuit restored.'),
  );

  return wrap(cbPolicy, retryPolicy);
}
