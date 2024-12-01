// graph-editor.component.ts

import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GraphService } from "../services/graph.service";
import { Edge, TaskNode } from "../models/task-graph";
import { Network } from "vis-network";
import {NetworkEvents} from "vis";

@Component({
  selector: 'app-graph-editor',
  template: `<div id="graph" style="width: 100%; height: 600px; border: 1px solid #ddd;"></div>`,
  styles: [],
})
export class GraphEditorComponent implements OnInit {
  nodes: TaskNode[] = [];
  links: Edge[] = [];
  @Input() projectId!: string;

  constructor(private http: HttpClient, private elRef: ElementRef, private graphService: GraphService) {}

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.graphService.getWorkflowByProject(this.projectId).subscribe((data) => {
      this.nodes = data.nodes;
      this.links = data.edges;
      this.createGraph();
    });
  }

  createGraph() {
    const visNodes = this.nodes.map((node) => ({
      id: node.id,
      label: node.label,
    }));

    const visEdges = this.links.map((link) => ({
      from: link.from,
      to: link.to,
    }));

    const data = {
      nodes: visNodes,
      edges: visEdges,
    };

    const options = {
      nodes: {
        shape: 'dot',
        size: 20,
        font: { size: 14 },
      },
      edges: {
        width: 2,
        color: { color: '#aaa', hover: '#000' },
        arrows: { to: { enabled: true } },
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -26,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08,
        },
        minVelocity: 0.75,
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
      },
      manipulation: {
        enabled: true,
        addEdge: (edgeData: any, callback: Function) => {

          if (window.confirm("Do you want to connect these nodes?")) {
            this.addEdgeToGraph(edgeData);
            callback(edgeData);
          } else {
            callback(null);
          }
        },
      },
    };

    const container = this.elRef.nativeElement.querySelector('#graph');
    const network = new Network(container, data, options);
  }

  addEdgeToGraph(edgeData: any) {
    const taskID = edgeData.from;
    const dependencyID = edgeData.to;

    this.graphService.addDependency(taskID, dependencyID).subscribe({
      next: () => {
        console.log('Dependency added successfully');
        this.links.push({ from: taskID, to: dependencyID });
      },
      error: (err) => {
        console.error('Error adding dependency:', err);
        alert("Failed to add dependency. Please try again.");
      },
    });
  }

}
