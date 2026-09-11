/**
 * Represents a single step recorded during Fibonacci execution.
 * This is used for visualization and analysis of the algorithm's behavior.
 */
export type ExecutionStep = {
  type: 'call' | 'base-case' | 'cache-hit' | 'cache-store'
  n: number
  value?: number
  stepNumber: number
  callId?: number
  parentCallId?: number
}

/**
 * Result of executing the Fibonacci algorithm with memoization.
 * Contains both the final result and a complete record of all steps taken.
 */
export type FibonacciResult = {
  result: number
  steps: ExecutionStep[]
  cacheHits: number
}

/**
 * Computes the nth Fibonacci number using memoization.
 * Records each step: function calls, base cases, cache hits, and cache stores.
 * Also tracks call hierarchy for visualization.
 *
 * Runs in O(n) time and O(n) space.
 * Uses memoization to avoid recomputing the same values.
 *
 * @param n - The Fibonacci index to compute (0 to 20)
 * @returns An object containing the result, execution steps, and cache hit count
 */
export function fibonacciWithMemoization(n: number): FibonacciResult {
  const memo: Map<number, number> = new Map()
  const steps: ExecutionStep[] = []
  let stepCounter = 0
  let callIdCounter = 0
  let cacheHits = 0
  const callStack: number[] = [] // Stack of call IDs to track parent-child relationships

  function fib(current: number): number {
    const currentCallId = callIdCounter++
    const parentCallId = callStack.length > 0 ? callStack[callStack.length - 1] : undefined
    
    // Record this function call
    steps.push({
      type: 'call',
      n: current,
      stepNumber: stepCounter++,
      callId: currentCallId,
      parentCallId,
    })

    callStack.push(currentCallId)

    // Base cases: fib(0) = 0, fib(1) = 1
    if (current === 0 || current === 1) {
      steps.push({
        type: 'base-case',
        n: current,
        value: current,
        stepNumber: stepCounter++,
        callId: currentCallId,
        parentCallId,
      })
      callStack.pop()
      return current
    }

    // Check if we already computed this value
    if (memo.has(current)) {
      cacheHits++
      steps.push({
        type: 'cache-hit',
        n: current,
        value: memo.get(current)!,
        stepNumber: stepCounter++,
        callId: currentCallId,
        parentCallId,
      })
      callStack.pop()
      return memo.get(current)!
    }

    // Recursively compute fib(n-1) + fib(n-2)
    const result = fib(current - 1) + fib(current - 2)

    // Store the result in the cache
    memo.set(current, result)
    steps.push({
      type: 'cache-store',
      n: current,
      value: result,
      stepNumber: stepCounter++,
      callId: currentCallId,
      parentCallId,
    })

    callStack.pop()
    return result
  }

  const result = fib(n)

  return {
    result,
    steps,
    cacheHits,
  }
}
