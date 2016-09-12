import { Injectable } from '@angular/core';
@Injectable()
export class RenderConfig {
    appendElSpec: string;
    nodeWidth: number;
    nodeHeight: number;
    pathMultiplier: number;

    nodeRadius: number;
    buttonRadius: number;
    buttonFontSize: number;

    constructor() {
    	this.appendElSpec = "#graph";
    	this.nodeWidth = 230;
    	this.nodeHeight = 100;
    	this.pathMultiplier = 1.5;
        this.nodeRadius = 50;
        this.buttonRadius = 12;
        this.buttonFontSize = this.buttonRadius + 8;
    }
}
