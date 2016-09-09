import { Node } from './';
import { Injectable } from '@angular/core';
@Injectable()
export class Edge {
	source: Node;
	target: Node;
}
