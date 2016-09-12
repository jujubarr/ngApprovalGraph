import { Component, OnInit } from '@angular/core';
import { Node, Edge, GraphMetadata, RenderConfig, GraphConsts, NodeStates } from '../classes';
import * as d3 from 'd3';
import { drag } from 'd3-drag';
import { event } from 'd3-selection';

declare var window;

@Component({
  selector: 'svg-graph',
  templateUrl: './svg-graph.component.html',
  styleUrls: ['./svg-graph.component.css'],
  providers: [Node, Edge, GraphMetadata, RenderConfig]
})
export class SvgGraphComponent implements OnInit {

	nodes: Node[];
	edges: Edge[];
  // metadata: GraphMetadata;
  idct: number;

  state: any;

  // d3 objects, don't know how to give them a type.
  d3objects: any;

  constructor(private settings : RenderConfig) { 
  	console.log('D3 is loaded...' + d3);
  	this.nodes = [];
  	this.edges = [];
  	this.idct = 1;
    this.d3objects = {};

    this.state = {
        selectedNode: null,
        selectedEdge: null,
        mouseDownNode: null,
        mouseDownLink: null,
        justDragged: false,
        justScaleTransGraph: false,
        lastKeyDown: -1,
        shiftNodeDrag: false,
        selectedText: null
    };
  }

  ngOnInit() {
    var thisGraph = this;
    var d3objects = this.d3objects;

  	// Set the svg tag to the dimensions of the body
  	var bodyEl = document.getElementsByTagName('body')[0];

    var width = window.innerWidth || bodyEl.clientWidth;
    var height = window.innerHeight || bodyEl.clientHeight;

    var svg = d3.select('svg')
        .attr('width', width)
        .attr('height', height);
    d3objects.svg = svg;

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
    d3objects.dragLine = svgG.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0')
        .style('marker-end', 'url(#mark-end-arrow)');

    // svg nodes and edges
    d3objects.paths = svgG.append("g").selectAll("g");
    d3objects.boxes = svgG.append("g").selectAll("g");

    d3objects.drag = drag()
        .subject(function(d: any) {
            return { x: d.x, y: d.y };
        })
        .on("drag", function(args) {
            thisGraph.state.justDragged = true;
            thisGraph.dragmove.call(thisGraph, args);
        })
        .on("end", function() {
            // todo check if edge-mode is selected
        });

    // // listen for key events
    d3.select(window).on("keydown", function() {
            thisGraph.svgKeyDown.call(thisGraph);
        })
        .on("keyup", function() {
            thisGraph.svgKeyUp.call(thisGraph);
        });

    svg.on("mousedown", function(d) { thisGraph.svgMouseDown.call(thisGraph, d); });
    svg.on("mouseup", function(d) { thisGraph.svgMouseUp.call(thisGraph, d); });

    // Draw graph
  	this.updateGraph();
  }

  dragmove(d: any) {
    var d3objects = this.d3objects;
    if (NodeStates.shiftNodeDrag) {
        // draw path from item to the mouse coordinates in the graph (svgG means svg g.graph)
        var targetX = d3.mouse(d3objects.svgG.node())[0];
        var targetY = d3.mouse(d3objects.svgG.node())[1];

        d3objects.dragLine.attr('d', d3objects.stepLinePath(d.x, d.y, targetX, targetY));
    }
  }

