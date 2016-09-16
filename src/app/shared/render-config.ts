import { Injectable } from '@angular/core';
@Injectable()
export class RenderConfig {
    appendElSpec: string;

    // node box dimensions (px)
    nodeWidth: number;
    nodeHeight: number;

    // path offset (spacing between each node) nodWidth multiplier
    pathMultiplier: number;

    // radius (px)
    nodeRadius: number;
    buttonRadius: number;
    buttonFontSize: number;

    // coordinates to start drawing the nodes (px)
    startX: number;
    startY: number;

    // initial width & height of svg (px)
    initSvgWidth: number;
    initSvgHeight: number;

    constructor() {
    	this.appendElSpec = "#graph";
    	this.nodeWidth = 230;
    	this.nodeHeight = 100;
    	this.pathMultiplier = 1.5;
        this.nodeRadius = 50;
        this.buttonRadius = 12;
        this.buttonFontSize = this.buttonRadius + 8;
        this.startX = 100;
        this.startY = 100;
        this.initSvgWidth = 900;
        this.initSvgHeight = 400;
    }
}
