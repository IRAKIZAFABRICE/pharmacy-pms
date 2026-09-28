"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeModelX = void 0;
const react_aspen_1 = require("react-aspen");
const aspen_decorations_1 = require("aspen-decorations");
class TreeModelX extends react_aspen_1.TreeModel {
    decorations;
    constructor(host, mountPath) {
        super(host, mountPath);
        this.decorations = new aspen_decorations_1.DecorationsManager(this.root);
    }
}
exports.TreeModelX = TreeModelX;
//# sourceMappingURL=index.js.map