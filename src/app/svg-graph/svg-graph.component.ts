import { Component, OnInit } from '@angular/core';
import { Node, Edge, RenderConfig, GraphConsts, NodeStates } from '../classes';
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

  // d3 objects, don't know how to give them a type.
  thisGraph: any;

  constructor(private settings : RenderConfig) { 
  	console.log('D3 is loaded...' + d3);
  	this.nodes = [];
  	this.edges = [];
  	this.idct = 1;
    this.thisGraph = {};
  }

  ngOnInit() {
    var self = this;
    var thisGraph = this.thisGraph;

  	// Set the svg tag to the dimensions of the body
  	var bodyEl = document.getElementsByTagName('body')[0];
    var svg = d3.select('svg')
        .attr('width', bodyEl.clientWidth)
        .attr('height', bodyEl.clientHeight);
    thisGraph.svg = svg;

    // Init nodeList with start & end node
    var startNode : Node = { 
  		id: 'startNode', 
  		title: GraphConsts.startNodeLabel, 
  		x: 300, 
  		y: 200, 
  		dep: []
  	};
    var endNode: Node = { 
  		id: 'endNode', 
  		title: GraphConsts.endNodeLabel, 
  		x: 300 + this.settings.nodeWidth * this.settings.pathMultiplier * 2, 
  		y: 200, 
  		dep:[]
  	};
    this.nodes.push(startNode, endNode);


    // Push approver 'supervisor' to nodeList
  	var approver: Node = { 
  		id: GraphConsts.nodeIdTag+this.idct++, 
  		title: 'supervisor', 
  		x: 300 + this.settings.nodeWidth * this.settings.pathMultiplier, 
  		y: 200,
  		dep: []
  	};
  	this.nodes.push(approver);

    // Init edges that properly point to the nodes
    this.edges.push({ source: startNode, target: approver });
    this.edges.push({ source: approver, target: endNode });

    // Define arrow markers for graph links in d3
    var defs = svg.append('svg:defs');
    defs.append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        // This is to show where on the path the arrow should show
        .attr('refX', '63')
        .attr('markerWidth', 3.5)
        .attr('markerHeight', 3.5)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

    // define arrow markers for leading arrow
    defs.append('svg:marker')
        .attr('id', 'mark-end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 7)
        .attr('markerWidth', 3.5)
        .attr('markerHeight', 3.5)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

    var svgG = svg.append("g")
        .classed(GraphConsts.graphClass, true);

    // displayed when dragging between nodes
    thisGraph.dragLine = svgG.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0')
        .style('marker-end', 'url(#mark-end-arrow)');

    // svg nodes and edges
    thisGraph.paths = svgG.append("g").selectAll("g");
    thisGraph.boxes = svgG.append("g").selectAll("g");
    var d4 = d3;
    debugger;

    // thisGraph.drag = d3.behavior.drag()
    //     .origin(function(d) {
    //         return { x: d.x, y: d.y };
    //     })
    //     .on("drag", function(args) {
    //         thisGraph.state.justDragged = true;
    //         thisGraph.dragmove.call(thisGraph, args);
    //     })
    //     .on("dragend", function() {
    //         // todo check if edge-mode is selected
    //     });

    // // listen for key events
    // d3.select(window).on("keydown", function() {
    //         thisGraph.svgKeyDown.call(thisGraph);
    //     })
    //     .on("keyup", function() {
    //         thisGraph.svgKeyUp.call(thisGraph);
    //     });
    // svg.on("mousedown", function(d) { thisGraph.svgMouseDown.call(thisGraph, d); });
    // svg.on("mouseup", function(d) { thisGraph.svgMouseUp.call(thisGraph, d); });

    // Draw graph
  	this.updateGraph();
  }

  updateGraph() {
    var svg = d3.select('svg');
    var nodeWidth = this.settings.nodeWidth;
    var nodeHeight = this.settings.nodeHeight;

    svg.append('rect')
            .attr('x', 200)
            .attr('y', 100)
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .style('fill', 'white')
            .style('stroke', 'gray')
            .style('stroke-width', 1)
            .attr('transform', function(d) {
                return 'translate(-' + nodeWidth / 2 + ', -' + nodeHeight / 2 + ')';
            });
  }

  dragmove(d: any) {
    var thisGraph = this.thisGraph;
    if (NodeStates.shiftNodeDrag) {
        // draw path from item to the mouse coordinates in the graph (svgG means svg g.graph)
        var targetX = d3.mouse(thisGraph.svgG.node())[0];
        var targetY = d3.mouse(thisGraph.svgG.node())[1];

        thisGraph.dragLine.attr('d', thisGraph.stepLinePath(d.x, d.y, targetX, targetY));
    }
  }

  deleteGraph(skipPrompt: boolean) {

  }

}
