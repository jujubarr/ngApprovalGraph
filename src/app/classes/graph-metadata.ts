import { Injectable } from '@angular/core';
import { Node, Edge } from './';
@Injectable()
export class GraphMetadata {
	node: Node[];
	edge: Edge[];
}
