import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

export interface DependencyNode {
  id: string; // section title or path
  type: 'section' | 'document';
  metadata?: any;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'hard' | 'soft' | 'related';
  description?: string;
}

export interface GraphData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export class DependencyGraph {
  private projectRoot: string;
  private data: GraphData;
  private filePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.data = { nodes: [], edges: [] };
    this.filePath = path.join(this.projectRoot, '.gdd', 'dependencies.yaml');
  }

  async init(): Promise<void> {
    try {
      // Ensure .gdd directory exists
      const gddDir = path.dirname(this.filePath);
      await fs.mkdir(gddDir, { recursive: true });

      try {
        const fileContent = await fs.readFile(this.filePath, 'utf-8');
        this.data = YAML.parse(fileContent);
        
        // Ensure data structure is valid even if file is empty or malformed
        if (!this.data || typeof this.data !== 'object') {
          this.data = { nodes: [], edges: [] };
        }
        if (!Array.isArray(this.data.nodes)) {
          this.data.nodes = [];
        }
        if (!Array.isArray(this.data.edges)) {
          this.data.edges = [];
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, start with empty graph
          this.data = { nodes: [], edges: [] };
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to initialize dependency graph:', error);
      throw error;
    }
  }

  addNode(node: DependencyNode): void {
    const existingNodeIndex = this.data.nodes.findIndex(n => n.id === node.id);
    if (existingNodeIndex !== -1) {
      // Update existing node
      this.data.nodes[existingNodeIndex] = node;
    } else {
      // Add new node
      this.data.nodes.push(node);
    }
  }

  addEdge(edge: DependencyEdge): void {
    // Check if edge already exists to prevent duplicates
    const existingEdgeIndex = this.data.edges.findIndex(
      e => e.from === edge.from && e.to === edge.to && e.type === edge.type
    );

    if (existingEdgeIndex !== -1) {
      // Update existing edge
      this.data.edges[existingEdgeIndex] = edge;
    } else {
      // Add new edge
      this.data.edges.push(edge);
    }
  }

  getDependents(nodeId: string): string[] {
    // dependents: nodes that depend on nodeId (arrows pointing from X to nodeId)
    // "Dependent" usually means "X depends on Y", so X is a dependent of Y.
    // In our edge definition: from -> to.
    // If we have edge A -> B, A depends on B.
    // If I ask for dependents of B, I want A.
    // So look for edges where to == nodeId, and return from.
    return this.data.edges
      .filter(edge => edge.to === nodeId)
      .map(edge => edge.from);
  }

  getDependencies(nodeId: string): string[] {
    // dependencies: nodes that nodeId depends on (arrows pointing from nodeId to X)
    // If we have edge A -> B, A depends on B. B is a dependency of A.
    // If I ask for dependencies of A, I want B.
    // So look for edges where from == nodeId, and return to.
    return this.data.edges
      .filter(edge => edge.from === nodeId)
      .map(edge => edge.to);
  }

  async save(): Promise<void> {
    try {
      const yamlString = YAML.stringify(this.data);
      await fs.writeFile(this.filePath, yamlString, 'utf-8');
    } catch (error) {
      console.error('Failed to save dependency graph:', error);
      throw error;
    }
  }
}
