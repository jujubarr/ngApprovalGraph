import { Component, OnInit } from '@angular/core';
import { Node, Edge, RenderConfig, NodeConstants, NodeStates } from '../classes';
import * as d3 from 'd3';

@Component({
  selector: 'svg-graph',
  templateUrl: './svg-graph.component.html',
  styleUrls: ['./svg-graph.component.css'],
  providers: [Node, Edge, RenderConfig]
})
export class SvgGraphComponent implements OnInit {

	nodes: Node[];
	edges: Edge[];
	idct: number;

  constructor(private settings : RenderConfig) { 
  	console.log("D3 is loaded..." + d3);
  	this.nodes = [];
  	this.edges = [];
  	this.idct = 1;
  }

  ngOnInit() {
  	// Set the svg tag to the dimensions of the body
  	var bodyEl = document.getElementsByTagName('body')[0];
  	d3.select('svg')
  			.attr("width", bodyEl.clientWidth)
        .attr("height", bodyEl.clientHeight);

    // Init nodeList with start & end node
    var startNode : Node = { 
  		id: "startNode", 
  		title: NodeConstants.startNodeLabel, 
  		x: 300, 
  		y: 200, 
  		dep: []
  	};

    var endNode: Node = { 
  		id: "endNode", 
  		title: NodeConstants.endNodeLabel, 
  		x: 300 + this.settings.nodeWidth * this.settings.pathMultiplier * 2, 
  		y: 200, 
  		dep:[]
  	};

    this.nodes.push(startNode, endNode);


    // Push approver 'supervisor' to nodeList
  	var approver: Node = { 
  		id: NodeConstants.nodeIdTag+this.idct++, 
  		title: "supervisor", 
  		x: 300 + this.settings.nodeWidth * this.settings.pathMultiplier, 
  		y: 200,
  		dep: []
  	};

  	this.nodes.push(approver);

    // Init edges that properly point to the nodes
    this.edges.push({ source: startNode, target: approver });
    this.edges.push({ source: approver, target: endNode });

    // Draw graph
  	this.updateGraph();
  }

  updateGraph() {
    var svg = d3.select('svg');
    var nodeWidth = this.settings.nodeWidth;
    var nodeHeight = this.settings.nodeHeight;

    svg.append("rect")
            .attr("x", 200)
            .attr("y", 100)
            .attr("width", nodeWidth)
            .attr("height", nodeHeight)
            .style("fill", "white")
            .style("stroke", "gray")
            .style("stroke-width", 1)
            .attr("transform", function(d) {
                return "translate(-" + nodeWidth / 2 + ", -" + nodeHeight / 2 + ")";
            });
  }

}
