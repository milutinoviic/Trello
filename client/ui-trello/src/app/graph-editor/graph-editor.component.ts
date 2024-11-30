import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as shape from 'd3-shape';
import {GraphService} from "../services/graph.service";

@Component({
  selector: 'app-graph-editor',
  templateUrl: './graph-editor.component.html',
  styleUrls: ['./graph-editor.component.css']
})
export class GraphEditorComponent implements OnInit {
  @Input()  projectId!: string;
  nodes: any[] = [];
  links: any[] = [];
  selectedNodes: any[] = [];
  curve = shape.curveLinear;
  graphLoaded: boolean = false;

  constructor(private graphService: GraphService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetchGraph();
  }

  fetchGraph() {
    this.graphService.getWorkflowByProject(this.projectId).subscribe({
      next: (graph) => {
        console.log("GRAPH: ", graph)
        this.nodes = graph.nodes.map((node: any) => ({
          id: node.id,
          label: node.label,
        }));

        this.links = graph.edges.map((edge: any) => ({
          source: edge.from,
          target: edge.to,
        }));

        this.graphLoaded = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching task graph:', err);
      },
    });
  }


  connectTasks() {
    if (this.selectedNodes.length === 2) {
      const [from, to] = this.selectedNodes;
      if (!this.links.find(link => link.source === from && link.target === to)) {
        this.links.push({ source: from, target: to, label: 'Depends on' });
        console.log(`Connected ${from} -> ${to}`);
      }

      this.selectedNodes = [];
    }
  }

  onNodeClicked(node: any) {
    if (this.selectedNodes.includes(node.id)) {
      this.selectedNodes = this.selectedNodes.filter((id) => id !== node.id);
    } else if (this.selectedNodes.length < 2) {
      this.selectedNodes.push(node.id);
    }
    console.log('Selected Nodes:', this.selectedNodes);
  }


}
