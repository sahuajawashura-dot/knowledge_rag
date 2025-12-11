import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

// Extends D3's simulation node to include our custom properties
export interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  group: string; // Used for coloring
  description?: string;
  radius?: number; // Optional visual radius
  
  // D3 Force Simulation properties
  // Explicitly defined to ensure TypeScript recognizes them extending SimulationNodeDatum
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

// Extends D3's simulation link
export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string; // The label on the connection line
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GenerationStatus {
  loading: boolean;
  step: 'idle' | 'analyzing' | 'building' | 'complete' | 'error';
  message: string;
}