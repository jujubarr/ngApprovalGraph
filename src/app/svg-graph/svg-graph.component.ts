import * as D3 from 'd3';
import { Component, OnInit } from '@angular/core';
import { Node, Edge, RenderConfig, GraphConsts } from '../shared';

declare var window;
let d3:any = D3;

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
  svgWidth: number;
  svgHeight: number;

  state: any;

  // d3 objects, don't know how to give them a type.
  d3objects: any;

  constructor(private settings : RenderConfig) { 
  	console.log('D3 is loaded...' + d3);
  	this.nodes = [];
  	this.edges = [];
  	this.idct = 1;
    this.d3objects = {};
    this.svgWidth = this.settings.initSvgWidth;
    this.svgHeight = this.settings.initSvgHeight;

    this.state = {
        selectedNode: null,
        selectedEdge: null
    };
  }

  ngOnInit() {
    var thisGraph = this;
    var d3objects = this.d3objects;

  	// Set the svg tag to the dimensions of the body
  	// var bodyEl = document.getElementsByTagName('body')[0];

   //  var width = window.innerWidth || bodyEl.clientWidth;
   //  var height = window.innerHeight || bodyEl.clientHeight;

    var svg = d3.select('svg')
        .attr('width', this.settings.initSvgWidth)
        .attr('height', this.settings.initSvgHeight);

    d3objects.svg = svg;

    var startX = this.settings.startX;
    var startY = this.settings.startY;

    // Init nodeList with start & end node
    var startNode : Node = { 
  		id: 'startNode', 
  		title: GraphConsts.startNodeLabel, 
  		x: startX, 
  		y: startY, 
  		dep: []
  	};
    var endNode: Node = { 
  		id: 'endNode', 
  		title: GraphConsts.endNodeLabel, 
  		x: startX + this.settings.nodeWidth * this.settings.pathMultiplier * 2, 
  		y: startY, 
  		dep:[]
  	};
    this.nodes.push(startNode, endNode);


    // Push approver 'supervisor' to nodeList
  	var approver: Node = { 
  		id: GraphConsts.nodeIdTag+this.idct++, 
  		title: 'supervisor', 
  		x: startX + this.settings.nodeWidth * this.settings.pathMultiplier, 
  		y: startY,
  		dep: []
  	};
  	this.nodes.push(approver);

    // Init edges that properly point to the nodes
    this.edges.push({ source: startNode.id, target: approver.id });
    this.edges.push({ source: approver.id, target: endNode.id });

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
    d3objects.dragLine = svgG.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0')
        .style('marker-end', 'url(#mark-end-arrow)');

    // svg nodes and edges
    d3objects.paths = svgG.append("g").attr("id", "paths-group").selectAll("g");
    d3objects.boxes = svgG.append("g").attr("id", "nodes-group").selectAll("g");
    d3objects.tools = svgG.append("g").attr("id", "tools-group");
    
    var outputButton = d3objects.tools.append("g")
        .on("mouseup", (d) => {
           this.outputGraphMetadata();
        })
        .attr("transform", "translate(5, 5)");

    outputButton.append("rect")
        .attr("width", 60)
        .attr("height", 30)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        

    outputButton.append("text")
        .text("Output")
        .attr("font-size", 16)
        .attr("dx",8)
        .attr("dy", 20);


    var inputButton = d3objects.tools.append("g")
        .on("mouseup", (d) => {
           document.getElementById('hidden-meta-input').click();
        })
        .attr("transform", "translate(70, 5)");

    inputButton.append("rect")
        .attr("width", 60)
        .attr("height", 30)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1);

    inputButton.append("text")
        .text("Input")
        .attr("font-size", 16)
        .attr("dx", 13)
        .attr("dy", 20);


    // Draw graph
  	this.updateGraph();
  }

  outputGraphMetadata() {

    // when user clicks saveButton, do this.
    var thisGraph = this;

    thisGraph.nodes.forEach(function(node, i) {
        var dependencies = [];

        thisGraph.edges.forEach(function(edge, i) {
            if (edge.target === node.id) {
                dependencies.push(edge.source);
            }
        });

        node.dep = dependencies;
    });

    var jsonObj = { "nodes": thisGraph.nodes, "edges": thisGraph.edges, "svgWidth": this.svgWidth, "svgHeight": this.svgHeight };
    var blob = new Blob([window.JSON.stringify(jsonObj)], { type: "text/plain;charset=utf-8" });

    console.log(window.JSON.stringify(jsonObj, null, 4));
  }

  inputGraphMetadata(event) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      var uploadFile = event.target.files[0];
      var filereader = new window.FileReader();
      var thisGraph = this;

      filereader.onload = function() {
          var txtRes = filereader.result;
          // TODO better error handling
          try {
              var jsonObj = JSON.parse(txtRes);

              thisGraph.nodes = jsonObj.nodes;
              thisGraph.edges = jsonObj.edges;

              thisGraph.idct = jsonObj.nodes.length + 1;

              thisGraph.svgWidth = jsonObj.svgWidth;
              thisGraph.svgHeight = jsonObj.svgHeight;

              thisGraph.updateGraph();
          } catch (err) {
              window.alert("Error parsing uploaded file\nerror message: " + err.message);
              return;
          }
      };
      filereader.readAsText(uploadFile);

    } else {
        alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
    }
  }

  // returns a map of nodes
  getNodes() {
    var map = this.nodes.reduce(function ( nodes, node ) {
        nodes[ node.id ] = node;
        return nodes;
    }, {});

    return map;
  }

  deleteGraph(skipPrompt: boolean) {
  
    var thisGraph = this;
    var doDelete = true;

    // if (!skipPrompt) {
    //     doDelete = window.confirm("Press OK to delete this graph");
    // }
    if (doDelete) {
        thisGraph.nodes = [];
        thisGraph.edges = [];
        thisGraph.updateGraph();
    }
  }

  /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
  selectElementContents(el: any) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
  insertTitleLinebreaks(gEl: any, title: string) {
      var words = title.split(/\s+/g),
          nwords = words.length;
      var el = gEl.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "-" + (nwords - 1) * 7.5);

      for (var i = 0; i < words.length; i++) {
          var tspan = el.append('tspan').text(words[i]);
          if (i > 0)
              tspan.attr('x', 0).attr('dy', '15');
      }
  };

  // remove edges associated with a node & create a new one that connects them
  spliceLinksForNode(node: Node) {
      var thisGraph = this,
          settings = this.settings;
      var toSplice = [];

      var target: Node;
      var sources = [];
      var sourceEdges: Edge[] = [];
      var nodeMap = thisGraph.getNodes();

      for (var i = 0; i < thisGraph.edges.length; i++) {
        var e = thisGraph.edges[i];
        // one to one
        if (e.source === node.id) {
          toSplice.push(e);
          target = nodeMap[e.target];
        }
        // many to one
        else if (e.target === node.id) {
          toSplice.push(e);
          sources.push(e.source);
        }
      }

      // Remove the edges connected to the selectedNode
      toSplice.map(function(n) {
          thisGraph.edges.splice(thisGraph.edges.indexOf(n), 1);
      });


      // Get all edges with target of target.id
      sourceEdges = thisGraph.edges.filter(function(d) {
        return d.target == target.id;
      });
      // Relayout the nodes
      var move = true;
      for (var i = 0; i < sourceEdges.length; i++) {
        var id = sourceEdges[i].source;
        var source = nodeMap[id];
        
        if (target.x < (source.x + (settings.nodeWidth * 1.5)*2)) {
          move = false;
          break;
        }
      }
      if (move) {
        for (var i = 0; i < thisGraph.nodes.length; i++) {
            if (thisGraph.nodes[i].x > target.x || thisGraph.nodes[i].id == target.id) {
              thisGraph.nodes[i].x -= settings.nodeWidth * settings.pathMultiplier;
            }
        }
      }


      // Create new connecting edges if delete serial node 
      // We dont need new edges if there are no other nodes in serial
      nodeMap = thisGraph.getNodes();
      for (var i = 0; i < sources.length; i++) {
        var source = nodeMap[sources[i]];
        
        if (node.y == source.y || node.y == target.y) {
          var newEdge = {
            target: target.id,
            source: source.id
          };
          thisGraph.edges.push(newEdge);
        }
      }
  };

  removeSelectFromNode() {
      var thisGraph = this;
      var d3objects = this.d3objects;
      d3objects.boxes.filter(function(cd) {
          return cd.id === thisGraph.state.selectedNode.id;
      }).classed(GraphConsts.selectedClass, false);
      thisGraph.state.selectedNode = null;
  };

  removeSelectFromEdge() {
      var thisGraph = this;
      var d3objects = this.d3objects;

      d3objects.paths.filter(function(cd) {
          return cd === thisGraph.state.selectedEdge;
      }).classed(GraphConsts.selectedClass, false);
      thisGraph.state.selectedEdge = null;
  };

  /* place editable text on node in place of svg text */
  changeTextOfNode(d: any) {
      var thisGraph = this;
      var d3node = d3.select("#" + d.id);
      var d3objects = this.d3objects,
          consts = GraphConsts,
          settings = this.settings,
          htmlEl = d3node.node();

      d3node.selectAll("text[text-anchor]").remove();

      // replace with editableconent text
      var d3txt = d3objects.svg.selectAll("foreignObject")
          .data([d])
          .enter()
          .append("foreignObject")
          .attr("x", d.x)
          .attr("y", d.y)
          .attr("width", settings.nodeWidth)
          .attr("height", settings.nodeHeight)
          .attr("style", "text-align: center; vertical-align: middle;")
          .attr("transform", "translate(" + -settings.nodeWidth/2+ ", -14)")
          .append("xhtml:p")
          .attr("id", consts.activeEditId)
          .attr("contentEditable", "true")
          .text(d.title)
          .on("blur", function(d) {
              d.title = this.textContent;
              thisGraph.insertTitleLinebreaks(d3node, d.title);
              d3.select(this.parentElement).remove();
          });
      return d3txt;
  };

  // Returns the line path for a stepLine (we don't like diagonal lines...)
  stepLinePath(sourceX: number, sourceY: number, targetX: number, targetY: number) {
      var dx: number = this.settings.nodeWidth * this.settings.pathMultiplier;
      var dy: number = targetY - sourceY;

      var linePath = 'M' + sourceX + ',' + sourceY +
          'L' + (targetX - (dx / 2)) + ',' + sourceY +
          'L' + (targetX - (dx / 2)) + ',' + targetY +
          'L' + targetX + ',' + targetY;

      return linePath;

  };

  // RC: Create new graph node
  pushNewNode(xycoords: number[]) {
      var thisGraph = this;
      var d3objects = this.d3objects;
      var consts = GraphConsts

      // push new node json data
      var newNode = { id: consts.nodeIdTag + thisGraph.idct++, title: consts.defaultTitle, x: xycoords[0], y: xycoords[1], dep: [] };
      thisGraph.nodes.push(newNode);
      thisGraph.updateGraph();

      // make title of text immediently editable
      var d3txt = thisGraph.changeTextOfNode(newNode);
      var txtNode = d3txt.node();
      thisGraph.selectElementContents(txtNode);
      txtNode.focus();

      return newNode;
  };


  // RC: Create new serial edges
  pushNewSerialEdges(source: Node, target: Node, end: boolean) {

      var thisGraph = this;
      var settings = this.settings;
      var newEdge: Edge;
      var modifiedEdge: Edge;

      if (end) {

          // For each edge in the entire graph
          for (var i in thisGraph.edges) {
              var edge = thisGraph.edges[i];

              // remember that target is the newNode & source is the one before it
              // we want the previous node to point to the newNode
              // source = endNode & target = newNode
              if (edge.target == source.id) {
                  // Modify edge and push it back into array so that it will be redrawn
                  edge.target = target.id;
                  modifiedEdge = edge;
              }
          } 

          // we want the newNode to point to the endNode
          newEdge = { source: target.id, target: source.id };
      }
      else {

          // For each edge in the entire graph
          for (var i in thisGraph.edges) {
              var edge = thisGraph.edges[i];

              // remember that target is the newNode & source is the one before it
              // we want the newNode to point to the node that had a dependency on source
              if (edge.source == source.id) {
                  // Modify edge and push it back into array so that it will be redrawn
                  edge.source = target.id;
                  modifiedEdge = edge;
              }
          } 

          newEdge = { source: source.id, target: target.id };
      }

      // Move the nodes down if a node is inserted in the middle
      var nodeMap = this.getNodes();
      var leftNode = nodeMap[modifiedEdge.target];

      var expand = false;
      for (var i in thisGraph.nodes) {
          if (target.x < leftNode.x) {
            // There is enough space, don't need to move them...
            break;
          }
          else if (thisGraph.nodes[i].x >= target.x && thisGraph.nodes[i] != target) {
            thisGraph.nodes[i].x += settings.nodeWidth * settings.pathMultiplier;

            expand = true;
          }
      }

      // expand our svg div horizontally for scrolling
      if (expand) {
        thisGraph.svgWidth += settings.nodeWidth * settings.pathMultiplier;
      }

      thisGraph.edges.push(newEdge);
  };


  // RC: Create new parallel edges
  pushNewParallelEdges(source: Node, target: Node) {

      var thisGraph = this;
      var settings = this.settings;

      // Move the nodes down if a node is inserted in the middle
      for (var i in thisGraph.nodes) {
          if (thisGraph.nodes[i].y >= target.y && thisGraph.nodes[i].id != target.id) {
              thisGraph.nodes[i].y += settings.nodeHeight * settings.pathMultiplier;
          }

          // expand our svg div vertically for scrolling
          if (thisGraph.nodes[i].y >= thisGraph.svgHeight) {
            thisGraph.svgHeight += settings.nodeHeight * settings.pathMultiplier;
          }

          if (thisGraph.nodes[i].id == target.id) {
            target = thisGraph.nodes[i];
          }
      }

      // For each edge in the entire graph
      for (var i in thisGraph.edges) {
          var edge = thisGraph.edges[i];

          // remember that target is the newNode & source is the one before it
          // we want the newNode to point to the node that had a dependency on source
          if (thisGraph.edges[i].target == source.id) {
              // This is the left edge
              var newEdge = JSON.parse(JSON.stringify(edge)); // clone the edge object
              newEdge.target = target.id; 
              thisGraph.edges.push(newEdge);
          }
          else if (thisGraph.edges[i].source == source.id) {
              // This is the right edge
              var newEdge = JSON.parse(JSON.stringify(edge)); // clone the edge object
              newEdge.source = target.id; 
              thisGraph.edges.push(newEdge);
          }
      } 
  };

  deleteNode(selectedNode: Node) {
      var thisGraph = this,
          state = this.state;

      if (selectedNode) {
          thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
          thisGraph.spliceLinksForNode(selectedNode);
          state.selectedNode = null;
          thisGraph.updateGraph();
      } 
  };

  deleteEdge(selectedEdge: Edge) {
    var thisGraph = this,
        state = this.state;

    if (selectedEdge) {
          thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
          state.selectedEdge = null;
          thisGraph.updateGraph();
      }
  }


  renderStartEndNodes(newGs: any) {
    var thisGraph = this,
        settings = this.settings;

    var pxDifferenceToCenterFont = settings.buttonFontSize / 4;

    var startNode = newGs.filter(function(d) {
      return this.getAttribute('id') === "startNode"; 
    });

    var endNode = newGs.filter(function(d) {
      return this.getAttribute('id') === "endNode"; 
    });

    // RC: Append start end nodes
    startNode.append("circle")
        .attr("r", settings.nodeHeight / 2)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1);

    endNode.append("circle")
        .attr("r", settings.nodeHeight / 2)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1);

    // RC: Append addSerial button
    var button = startNode.append("g").on("mouseup", (d) => {
           this.appendSerialNode(d);
        });

    button.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cx", settings.nodeHeight / 2 + 20)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1);

    button.each(function(d) {
        // For serial button
        d3.select(this).append("text")
            .text("+")
            .classed("btn-add-approver", true)
            .attr('font-size', function(d) {
                return settings.buttonFontSize + 'px'
            })
            .attr("dx", settings.nodeHeight / 2 + 20 - pxDifferenceToCenterFont)
            .attr("dy", pxDifferenceToCenterFont);
    });

    // RC: This is used for Text boxes for putting icons... for some reason text needs to be in a group (g)
    startNode.each(function(d) {
        thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // RC: Prepend addSerial button
    button = endNode.append("g").on("mouseup", (d) => {
          this.prependSerialNode(d);
        });

    button.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cx", -(settings.nodeHeight / 2 + 20))
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1);

    button.each(function(d) {
        // For serial button
        d3.select(this).append("text")
            .text("+")
            .classed("btn-add-approver", true)
            .attr('font-size', function(d) {
                return settings.buttonFontSize + 'px'
            })
            .attr("dx", - (settings.nodeHeight / 2 + 20 + pxDifferenceToCenterFont))
            .attr("dy", pxDifferenceToCenterFont);
    });

    // RC: This is used for Text boxes for putting icons... for some reason text needs to be in a group (g)
    endNode.each(function(d) {
        thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });
  }

  // RC: create new parallel node with edge
  appendParallelNode(d: any) {
    var settings = this.settings;
    var d3objects = this.d3objects;

    var xycoords = [d.x, d.y + settings.nodeHeight * settings.pathMultiplier];
    var newNode = this.pushNewNode(xycoords);
    this.pushNewParallelEdges(d, newNode);
    this.updateGraph();

    // console.log("parallel" + window.JSON.stringify(newNode));
  }

  // RC: create new serial node with edge
  appendSerialNode(d: any) {
    var settings = this.settings;
    var d3objects = this.d3objects;

    var xycoords = [d.x + settings.nodeWidth * settings.pathMultiplier, d.y];
    var newNode:Node = this.pushNewNode(xycoords);
    this.pushNewSerialEdges(d, newNode, false);
    this.updateGraph();

    // console.log("serial" + window.JSON.stringify(newNode));
  }

  // RC: create new serial node with edge (used for EndNode)
  prependSerialNode(d: any) {
    var settings = this.settings;
    var d3objects = this.d3objects;

    var xycoords = [d.x, d.y];
    var newNode = this.pushNewNode(xycoords);
    this.pushNewSerialEdges(d, newNode, true);
    this.updateGraph();

    console.log("serial" + window.JSON.stringify(newNode));
  }

  updateApprovalBoxes(newGs: any) {

    var thisGraph = this,
      d3objects = this.d3objects,
      settings = this.settings,
      settings = this.settings,
      consts = GraphConsts;

    var pxDifferenceToCenterFont = settings.buttonFontSize / 4;

    var approvalBoxGs = newGs.filter(function(d) {
      return this.getAttribute('class').includes("approval-box"); 
    });

    // RC: Append new approvalBox
    approvalBoxGs.append("rect")
        .attr("width", settings.nodeWidth)
        .attr("height", settings.nodeHeight)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .attr("transform", function(d) {
            return "translate(-" + settings.nodeWidth / 2 + ", -" + settings.nodeHeight / 2 + ")";
        });

    // Append delete button
    approvalBoxGs.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cx", settings.nodeWidth / 2)
        .attr("cy", -settings.nodeHeight / 2)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .on("mouseup", (d) => {
          this.deleteNode(d);
        });

    // RC: Append addSerial button
    var button = approvalBoxGs.append("g").on("mouseup", (d) => {
          this.appendSerialNode(d);
        });

    button.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cx", settings.nodeWidth / 2 + 20)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1);

    button.each(function(d) {
        // For serial button
        d3.select(this).append("text")
            .text("+")
            .classed("btn-add-approver", true)
            .attr('font-size', function(d) {
                return settings.buttonFontSize + 'px'
            })
            .attr("dx", settings.nodeWidth / 2 + 20 - pxDifferenceToCenterFont)
            .attr("dy", pxDifferenceToCenterFont);
    });

    // RC: Append addParallel button
    button = approvalBoxGs.append("g").on("mouseup", (d) => {
          this.appendParallelNode(d);
        });

    button.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cy", settings.nodeHeight / 2 + 20)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1);

    button.each(function(d) {
        // For parallel button
        d3.select(this).append("text")
            .text("+")
            .classed("btn-add-approver", true)
            .attr('font-size', function(d) {
                return settings.buttonFontSize + 'px'
            })
            .attr("dy", settings.nodeHeight / 2 + 20 + pxDifferenceToCenterFont)
            .attr("dx", -pxDifferenceToCenterFont);
    });

    // RC: This is used for Text boxes for putting icons... for some reason text needs to be in a group (g)
    approvalBoxGs.each(function(d) {
        thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // remove old nodes
    d3objects.boxes.exit().remove();
  }

  updatePaths() {

    var thisGraph = this,
      d3objects = this.d3objects,
      settings = this.settings,
      consts = GraphConsts,
      state = this.state;


    d3objects.paths = d3.select("#paths-group").selectAll("path").data(thisGraph.edges, function(d) {
        return String(d.source.id) + "+" + String(d.target.id);
    });

    // update existing paths
    var paths = d3objects.paths;
    var nodeMap = thisGraph.getNodes();

    paths.style('marker-end', 'url(#end-arrow)')
        .classed(consts.selectedClass, function(d) {
            return d === state.selectedEdge;
        });

    // add new paths
    paths.enter()
        .append("path")
        .style('marker-end', 'url(#end-arrow)')
        .attr("d", function(d: any) {
            var source = nodeMap[d.source];
            var target = nodeMap[d.target];

            return thisGraph.stepLinePath(source.x, source.y, target.x, target.y);
        })
        .attr("stroke-width", "6px")
        .attr("stroke", "#333")
        .attr("fill", "none")
        .classed("link", true);

    /*
      update old paths:
      this recalculates the paths to point to the new node 
      coordinates based on where it currently is in the DOM
      because the xy-coordinates in nodes[] might be outdated
    */
    d3objects.paths.data(thisGraph.edges).attr("d", function(d: any) {
      var source = nodeMap[d.source];
      var target = nodeMap[d.target];

      return thisGraph.stepLinePath(source.x, source.y, target.x, target.y);
      // if (source.length > 0 && target.length > 0) {
      //   // Use the coordinates from node instead of edge
      // }
      // else {
      //   return thisGraph.stepLinePath(d.source.x, d.source.y, d.target.x, d.target.y)
      // }
    });

    // remove old links
    paths.exit().remove();
  }

  updateSvgDimensions() {
    this.d3objects.svg.attr("width", this.svgWidth);
    this.d3objects.svg.attr("height", this.svgHeight);
  }

  // call to propagate changes to graph
  updateGraph() {

      var thisGraph = this,
          d3objects = this.d3objects,
          settings = this.settings,
          consts = GraphConsts,
          state = this.state;

      // update existing nodes
      d3objects.boxes = d3.select("#nodes-group").selectAll(".conceptG").data(thisGraph.nodes, function(d) {
          return d.id;
      });

      d3objects.boxes.attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
      });

      // add new nodes
      var newGs = d3objects.boxes.enter()
          .append("g")
          .attr("id", function(d) {
              return d.id;
          })
          .attr("class", function(d) {
              if (d.id == "startNode" || d.id == "endNode") {
                  return "start-end-nodes";
              } else {
                  return "approval-box";
              }
          });

      newGs.classed(consts.boxGClass, true)
          .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")";
          });

      this.renderStartEndNodes(newGs);
      this.updateApprovalBoxes(newGs);
      this.updatePaths();
      this.updateSvgDimensions();
  };

}
