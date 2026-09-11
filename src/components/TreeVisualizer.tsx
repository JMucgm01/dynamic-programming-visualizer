import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ExecutionStep } from '../utils/fibonacci'
import './TreeVisualizer.css'

type TreeNode = {
  callId: number
  n: number
  type: 'call' | 'base-case' | 'cache-hit'
  value?: number
  children: TreeNode[]
}

type LayoutNode = {
  callId: number
  n: number
  type: 'call' | 'base-case' | 'cache-hit'
  value?: number
  children: LayoutNode[]
  x: number
  y: number
  width: number
}

type TreeVisualizerProps = {
  steps: ExecutionStep[]
  activeCallId?: number
  viewMode?: '2d' | '3d'
}

const NODE_WIDTH = 64
const NODE_HEIGHT = 42
const VERTICAL_SPACING = 70
const HORIZONTAL_SPACING = 10
const TREE_PADDING = 18

/**
 * Builds a tree structure from execution steps.
 * Each 'call' step becomes a node, with children being calls made from that call.
 */
function buildTree(steps: ExecutionStep[]): TreeNode | null {
  if (steps.length === 0) return null

  // Find the root call (first call step with no parent)
  const callSteps = steps.filter((s) => s.type === 'call')
  if (callSteps.length === 0) return null

  const root = callSteps[0]
  const nodeMap = new Map<number, TreeNode>()
  const childrenMap = new Map<number | undefined, number[]>()

  // Group call steps by parent
  callSteps.forEach((step) => {
    const parentId = step.parentCallId
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, [])
    }
    childrenMap.get(parentId)!.push(step.callId!)
  })

  // Determine the type of each call by looking at subsequent steps
  callSteps.forEach((callStep) => {
    const callId = callStep.callId!
    let nodeType: 'call' | 'base-case' | 'cache-hit' = 'call'
    let value: number | undefined

    // Find the result step for this call
    const resultStep = steps.find(
      (s) => s.callId === callId && (s.type === 'base-case' || s.type === 'cache-hit' || s.type === 'cache-store')
    )

    if (resultStep) {
      if (resultStep.type === 'base-case') {
        nodeType = 'base-case'
      } else if (resultStep.type === 'cache-hit') {
        nodeType = 'cache-hit'
      }
      value = resultStep.value
    }

    nodeMap.set(callId, {
      callId,
      n: callStep.n,
      type: nodeType,
      value,
      children: [],
    })
  })

  // Build the tree structure
  nodeMap.forEach((node) => {
    const childIds = childrenMap.get(node.callId) || []
    node.children = childIds
      .map((id) => nodeMap.get(id))
      .filter((child): child is TreeNode => child !== undefined)
  })

  return nodeMap.get(root.callId!)!
}

/**
 * Calculate the width needed for a subtree.
 * Used for positioning nodes in a top-down layout.
 */
function calculateWidth(node: TreeNode): number {
  if (node.children.length === 0) {
    return NODE_WIDTH
  }
  const childrenWidth = node.children.reduce((sum, child) => sum + calculateWidth(child), 0)
  // Add spacing between children
  const spacingWidth = Math.max(0, (node.children.length - 1) * HORIZONTAL_SPACING)
  return Math.max(NODE_WIDTH, childrenWidth + spacingWidth)
}

/**
 * Calculate the bounding box of a tree starting at (0, 0).
 */
function calculateBounds(node: LayoutNode): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = node.x
  let maxX = node.x + NODE_WIDTH
  let minY = node.y
  let maxY = node.y + NODE_HEIGHT

  node.children.forEach((child) => {
    const childBounds = calculateBounds(child)
    minX = Math.min(minX, childBounds.minX)
    maxX = Math.max(maxX, childBounds.maxX)
    minY = Math.min(minY, childBounds.minY)
    maxY = Math.max(maxY, childBounds.maxY)
  })

  return { minX, maxX, minY, maxY }
}

/**
 * Translate all nodes in the tree by an offset.
 */
function translateTree(node: LayoutNode, offsetX: number, offsetY: number): LayoutNode {
  return {
    ...node,
    x: node.x + offsetX,
    y: node.y + offsetY,
    children: node.children.map((child) => translateTree(child, offsetX, offsetY)),
  }
}

/**
 * Assign (x, y) positions to each node in a top-down tree layout.
 * This performs the initial layout at x=0, y=0.
 */