  outputGraphMetadata() {

    // when user clicks saveButton, do this.
    var thisGraph = this;
    var saveEdges = [];
    thisGraph.edges.forEach(function(val, i) {
        saveEdges.push({ source: val.source.id, target: val.target.id });
    });

    thisGraph.nodes.forEach(function(node, i) {
        var dependencies = [];

        saveEdges.forEach(function(edge, i) {
            if (edge.target === node.id) {
                dependencies.push(edge.source);
            }
        });

        node.dep = dependencies;
    });

    var jsonObj = { "nodes": thisGraph.nodes, "edges": saveEdges };
    var blob = new Blob([window.JSON.stringify(jsonObj)], { type: "text/plain;charset=utf-8" });
    // saveAs(blob, "mydag.json");
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
              thisGraph.deleteGraph(true);
              thisGraph.nodes = jsonObj.nodes;
              thisGraph.idct = jsonObj.nodes.length + 1;
              var newEdges = jsonObj.edges;
              newEdges.forEach(function(e, i) {
                  newEdges[i] = {
                      source: thisGraph.nodes.filter(function(n) {
                          return n.id == e.source;
                      })[0],
                      target: thisGraph.nodes.filter(function(n) {
                          return n.id == e.target;
                      })[0]
                  };
              });
              thisGraph.edges = newEdges;
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

  // remove edges associated with a node
  spliceLinksForNode(node: Node) {
      var thisGraph = this,
          toSplice = thisGraph.edges.filter(function(l) {
              return (l.source === node || l.target === node);
          });
      toSplice.map(function(l) {
          thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
      });
  };

  replaceSelectEdge(d3Path: any, edgeData: Edge) {
      var thisGraph = this;
      d3Path.classed(GraphConsts.selectedClass, true);
      if (thisGraph.state.selectedEdge) {
          thisGraph.removeSelectFromEdge();
      }
      thisGraph.state.selectedEdge = edgeData;
  };

  replaceSelectNode(d3Node: any, nodeData: Node) {
      var thisGraph = this;
      d3Node.classed(GraphConsts.selectedClass, true);
      if (thisGraph.state.selectedNode) {
          thisGraph.removeSelectFromNode();
      }
      thisGraph.state.selectedNode = nodeData;
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

  pathMouseDown(d3path: any, d: any) {
      var thisGraph = this,
          state = thisGraph.state;

      event.sourceEvent.stopPropagation(); 
      state.mouseDownLink = d;

      if (state.selectedNode) {
          thisGraph.removeSelectFromNode();
      }

      var prevEdge = state.selectedEdge;
      if (!prevEdge || prevEdge !== d) {
          thisGraph.replaceSelectEdge(d3path, d);
      } else {
          thisGraph.removeSelectFromEdge();
      }
  };

  // mousedown on node
  boxMouseDown(d3node: any, d: any) {
      var d3objects = this.d3objects,
          state = this.state;

      var d3event = event;
debugger;
      // event.stopPropagation();
      state.mouseDownNode = d;
      if (event.shiftKey) {
          state.shiftNodeDrag = event.shiftKey;
          // reposition dragged directed edge
          d3objects.dragLine.classed('hidden', false)
              .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
          return;
      }
  };

  /* place editable text on node in place of svg text */
  changeTextOfNode(d3node: any, d: any) {
      var thisGraph = this;
      var d3objects = this.d3objects,
          consts = GraphConsts,
          htmlEl = d3node.node();

      d3node.selectAll("text[text-anchor]").remove();

      var nodeBCR = htmlEl.getBoundingClientRect(),
          curScale = nodeBCR.width / consts.nodeRadius,
          placePad = 5 * curScale,
          useHW = curScale > 1 ? nodeBCR.width * 0.71 : consts.nodeRadius * 1.42;
      // replace with editableconent text
      var d3txt = d3objects.svg.selectAll("foreignObject")
          .data([d])
          .enter()
          .append("foreignObject")
          .attr("x", nodeBCR.left + placePad)
          .attr("y", nodeBCR.top + placePad)
          .attr("height", 2 * useHW)
          .attr("width", useHW)
          .append("xhtml:p")
          .attr("id", consts.activeEditId)
          .attr("contentEditable", "true")
          .text(d.title)
          .on("mousedown", function(d) {
              event.sourceEvent.stopPropagation();
          })
          .on("keydown", function(d) {
              event.sourceEvent.stopPropagation();
              if (event.sourceEvent.keyCode == consts.ENTER_KEY && !event.sourceEvent.shiftKey) {
                  this.blur();
              }
          })
          .on("blur", function(d) {
              d.title = this.textContent;
              thisGraph.insertTitleLinebreaks(d3node, d.title);
              d3.select(this.parentElement).remove();
          });
      return d3txt;
  };

  // Returns the line path for a stepLine (we don't like diagonal lines...)
  stepLinePath(sourceX: number, sourceY: number, targetX: number, targetY: number) {
      var dx: number = targetX - sourceX;
      var dy: number = targetY - sourceY;

      var linePath = 'M' + sourceX + ',' + sourceY +
          'L' + (sourceX + (dx / 2)) + ',' + sourceY +
          'L' + (sourceX + (dx / 2)) + ',' + targetY +
          'L' + targetX + ',' + targetY;

      return linePath;

  };


  // mouseup on nodes
  boxMouseUp(d3node: any, d: any) {
      var thisGraph = this,
          d3objects = this.d3objects,
          state = this.state,
          consts = GraphConsts;
      // reset the states
      state.shiftNodeDrag = false;
      d3node.classed(consts.connectClass, false);

      var mouseDownNode = state.mouseDownNode;

      if (!mouseDownNode) return;

      d3objects.dragLine.classed("hidden", true);

      if (mouseDownNode !== d) {
          // we're in a different node: remove the old edge and create a new one for mousedown edge and add to graph
          var newEdge = { source: mouseDownNode, target: d };
          var filtRes = d3objects.paths.filter(function(d) {
              if (d.source === newEdge.target && d.target === newEdge.source) {
                  thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
              }
              return d.source === newEdge.source && d.target === newEdge.target;
          });
          if (!filtRes[0].length) {
              thisGraph.edges.push(newEdge);
              thisGraph.updateGraph();
          }
      } else {
          // we're in the same node
          if (state.justDragged) {
              // dragged, not clicked
              state.justDragged = false;
          } else {
              // clicked, not dragged
              if (event.sourceEvent.shiftKey) {
                  // shift-clicked node: edit text content
                  var d3txt = thisGraph.changeTextOfNode(d3node, d);
                  var txtNode = d3txt.node();

                  thisGraph.selectElementContents(txtNode);
                  txtNode.focus();
              } else {
                  if (state.selectedEdge) {
                      thisGraph.removeSelectFromEdge();
                  }
                  var prevNode = state.selectedNode;

                  if (!prevNode || prevNode.id !== d.id) {
                      thisGraph.replaceSelectNode(d3node, d);
                  } else {
                      thisGraph.removeSelectFromNode();
                  }
              }
          }
      }
      state.mouseDownNode = null;
      return;

  }; // end of boxes mouseup

  // mousedown on main svg
  svgMouseDown() {
      this.state.graphMouseDown = true;
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
      var d3txt = thisGraph.changeTextOfNode(d3objects.boxes.filter(function(dval) {
          return dval.id === newNode.id;
      }), newNode);
      var txtNode = d3txt.node();
      thisGraph.selectElementContents(txtNode);
      txtNode.focus();

      return newNode;
  };

  // mouseup on main svg
  svgMouseUp() {
      var thisGraph = this,
          d3objects = this.d3objects,
          state = thisGraph.state;
      if (state.justScaleTransGraph) {
          // dragged not clicked
          state.justScaleTransGraph = false;
      } else if (state.graphMouseDown && event.shiftKey) {

          // clicked not dragged from svg
          var mouseCoords = d3.mouse(d3objects.svgG.node());
          thisGraph.pushNewNode(mouseCoords);

      } else if (state.shiftNodeDrag) {
          // dragged from node
          state.shiftNodeDrag = false;
          d3objects.dragLine.classed("hidden", true);
      }
      state.graphMouseDown = false;
  };



  // RC: Create new serial edges
  pushNewSerialEdges(source: Node, target: Node, end: boolean) {

      var thisGraph = this;
      var settings = this.settings;
      var newEdge: Edge;

      if (end) {

          // For each edge in the entire graph
          for (var i in thisGraph.edges) {
              var edge = thisGraph.edges[i];

              // remember that target is the newNode & source is the one before it
              // we want the previous node to point to the newNode
              // source = endNode & target = newNode
              if (edge.target.id == source.id) {
                  // Modify edge and push it back into array so that it will be redrawn
                  edge.target = target;
              }
          } 

          // we want the newNode to point to the endNode
          newEdge = { source: target, target: source };
      }
      else {

          // For each edge in the entire graph
          for (var i in thisGraph.edges) {
              var edge = thisGraph.edges[i];

              // remember that target is the newNode & source is the one before it
              // we want the newNode to point to the node that had a dependency on source
              if (edge.source.id == source.id) {
                  // Modify edge and push it back into array so that it will be redrawn
                  edge.source = target;
              }
          } 

          newEdge = { source: source, target: target };
      }

      // Move the nodes down if a node is inserted in the middle
      for (var i in thisGraph.nodes) {
          if (thisGraph.nodes[i].x >= target.x && thisGraph.nodes[i] != target) {
              thisGraph.nodes[i].x += settings.nodeWidth * settings.pathMultiplier;
          }
      }

      thisGraph.edges.push(newEdge);
  };


  // RC: Create new parallel edges
  pushNewParallelEdges(source: Node, target: Node) {

      var thisGraph = this;
      var settings = this.settings;

      // For each edge in the entire graph
      for (var i in thisGraph.edges) {
          var edge = thisGraph.edges[i];

          // remember that target is the newNode & source is the one before it
          // we want the newNode to point to the node that had a dependency on source
          if (thisGraph.edges[i].target.id == source.id) {
              // This is the left edge
              var newEdge = JSON.parse(JSON.stringify(edge)); // clone the edge object
              newEdge.target = target; 
              thisGraph.edges.push(newEdge);
          }
          else if (thisGraph.edges[i].source.id == source.id) {
              // This is the left edge
              var newEdge = JSON.parse(JSON.stringify(edge)); // clone the edge object
              newEdge.source = target; 
              thisGraph.edges.push(newEdge);
          }
      } 

      // Move the nodes down if a node is inserted in the middle
      for (var i in thisGraph.nodes) {
          if (thisGraph.nodes[i].y >= target.y && thisGraph.nodes[i] != target) {
              thisGraph.nodes[i].y += settings.nodeHeight * settings.pathMultiplier;
          }
      }
  };

  // keydown on main svg
  svgKeyDown() {
      var thisGraph = this,
          state = this.state,
          consts = GraphConsts;
      // make sure repeated key presses don't register for each keydown
      if (state.lastKeyDown !== -1) return;

      state.lastKeyDown = event.sourceEvent.keyCode;
      var selectedNode = state.selectedNode,
          selectedEdge = state.selectedEdge;

      switch (event.sourceEvent.keyCode) {
          case consts.BACKSPACE_KEY:
          case consts.DELETE_KEY:
              event.sourceEvent.preventDefault();
              if (selectedNode) {
                  thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
                  thisGraph.spliceLinksForNode(selectedNode);
                  state.selectedNode = null;
                  thisGraph.updateGraph();
              } else if (selectedEdge) {
                  thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
                  state.selectedEdge = null;
                  thisGraph.updateGraph();
              }
              break;
      }
  };

  svgKeyUp() {
      this.state.lastKeyDown = -1;
  };

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
    startNode.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cx", settings.nodeHeight / 2 + 20)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .on("mouseup", function(d) {

            // RC: CREATE NEW NODE & EDGE
            var xycoords = [d.x + settings.nodeWidth * settings.pathMultiplier, d.y];
            var newNode:Node = thisGraph.pushNewNode(xycoords);
            var newEdge = thisGraph.pushNewSerialEdges(d, newNode, false);

            thisGraph.updateGraph();
        });

