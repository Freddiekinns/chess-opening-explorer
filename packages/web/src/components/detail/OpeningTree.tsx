import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { TreeContext, TreeNode } from '../../hooks/useOpeningTree';
import styles from './OpeningTree.module.css';

interface VisibleRow {
  key: string;
  fen: string;
  name: string;
  eco: string;
  move: string;
  descendantCount: number;
  hasChildren: boolean;
  depth: number;
  isCurrent: boolean;
  section: 'path' | 'continuations' | 'siblings';
}

interface Props {
  treeData: TreeContext | null;
  loading: boolean;
  currentFen: string;
  onFetchChildren: (fen: string) => Promise<TreeNode[]>;
}

function buildExpandableRows(
  nodes: TreeNode[],
  expandedNodes: Set<string>,
  lazyChildren: Map<string, TreeNode[]>,
  loadingNodes: Set<string>,
  section: 'continuations' | 'siblings',
  baseDepth: number = 0
): VisibleRow[] {
  const rows: VisibleRow[] = [];

  const addNode = (node: TreeNode, depth: number) => {
    rows.push({
      key: node.fen,
      fen: node.fen,
      name: node.name,
      eco: node.eco,
      move: node.move,
      descendantCount: node.descendantCount,
      hasChildren: node.hasChildren,
      depth,
      isCurrent: false,
      section,
    });

    if (expandedNodes.has(node.fen)) {
      if (loadingNodes.has(node.fen)) {
        rows.push({
          key: `loading-${node.fen}`,
          fen: '',
          name: '',
          eco: '',
          move: '',
          descendantCount: 0,
          hasChildren: false,
          depth: depth + 1,
          isCurrent: false,
          section,
        });
      } else if (lazyChildren.has(node.fen)) {
        const children = lazyChildren.get(node.fen) || [];
        for (const child of children) {
          addNode(child, depth + 1);
        }
      }
    }
  };

  for (const node of nodes) {
    addNode(node, baseDepth);
  }

  return rows;
}

