import { Injectable } from '@angular/core';
@Injectable()
export class RenderConfig {
    appendElSpec: string;
    nodeWidth: number;
    nodeHeight: number;
    pathMultiplier: number;

    constructor() {
    	this.appendElSpec = "#graph";
    	this.nodeWidth = 300;
    	this.nodeHeight = 100;
    	this.pathMultiplier = 1.5;
    }
}
