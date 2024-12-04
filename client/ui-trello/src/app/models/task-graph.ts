// task-graph.model.ts
export interface TaskGraph {
  nodes: TaskNode[];
  edges: Edge[];
}

export interface TaskNode {
  id: string;
  label: string;
  description: any;
}

export interface Edge {
  from: string;
  to: string;
}
