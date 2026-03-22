import { useState, useEffect, useCallback } from 'react';

export interface TreeNode {
  fen: string;
  name: string;
  eco: string;
  move: string;
  moves: string;
  descendantCount: number;
  gamesPlayed: number;
  hasChildren: boolean;
}

export interface AncestorNode extends TreeNode {
  siblings: TreeNode[];
}

export interface TreeContext {
  current: TreeNode;
  ancestors: AncestorNode[];
  children: TreeNode[];
  siblings: TreeNode[];
}

interface HookState {
  data: TreeContext | null;
  loading: boolean;
  error: string | null;
}

export function useOpeningTree(fen: string | undefined) {
  const [state, setState] = useState<HookState>({
    data: null,
    loading: !!fen,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!fen) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const encoded = encodeURIComponent(fen);
      const res = await fetch(`/api/openings/fen/${encoded}/tree`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Failed to load tree data (${res.status})`);
      }
      const json = await res.json();
      setState({ data: json.data as TreeContext, loading: false, error: null });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setState({ data: null, loading: false, error: message });
    }
  }, [fen]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchChildren = useCallback(async (childFen: string): Promise<TreeNode[]> => {
    const encoded = encodeURIComponent(childFen);
    const res = await fetch(`/api/openings/fen/${encoded}/tree/children`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.children as TreeNode[]) || [];
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    fetchChildren,
  };
}