export const OpeningTree: React.FC<Props> = ({
  treeData,
  loading,
  currentFen,
  onFetchChildren,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [lazyChildren, setLazyChildren] = useState<Map<string, TreeNode[]>>(new Map());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  const treeRef = useRef<HTMLDivElement>(null);

  // Reset state when FEN changes
  useEffect(() => {
    setExpandedNodes(new Set());
    setLazyChildren(new Map());
    setFocusedIndex(-1);
    setLoadingNodes(new Set());
  }, [currentFen]);

  const toggleNode = useCallback(
    (fen: string) => {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(fen)) {
          next.delete(fen);
        } else {
          next.add(fen);
          if (!lazyChildren.has(fen)) {
            setLoadingNodes((ln) => new Set(ln).add(fen));
            onFetchChildren(fen).then((children) => {
              setLazyChildren((prev) => new Map(prev).set(fen, children));
              setLoadingNodes((ln) => {
                const next = new Set(ln);
                next.delete(fen);
                return next;
              });
            });
          }
        }
        return next;
      });
    },
    [lazyChildren, onFetchChildren]
  );

  // Build three sections
  const { pathRows, continuationRows, siblingRows } = useMemo(() => {
    if (!treeData) return { pathRows: [], continuationRows: [], siblingRows: [] };

    // Path: ancestors + current
    const pathRows: VisibleRow[] = [
      ...treeData.ancestors.map((a) => ({
        key: a.fen,
        fen: a.fen,
        name: a.name,
        eco: a.eco,
        move: a.move,
        descendantCount: a.descendantCount,
        hasChildren: a.hasChildren,
        depth: 0,
        isCurrent: false,
        section: 'path' as const,
      })),
      {
        key: treeData.current.fen,
        fen: treeData.current.fen,
        name: treeData.current.name,
        eco: treeData.current.eco,
        move: treeData.current.move,
        descendantCount: treeData.current.descendantCount,
        hasChildren: treeData.current.hasChildren,
        depth: 0,
        isCurrent: true,
        section: 'path' as const,
      },
    ];

    // Continuations: children of current (expandable)
    const continuationRows = buildExpandableRows(
      treeData.children,
      expandedNodes,
      lazyChildren,
      loadingNodes,
      'continuations'
    );

    // Siblings: siblings of current (expandable), sorted by move
    const sortedSiblings = [...treeData.siblings].sort((a, b) => a.move.localeCompare(b.move));
    const siblingRows = buildExpandableRows(
      sortedSiblings,
      expandedNodes,
      lazyChildren,
      loadingNodes,
      'siblings'
    );

    return { pathRows, continuationRows, siblingRows };
  }, [treeData, expandedNodes, lazyChildren, loadingNodes]);

  const allRows = useMemo(
    () => [...pathRows, ...continuationRows, ...siblingRows],
    [pathRows, continuationRows, siblingRows]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (allRows.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, allRows.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'ArrowRight': {
          e.preventDefault();
          const row = allRows[focusedIndex];
          if (row && row.hasChildren && !row.isCurrent && !expandedNodes.has(row.fen)) {
            toggleNode(row.fen);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const row = allRows[focusedIndex];
          if (row && expandedNodes.has(row.fen)) {
            toggleNode(row.fen);
          }
          break;
        }
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(allRows.length - 1);
          break;
        default:
          break;
      }
    },
    [allRows, focusedIndex, expandedNodes, toggleNode]
  );

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex < 0 || !treeRef.current) return;
    const rows = treeRef.current.querySelectorAll('[role="treeitem"]');
    if (rows[focusedIndex]) {
      rows[focusedIndex].scrollIntoView?.({ block: 'nearest' });
    }
  }, [focusedIndex]);

  if (!treeData && !loading) return null;

  const indentClass = (depth: number) => {
    const clamped = Math.min(depth, 6);
    return styles[`indent${clamped}` as keyof typeof styles] || styles.indent6;
  };

  const renderRow = (row: VisibleRow, globalIndex: number) => {
    // Loading skeleton
    if (row.key.startsWith('loading-')) {
      return (
        <div key={row.key} className={`${styles.skeleton} ${indentClass(row.depth)}`}>
          <div className={styles.skeletonBar} />
        </div>
      );
    }

    const isExpanded = expandedNodes.has(row.fen);
    const isFocused = globalIndex === focusedIndex;
    const isPathRow = row.section === 'path';
    const canExpand = row.hasChildren && !row.isCurrent && !isPathRow;

    return (
      <div
        key={row.key}
        role="treeitem"
        aria-expanded={canExpand ? isExpanded : undefined}
        aria-level={row.depth + 1}
        aria-selected={row.isCurrent}
        tabIndex={isFocused ? 0 : -1}
        className={[
          styles.row,
          isPathRow ? styles.rowPath : '',
          !isPathRow ? indentClass(row.depth) : '',
          row.isCurrent ? styles.rowCurrent : '',
          isFocused ? styles.rowFocused : '',
          canExpand ? styles.rowExpandable : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => {
          e.stopPropagation();
          if (canExpand) toggleNode(row.fen);
        }}
      >
        {/* Chevron for expandable rows */}
        {!isPathRow && (
          <span
            className={[
              styles.nodeChevron,
              isExpanded ? styles.nodeChevronExpanded : '',
              !canExpand ? styles.nodeChevronHidden : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            &#9656;
          </span>
        )}

        {/* Current node marker */}
        {row.isCurrent && <span className={styles.currentMarker}>&#9733;</span>}

        {/* Move notation */}
        <span className={styles.moveText}>{row.move}</span>

        {/* Name — link for non-current, plain text for current */}
        {row.isCurrent ? (
          <span className={styles.nodeName}>{row.name}</span>
        ) : (
          <Link
            to={`/opening/${encodeURIComponent(row.fen)}`}
            className={styles.nodeNameLink}
            onClick={(e) => e.stopPropagation()}
          >
            {row.name}
            <span className={styles.navIcon} aria-hidden="true">
              &#8599;
            </span>
          </Link>
        )}

        {/* Descendant count */}
        {row.descendantCount > 0 && (
          <span className={styles.descendantCount}>{row.descendantCount.toLocaleString()}</span>
        )}
      </div>
    );
  };

  // Track global index across sections
  let globalIndex = 0;

  const currentMove = treeData?.current.move || '';

  return (
    <section className={styles.panel} aria-label="Opening tree navigation">
      <div className={styles.panelTitle}>Opening Tree</div>

      <div
        ref={treeRef}
        className={styles.treeContainer}
        role="tree"
        aria-label="Opening variations tree"
        onKeyDown={handleKeyDown}
      >
        {/* Loading state */}
        {loading && !treeData && (
          <div className={styles.section}>
            <div className={styles.skeleton}>
              <div className={styles.skeletonBar} />
            </div>
            <div className={styles.skeleton}>
              <div className={styles.skeletonBar} />
            </div>
          </div>
        )}

        {treeData && (
          <>
            {/* Path section */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Path</div>
              {pathRows.map((row) => {
                const el = renderRow(row, globalIndex);
                globalIndex++;
                return el;
              })}
            </div>

            {/* Continuations section */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Continuations</div>
              {continuationRows.length > 0 ? (
                continuationRows.map((row) => {
                  const el = renderRow(row, globalIndex);
                  globalIndex++;
                  return el;
                })
              ) : (
                <div className={styles.emptyState}>No further variations</div>
              )}
            </div>

            {/* Siblings section (hidden if none) */}
            {siblingRows.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Instead of {currentMove}</div>
                {siblingRows.map((row) => {
                  const el = renderRow(row, globalIndex);
                  globalIndex++;
                  return el;
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default OpeningTree;