function layoutTreeInitial(node: TreeNode, x: number, y: number): LayoutNode {
  if (node.children.length === 0) {
    // Leaf node
    return {
      callId: node.callId,
      n: node.n,
      type: node.type,
      value: node.value,
      children: [],
      x,
      y,
      width: NODE_WIDTH,
    }
  }

  // Layout children first
  let childX = x
  const layoutChildren: LayoutNode[] = []

  node.children.forEach((child) => {
    const childWidth = calculateWidth(child)
    const layoutChild = layoutTreeInitial(child, childX, y + VERTICAL_SPACING)
    layoutChildren.push(layoutChild)
    childX += childWidth + HORIZONTAL_SPACING
  })

  // Center this node above its children
  const firstChildCenterX = layoutChildren[0]!.x + NODE_WIDTH / 2
  const lastChildCenterX = layoutChildren[layoutChildren.length - 1]!.x + NODE_WIDTH / 2
  const childrenSpanCenter = (firstChildCenterX + lastChildCenterX) / 2

  return {
    callId: node.callId,
    n: node.n,
    type: node.type,
    value: node.value,
    children: layoutChildren,
    x: childrenSpanCenter - NODE_WIDTH / 2,
    y,
    width: calculateWidth(node),
  }
}

type SVGNodeProps = {
  node: LayoutNode
  activeCallId?: number
}

function SVGNode({ node, activeCallId }: SVGNodeProps) {
  const isActive = node.callId === activeCallId
  const nodeClass = `tree-node tree-node-${node.type}${isActive ? ' tree-node-active' : ''}`
  const label = `fib(${node.n})`
  const centerX = node.x + NODE_WIDTH / 2
  const centerY = node.y + NODE_HEIGHT / 2

  return (
    <g key={node.callId}>
      {/* Draw lines to children */}
      {node.children.map((child) => {
        const childCenterX = child.x + NODE_WIDTH / 2
        const childCenterY = child.y
        return (
          <line
            key={`line-${node.callId}-${child.callId}`}
            x1={centerX}
            y1={node.y + NODE_HEIGHT}
            x2={childCenterX}
            y2={childCenterY}
            className="tree-connector"
          />
        )
      })}

      {/* Draw the node box */}
      <g>
        <rect
          x={node.x}
          y={node.y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={6}
          className={nodeClass}
        />
        <text x={centerX} y={centerY - 5} className="node-text node-label">
          {label}
        </text>
        {node.type === 'base-case' && (
          <text x={centerX} y={centerY + 9} className="node-text node-badge">
            base
          </text>
        )}
        {node.type === 'cache-hit' && (
          <text x={centerX} y={centerY + 9} className="node-text node-badge">
            hit
          </text>
        )}
      </g>

      {/* Recursively render children */}
      {node.children.map((child) => (
        <SVGNode key={child.callId} node={child} activeCallId={activeCallId} />
      ))}
    </g>
  )
}

export function TreeVisualizer({ steps, activeCallId, viewMode = '2d' }: TreeVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  // Observe the panel's content box. This also catches layout changes caused by
  // sidebars or parent elements, which do not always fire a window resize.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width)
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2)
  }, [steps, containerWidth])

  if (steps.length === 0) {
    return <div className="tree-empty">Run an algorithm to see the call tree.</div>
  }

  const tree = buildTree(steps)

  if (!tree) {
    return <div className="tree-empty">No tree data available.</div>
  }

  // Step 1: Do initial layout starting at (0, 0)
  const layoutRoot = layoutTreeInitial(tree, 0, 0)

  // Step 2: Calculate the natural tree bounds before positioning it in the SVG.
  const bounds = calculateBounds(layoutRoot)
  const treeWidth = bounds.maxX - bounds.minX
  const treeHeight = bounds.maxY - bounds.minY
  const rootCenterX = layoutRoot.x + NODE_WIDTH / 2
  const leftExtent = rootCenterX - bounds.minX
  const rightExtent = bounds.maxX - rootCenterX

  // The SVG fills the panel's content width when possible and grows only when
  // the tree genuinely needs more room. The canvas is balanced around the root,
  // keeping it centered without sacrificing padding around asymmetric branches.
  const naturalSvgWidth = Math.max(treeWidth, Math.max(leftExtent, rightExtent) * 2) + TREE_PADDING * 2
  const svgWidth = Math.max(containerWidth, naturalSvgWidth)
  const svgHeight = treeHeight + TREE_PADDING * 2
  const offsetX = svgWidth / 2 - rootCenterX
  const offsetY = TREE_PADDING - bounds.minY

  // Step 3: Translate the tree into its padded, centered final position.
  const finalLayoutRoot = translateTree(layoutRoot, offsetX, offsetY)

  return (
    <div className={`tree-container tree-view-${viewMode}`} ref={containerRef}>
      <svg
        className="tree-svg"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMin meet"
      >
        <SVGNode node={finalLayoutRoot} activeCallId={activeCallId} />
      </svg>
    </div>
  )
}
