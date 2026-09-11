import type { ExecutionStep } from '../utils/fibonacci'
import './CacheDisplay.css'

type CacheDisplayProps = {
  steps: ExecutionStep[]
  activeStep?: ExecutionStep
}

/**
 * Extracts cached Fibonacci values from execution steps.
 * Returns a sorted map of n → fib(n) values that were stored in the cache.
 */
function extractCacheValues(steps: ExecutionStep[]): Array<[number, number]> {
  const cacheMap = new Map<number, number>()

  steps.forEach((step) => {
    // Only include cache-store steps, which represent values actually computed and stored
    if (step.type === 'cache-store' && step.value !== undefined) {
      cacheMap.set(step.n, step.value)
    }
  })

  // Sort by n value and return as array of [n, value] pairs
  return Array.from(cacheMap.entries()).sort((a, b) => a[0] - b[0])
}

export function CacheDisplay({ steps, activeStep }: CacheDisplayProps) {
  if (steps.length === 0) {
    return <div className="cache-empty">Run an algorithm to see the cache.</div>
  }

  const cacheValues = extractCacheValues(steps)

  if (cacheValues.length === 0) {
    return <div className="cache-empty">No cached values.</div>
  }

  return (
    <div className="cache-display">
      <div className="cache-grid">
        {cacheValues.map(([n, value]) => (
          <div key={n} className={`cache-entry${activeStep?.n === n ? ` cache-entry-${activeStep.type}` : ''}`}>
            <div className="cache-key">fib({n})</div>
            <div className="cache-value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