    // RC: This is used for Text boxes for putting icons... for some reason text needs to be in a group (g)
    startNode.each(function(d) {

        // For serial button
        d3.select(this).append("text")
            .text("+")
            .classed("btn-add-approver", true)
            .attr('font-size', function(d) {
                return settings.buttonFontSize + 'px'
            })
            .attr("dx", settings.nodeHeight / 2 + 20 - pxDifferenceToCenterFont)
            .attr("dy", pxDifferenceToCenterFont);

        thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // RC: Prepend addSerial button
    endNode.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cx", -(settings.nodeHeight / 2 + 20))
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .on("mouseup", function(d) {

            // RC: CREATE NEW NODE & EDGE
            var xycoords = [d.x, d.y];
            var newNode = thisGraph.pushNewNode(xycoords);
            var newEdge = thisGraph.pushNewSerialEdges(d, newNode, true);

            thisGraph.updateGraph();
        });

    // RC: This is used for Text boxes for putting icons... for some reason text needs to be in a group (g)
    endNode.each(function(d) {

        // For serial button
        d3.select(this).append("text")
            .text("+")
            .classed("btn-add-approver", true)
            .attr('font-size', function(d) {
                return settings.buttonFontSize + 'px'
            })
            .attr("dx", - (settings.nodeHeight / 2 + 20 + pxDifferenceToCenterFont))
            .attr("dy", pxDifferenceToCenterFont);

        thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });
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

    // var hiddenBoxGs = newGs.filter(function(d) {
    //   return this.getAttribute('class').includes("hidden-box"); 
    // });

    // // RC: Append hidden / invisible boxes for pretty parallel box rendering
    // hiddenBoxGs.append("rect")
    //     .attr("width", settings.nodeWidth)
    //     .attr("height", settings.nodeHeight)
    //     .style("fill", "white")
    //     .style("stroke", "gray")
    //     .style("stroke-width", 1)
    //     .attr("transform", function(d) {
    //         return "translate(-" + settings.nodeWidth / 2 + ", -" + settings.nodeHeight / 2 + ")";
    //     });


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



    // RC: Append addSerial button
    approvalBoxGs.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cx", settings.nodeWidth / 2 + 20)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .on("mouseup", function(d) {

            // RC: CREATE NEW NODE & EDGE
            var xycoords = [d.x + settings.nodeWidth * settings.pathMultiplier, d.y];
            var newNode:Node = thisGraph.pushNewNode(xycoords);
            thisGraph.pushNewSerialEdges(d, newNode, false);
            thisGraph.updateGraph();

            console.log("serial" + window.JSON.stringify(newNode));
        });


