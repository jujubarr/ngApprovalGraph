import * as D3 from 'd3';
import { Component, OnInit } from '@angular/core';
import { Node, Edge, RenderConfig, GraphConsts, NodeStates } from '../classes';

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

    // Draw graph
  	this.updateGraph();
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

      var nodeBCR = htmlEl.getBoundingClientRect(),
          curScale = nodeBCR.width / settings.nodeRadius,
          placePad = 5 * curScale,
          useHW = curScale > 1 ? nodeBCR.width * 0.71 : settings.nodeRadius * 1.42;
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

  deleteNode(selectedNode: Node) {
      var thisGraph = this,
          state = this.state;

      if (selectedNode) {
          thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
          thisGraph.spliceLinksForNode(selectedNode);
          state.selectedNode = null;
          thisGraph.updateGraph();

          // TODO: push new edges that reconects the nodes
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
    var xycoords = [d.x, d.y + settings.nodeHeight * settings.pathMultiplier];
    var newNode = this.pushNewNode(xycoords);
    this.pushNewParallelEdges(d, newNode);
    this.updateGraph();

    console.log("parallel" + window.JSON.stringify(newNode));
  }

  // RC: create new serial node with edge
  appendSerialNode(d: any) {
    var settings = this.settings;
    var xycoords = [d.x + settings.nodeWidth * settings.pathMultiplier, d.y];
    var newNode:Node = this.pushNewNode(xycoords);
    this.pushNewSerialEdges(d, newNode, false);
    this.updateGraph();

    console.log("serial" + window.JSON.stringify(newNode));
  }

  // RC: create new serial node with edge (used for EndNode)
  prependSerialNode(d: any) {
    var xycoords = [d.x, d.y];
    var newNode = this.pushNewNode(xycoords);
    this.pushNewSerialEdges(d, newNode, true);

    this.updateGraph();
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

    d3objects.paths = d3objects.paths.data(thisGraph.edges, function(d) {
        return String(d.source.id) + "+" + String(d.target.id);
    });

    // update existing paths
    var paths = d3objects.paths;

    paths.style('marker-end', 'url(#end-arrow)')
        .classed(consts.selectedClass, function(d) {
            return d === state.selectedEdge;
        });

    // add new paths
    paths.enter()
        .append("path")
        .style('marker-end', 'url(#end-arrow)')
        .attr("d", function(d) {
            return thisGraph.stepLinePath(d.source.x, d.source.y, d.target.x, d.target.y);
        })
        .attr("stroke-width", "6px")
        .attr("stroke", "#333")
        .attr("fill", "none")
        .classed("link", true);

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
          });

      this.renderStartEndNodes(newGs);
      this.updateApprovalBoxes(newGs);
      this.updatePaths();
  };


  updateWindow(svg: any) {
      var docEl = document.documentElement,
          bodyEl = document.getElementsByTagName('body')[0];
      var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
      var y = window.innerHeight || docEl.clientHeight || bodyEl.clientHeight;
      svg.attr("width", x).attr("height", y);
  };

}
