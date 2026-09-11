import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { fibonacciWithMemoization, type FibonacciResult } from './utils/fibonacci'
import { TreeVisualizer } from './components/TreeVisualizer'
import { CacheDisplay } from './components/CacheDisplay'

function countNaiveCalls(n: number): number {
  if (n <= 1) return 1
  let twoBack = 1
  let oneBack = 1
  for (let current = 2; current <= n; current += 1) {
    const total = 1 + oneBack + twoBack
    twoBack = oneBack
    oneBack = total
  }
  return oneBack
}

function App() {
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<FibonacciResult | null>(null)
  const [error, setError] = useState('')
  const [stepIndex, setStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1200)
  const [pageMode, setPageMode] = useState<'classic' | 'lesson'>('classic')
  const resultsRef = useRef<HTMLElement>(null)

  const steps = useMemo(() => result?.steps ?? [], [result])
  const visibleSteps = useMemo(() => steps.slice(0, stepIndex + 1), [steps, stepIndex])
  const activeStep = stepIndex >= 0 ? steps[stepIndex] : undefined
  const memoizedCalls = steps.filter((step) => step.type === 'call').length
  const rootN = steps.find((step) => step.type === 'call' && step.parentCallId === undefined)?.n ?? 0
  const naiveCalls = result ? countNaiveCalls(rootN) : 0

  useEffect(() => {
    if (!isPlaying || steps.length === 0) return
    const timer = window.setTimeout(() => {
      if (stepIndex >= steps.length - 1) {
        setIsPlaying(false)
      } else {
        setStepIndex((current) => current + 1)
      }
    }, speed)
    return () => window.clearTimeout(timer)
  }, [isPlaying, speed, stepIndex, steps.length])

  const handleRun = () => {
    setError('')
    
    const n = parseInt(inputValue, 10)
    
    // Validate input
    if (isNaN(n)) {
      setError('Please enter a number')
      setResult(null)
      return
    }
    
    if (n < 0 || n > 20) {
      setError('Please enter a number between 0 and 20')
      setResult(null)
      return
    }
    
    // Execute the algorithm
    const fibResult = fibonacciWithMemoization(n)
    setResult(fibResult)
    setStepIndex(0)
    setIsPlaying(true)
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const explainStep = () => {
    if (!activeStep) return 'Choose an example and press Run to begin.'
    if (activeStep.type === 'call') {
      return `Calling fib(${activeStep.n}). First, we check whether this value is a base case or already stored.`
    }
    if (activeStep.type === 'base-case') {
      return `fib(${activeStep.n}) is a base case, so it returns ${activeStep.value} without making more calls.`
    }
    if (activeStep.type === 'cache-hit') {
      return `Cache hit! fib(${activeStep.n}) is already known, so we reuse ${activeStep.value} instead of rebuilding that branch.`
    }
    return `We finished fib(${activeStep.n}) = ${activeStep.value} and saved it in the memoization cache for later.`
  }

  const pseudocodeLine = activeStep?.type ?? 'call'

  const moveStep = (nextStep: number) => {
    setIsPlaying(false)
    setStepIndex(Math.max(0, Math.min(steps.length - 1, nextStep)))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRun()
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <p className="eyebrow">DP Visualizer</p>
        <h1>DP Visualizer</h1>
        <p className="subtitle">Understand dynamic programming one step at a time.</p>
      </header>

      <main className="app-main">
        <nav className="mode-tabs" aria-label="Visualizer modes">
          <button className={pageMode === 'classic' ? 'active' : ''} onClick={() => {
            setPageMode('classic')
            setIsPlaying(false)
          }}>
            <strong>Classic Tree</strong>
            <span>The original complete visualization</span>
          </button>
          <button className={pageMode === 'lesson' ? 'active' : ''} onClick={() => setPageMode('lesson')}>
            <strong>Animated Lesson</strong>
            <span>Guided 3D playback with live memory</span>
          </button>
        </nav>

        <div className="setup-grid">
          <section className="panel algorithm-panel" aria-label="Algorithm information">
            <div className="algorithm-mark" aria-hidden="true">ƒ</div>
            <div className="algorithm-copy">
              <span className="field-label">Algorithm</span>
              <div className="algorithm-name">Fibonacci</div>
              <p>Top-down recursion with memoization</p>
            </div>
          </section>

          <section className="panel input-panel" aria-label="Input controls">
            <label htmlFor="n-input" className="field-label">Input n</label>
            <div className="input-wrapper">
              <input id="n-input" type="number" placeholder="Enter a number (0-20)" min={0} max={20} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={handleKeyPress} />
              <button className="run-button" onClick={handleRun}>Run</button>
            </div>
            {error && <div className="error-message">{error}</div>}
          </section>
        </div>

        {pageMode === 'classic' ? (
          <section className="visual-grid" aria-label="Classic visualization panels" ref={resultsRef}>
            <article className="panel visual-panel">
              <h2>Recursive Call Tree</h2>
              {result ? (
                <TreeVisualizer steps={result.steps} viewMode="2d" />
              ) : (
                <div className="empty-panel" aria-label="Recursive Call Tree empty visualization" />
              )}
            </article>
            <article className="panel visual-panel">
              <h2>Memoization Cache</h2>
              {result ? (
                <CacheDisplay steps={result.steps} />
              ) : (
                <div className="empty-panel" aria-label="Memoization Cache empty visualization" />
              )}
            </article>
          </section>
        ) : (
        <>
        <section className="learning-path" aria-label="Why memoization matters" ref={resultsRef}>
          <div className="learning-copy">
            <span className="section-kicker">Why memoization?</span>
            <h2>Start with recursion. Then remove the repeated work.</h2>
            <p>Fibonacci naturally branches into smaller versions of the same problem. The cache remembers answers, so repeated branches can stop immediately.</p>
          </div>
          <div className="comparison-strip">
            <div><span>1 · Naïve recursion</span><strong>{result ? naiveCalls : '—'} calls</strong><small>Recalculates the same values</small></div>
            <i aria-hidden="true">→</i>
            <div className="optimized"><span>2 · Add memory</span><strong>{result ? memoizedCalls : '—'} calls</strong><small>{result ? `${Math.max(0, naiveCalls - memoizedCalls)} calls avoided` : 'Cache removes duplicate work'}</small></div>
            <i aria-hidden="true">→</i>
            <div><span>3 · Watch reuse</span><strong>{result ? result.cacheHits : '—'} hits</strong><small>Honey nodes stop expanding</small></div>
          </div>
        </section>
        <section className="lesson-workspace" aria-label="Animated lesson panels">
          <article className="panel visual-panel lesson-tree-panel">
            <div className="visual-heading">
              <div>
                <span className="section-kicker">Live 3D lesson</span>
                <h2>Memoized Call Tree</h2>
              </div>
              <span className="live-badge"><i /> 3D view</span>
            </div>
            {result ? (
              <TreeVisualizer steps={visibleSteps} activeCallId={activeStep?.callId} viewMode="3d" />
            ) : (
              <div className="empty-panel" aria-label="Recursive Call Tree empty visualization" />
            )}

            <div className="lesson-controls" aria-label="Animation controls">
              <div className="control-buttons">
                <button onClick={() => moveStep(0)} disabled={!result}>Restart</button>
                <button onClick={() => moveStep(stepIndex - 1)} disabled={!result || stepIndex <= 0}>Previous</button>
                <button className="play-button" onClick={() => {
                  if (stepIndex >= steps.length - 1) setStepIndex(0)
                  setIsPlaying((playing) => !playing)
                }} disabled={!result}>{isPlaying ? 'Pause' : 'Play'}</button>
                <button onClick={() => moveStep(stepIndex + 1)} disabled={!result || stepIndex >= steps.length - 1}>Next</button>
              </div>
              <label className="speed-control">Speed
                <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                  <option value={1800}>Slow</option>
                  <option value={1200}>Normal</option>
                  <option value={700}>Fast</option>
                </select>
              </label>
              <div className="timeline-row">
                <input aria-label="Execution timeline" type="range" min={0} max={Math.max(0, steps.length - 1)} value={Math.max(0, stepIndex)} onChange={(event) => moveStep(Number(event.target.value))} disabled={!result} />
                <span>{result ? `${stepIndex + 1} / ${steps.length}` : '0 / 0'}</span>
              </div>
            </div>
          </article>

          <aside className="lesson-sidebar">
            <article className="panel live-cache-panel">
              <div className="cache-heading">
                <div><span className="section-kicker">Memory bank</span><h2>Live Cache</h2></div>
                <span className={`cache-status cache-status-${activeStep?.type ?? 'idle'}`}>
                  {activeStep?.type === 'cache-store' ? 'Saving value' : activeStep?.type === 'cache-hit' ? 'Reusing value' : 'Watching calls'}
                </span>
              </div>
              {result ? <CacheDisplay steps={visibleSteps} activeStep={activeStep} /> : <div className="cache-empty">Cached results will appear here.</div>}
              <div className="cache-legend"><span><i className="store-dot" /> Value moves in</span><span><i className="hit-dot" /> Value moves out</span></div>
            </article>

            <article className="panel teaching-panel" aria-live="polite">
              <div className={`step-icon step-icon-${activeStep?.type ?? 'call'}`}>{activeStep ? stepIndex + 1 : '?'}</div>
              <div>
                <span className="section-kicker">What is happening?</span>
                <p>{explainStep()}</p>
              </div>
              <div className="pseudocode" aria-label="Fibonacci pseudocode">
                <code className={pseudocodeLine === 'call' ? 'active-line' : ''}>fib(n)</code>
                <code className={pseudocodeLine === 'base-case' ? 'active-line' : ''}>if n ≤ 1: return n</code>
                <code className={pseudocodeLine === 'cache-hit' ? 'active-line' : ''}>if cached: reuse value</code>
                <code className={pseudocodeLine === 'cache-store' ? 'active-line' : ''}>cache[n] = fib(n-1) + fib(n-2)</code>
              </div>
            </article>

            <article className="panel compact-stats" aria-label="Execution statistics">
              <h2>Execution Stats</h2>
              <div className="stats-list">
                <div className="stat-item"><span>Result</span><strong>{result ? result.result : '—'}</strong></div>
                <div className="stat-item"><span>Steps</span><strong>{result ? result.steps.length : '—'}</strong></div>
                <div className="stat-item"><span>Cache Hits</span><strong>{result ? result.cacheHits : '—'}</strong></div>
              </div>
            </article>
          </aside>
        </section>
        </>
        )}

        {pageMode === 'classic' && <section className="panel stats-panel" aria-label="Execution statistics">
          <h2>Execution Stats</h2>
          <div className="stats-list">
            <div className="stat-item">
              <span>Result</span>
              <strong>{result ? result.result : '—'}</strong>
            </div>
            <div className="stat-item">
              <span>Steps Recorded</span>
              <strong>{result ? result.steps.length : '—'}</strong>
            </div>
            <div className="stat-item">
              <span>Cache Hits</span>
              <strong>{result ? result.cacheHits : '—'}</strong>
            </div>
          </div>
        </section>}

        <section className="panel impact-panel" aria-labelledby="impact-title">
          <div className="impact-intro">
            <span className="section-kicker">Beyond Fibonacci</span>
            <h2 id="impact-title">You use dynamic programming more often than you realize.</h2>
            <p>Memoization is a simple idea with a big payoff: remember work you have already completed, then reuse it. Fibonacci makes that pattern easy to see, but the same thinking powers tools and decisions we encounter every day.</p>
          </div>
          <div className="impact-examples">
            <article><span className="impact-icon" aria-hidden="true">↗</span><div><h3>Routes &amp; travel</h3><p>Navigation apps reuse solutions to smaller route problems to find an efficient trip.</p></div></article>
            <article><span className="impact-icon" aria-hidden="true">⌨</span><div><h3>Typing &amp; search</h3><p>Spell-checking and text comparison build answers from previously solved subproblems.</p></div></article>
            <article><span className="impact-icon" aria-hidden="true">▦</span><div><h3>Planning resources</h3><p>Scheduling and budgeting compare choices while avoiding the same calculations twice.</p></div></article>
            <article><span className="impact-icon" aria-hidden="true">▶</span><div><h3>Media &amp; recommendations</h3><p>Modern systems cache repeated results so familiar content can load and respond faster.</p></div></article>
          </div>
          <p className="impact-takeaway"><strong>The core habit:</strong> before solving a problem again, ask whether you already know the answer.</p>
        </section>
      </main>
    </div>
  )
}

export default App