    // RC: Append addParallel button
    approvalBoxGs.append("circle")
        .attr("r", settings.buttonRadius)
        .attr("cy", settings.nodeHeight / 2 + 20)
        .style("fill", "white")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .on("mouseup", function(d) {

            // RC: CREATE NEW NODE & EDGE
            var xycoords = [d.x, d.y + settings.nodeHeight * settings.pathMultiplier];
            var newNode = thisGraph.pushNewNode(xycoords);
            thisGraph.pushNewParallelEdges(d, newNode);
            thisGraph.updateGraph();

            console.log("parallel" + window.JSON.stringify(newNode));
        });

    // RC: This is used for Text boxes for putting icons... for some reason text needs to be in a group (g)
    approvalBoxGs.each(function(d) {

        // For serial button
        d3.select(this).append("text")
            .text("+")
            .classed("btn-add-approver", true)
            .attr('font-size', function(d) {
                return settings.buttonFontSize + 'px'
            })
            .attr("dx", settings.nodeWidth / 2 + 20 - pxDifferenceToCenterFont)
            .attr("dy", pxDifferenceToCenterFont);

        // For parallel button
        d3.select(this).append("text")
            .text("+")
            .classed("btn-add-approver", true)
            .attr('font-size', function(d) {
                return settings.buttonFontSize + 'px'
            })
            .attr("dy", settings.nodeHeight / 2 + 20 + pxDifferenceToCenterFont)
            .attr("dx", -pxDifferenceToCenterFont);

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

    d3objects.paths = d3objects.paths.data(thisGraph.edges, function(d) {
        return String(d.source.id) + "+" + String(d.target.id);
    });

    // update existing paths
    var paths = d3objects.paths;

    paths.style('marker-end', 'url(#end-arrow)')
        .classed(consts.selectedClass, function(d) {
            return d === state.selectedEdge;
        })
        .attr("d", function(d) {
            return thisGraph.stepLinePath(d.source.x, d.source.y, d.target.x, d.target.y);
        });

    // add new paths
    paths.enter()
        .append("path")
        .style('marker-end', 'url(#end-arrow)')
        .attr("transform", function(d) {
            return "translate(" + settings.nodeWidth / 2 + ", " + settings.nodeHeight / 2 + ")";
        })
        .classed("link", true)
        .on("mousedown", function(d) {
            thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
        })
        .on("mouseup", function(d) {
            state.mouseDownLink = null;
        });

    // update old paths
    d3objects.paths.data(thisGraph.edges).attr("d", function(d) {
        // draw path from item to the mouse coordinates in the graph (svgG means svg g.graph)
        if (d.source.id == "startNode" || d.target.id == "endNode") {
            return thisGraph.stepLinePath(d.source.x, d.source.y, d.target.x, d.target.y);
        }
        else {
            var source = document.getElementById(d.source.id).getBoundingClientRect();
            var target = document.getElementById(d.target.id).getBoundingClientRect();

            return thisGraph.stepLinePath(source.left + settings.nodeWidth / 2, source.top + settings.nodeHeight / 2, target.left + settings.nodeWidth / 2, target.top + settings.nodeHeight / 2);
            // return thisGraph.stepLinePath(source.left, source.top+settings.nodeHeight/2, target.left, target.top+settings.nodeHeight/2);
        }
    });

    // remove old links
    paths.exit().remove();

  }

    // call to propagate changes to graph
    updateGraph() {

        var thisGraph = this,
            d3objects = this.d3objects,
            settings = this.settings,
            consts = GraphConsts,
            state = this.state;

        // update existing nodes
        d3objects.boxes = d3objects.boxes.data(thisGraph.nodes, function(d) {
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
            })
            .on("mouseover", function(d) {
              console.log("mouseover");
                if (state.shiftNodeDrag) {
                    d3.select(this).classed(consts.connectClass, true);
                }
            })
            .on("mouseout", function(d) {
              console.log("mouseout");
                d3.select(this).classed(consts.connectClass, false);
            })
            .on("mousedown", function(d) {
              console.log("mousedown");
                thisGraph.boxMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function(d) {
              console.log("mouseup");
                thisGraph.boxMouseUp.call(thisGraph, d3.select(this), d);
            })
            .call(d3objects.drag);

        this.renderStartEndNodes(newGs);
        this.updateApprovalBoxes(newGs);
        this.updatePaths();
    };

    // RC: Took this out because we don't want the graph to be zoomable
    //
    // GraphCreator.prototype.zoomed = function(){
    //   this.state.justScaleTransGraph = true;
    //   d3.select("." + this.consts.graphClass)
    //     .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    // };

    updateWindow(svg: any) {
        var docEl = document.documentElement,
            bodyEl = document.getElementsByTagName('body')[0];
        var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
        var y = window.innerHeight || docEl.clientHeight || bodyEl.clientHeight;
        svg.attr("width", x).attr("height", y);
    };

}
