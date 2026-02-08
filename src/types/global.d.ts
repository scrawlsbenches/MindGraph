/**
 * MindGraph — Global Type Declarations
 *
 * Augments the Window interface with the globals that app.js exposes
 * for inline onclick handlers in dynamically generated HTML.
 */

import type { GraphNode } from './graph';

export {};

declare global {
  interface Window {
    selectNode: (n: GraphNode) => void;
    updateND: () => void;
    toggleCluster: (ci: number) => void;
    nodes: GraphNode[];
    searchInput: HTMLInputElement;
    activeCluster: number;
  }
}
