import { Injectable } from '@angular/core';
import { Node, Edge } from './';
@Injectable()
export class GraphMetadata {
	nodes: Node[];
	edges: Edge[];
	// this might cause problems cause the metadata for edges is different from edge

	constructor() {
		this.nodes = [];
		this.edges = [];
	}
}
