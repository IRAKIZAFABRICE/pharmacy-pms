"use strict";
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeNode = exports.ManageTreeNodes = void 0;
exports.isCollectionNode = isCollectionNode;
const url_for_1 = __importDefault(require("sources/url_for"));
const pgadmin_1 = __importDefault(require("sources/pgadmin"));
const lodash_1 = __importDefault(require("lodash"));
const react_aspen_1 = require("react-aspen");
const tree_1 = require("./tree");
const gettext_1 = __importDefault(require("sources/gettext"));
const path_fx_1 = require("path-fx");
const api_instance_1 = __importStar(require("../api_instance"));
class ManageTreeNodes {
    constructor() {
        this.tree = {};
        this.tempTree = new TreeNode(undefined, {});
    }
    init = (_root) => new Promise((res) => {
        const node = { parent: null, children: [], data: null };
        this.tree = {};
        this.tree[_root] = { name: 'root', type: react_aspen_1.FileType.Directory, metadata: node };
        res();
    });
    updateNode = (_path, _data) => new Promise((res) => {
        const item = this.findNode(_path);
        if (item) {
            item.data = { ...item.data, ..._data };
            item.name = _data.label;
            item.metadata.data = _data;
        }
        res(true);
    });
    removeNode = async (_path) => {
        const item = this.findNode(_path);
        if (item?.parentNode) {
            item.children = [];
            item.parentNode.children.splice(item.parentNode.children.indexOf(item), 1);
        }
        return true;
    };
    findNode(path) {
        if (path === null || path === undefined || path.length === 0 || path == '/browser') {
            return this.tempTree;
        }
        return (0, tree_1.findInTree)(this.tempTree, path);
    }
    addNode = (_parent, _path, _data) => new Promise((res) => {
        _data.type = _data.inode ? react_aspen_1.FileType.Directory : react_aspen_1.FileType.File;
        _data._label = _data.label;
        _data.info_label = pgadmin_1.default.Browser.Nodes[_data._type]?.getNodeInfoLabel(_data);
        _data.label = lodash_1.default.escape(_data.label);
        _data.is_collection = isCollectionNode(_data._type);
        const nodeData = { parent: _parent, children: [], data: _data };
        const tmpParentNode = this.findNode(_parent);
        const treeNode = new TreeNode(_data.id, _data, {}, tmpParentNode, nodeData, _data.type);
        if (tmpParentNode !== null && tmpParentNode !== undefined)
            tmpParentNode.children.push(treeNode);
        res(treeNode);
    });
    readNode = async (_path) => {
        let temp_tree_path = _path;
        const node = this.findNode(_path);
        const base_url = pgadmin_1.default.Browser.URL;
        const api = (0, api_instance_1.default)();
        if (node && node.children.length > 0) {
            if (node.type !== react_aspen_1.FileType.File) {
                console.error(node, 'It\'s a leaf node');
                return [];
            }
            else if (node.children.length != 0) {
                return node.children;
            }
        }
        const self = this;
        let url = '';
        if (_path == '/browser') {
            url = (0, url_for_1.default)('browser.nodes');
        }
        else {
            const _parent_url = self.generate_url(_path);
            if (node.metadata.data._pid == null) {
                url = node.metadata.data._type + '/children/' + node.metadata.data._id;
            }
            else if (node.metadata.data._type.includes('coll-')) {
                const _type = node.metadata.data._type.replace('coll-', '');
                url = _type + '/nodes/' + _parent_url + '/';
            }
            else {
                url = node.metadata.data._type + '/children/' + _parent_url + '/' + node.metadata.data._id;
            }
            url = base_url + url;
            temp_tree_path = node.path;
            if (node.metadata.data._type == 'server' && !node.metadata.data.connected) {
                url = null;
            }
        }
        let treeData = [];
        if (url) {
            try {
                const res = await api.get(url);
                treeData = res.data.data;
            }
            catch (error) {
                /* react-aspen does not handle reject case */
                console.error(error);
                pgadmin_1.default.Browser.notifier.error((0, api_instance_1.parseApiError)(error) || 'Node Load Error...');
                return [];
            }
        }
        for (const idx in treeData) {
            const _node = treeData[idx];
            const _pathl = path_fx_1.unix.join(_path, _node.id);
            await self.addNode(temp_tree_path, _pathl, _node);
        }
        if (node.children.length > 0)
            return node.children;
        else {
            if (node.data && node.data._type == 'server' && node.data.connected) {
                pgadmin_1.default.Browser.notifier.info((0, gettext_1.default)('Server children are not available.'
                    + ' Please check these nodes are not hidden through the preferences setting `Browser > Nodes`.'), null);
            }
            return [];
        }
    };
    generate_url = (path) => {
        let _path = path;
        const _parent_path = [];
        let _partitions = [];
        while (_path != '/') {
            const node = this.findNode(_path);
            const _parent = path_fx_1.unix.dirname(_path);
            if (node.parentNode && node.parentNode.path == _parent) {
                if (node.parentNode.metadata.data !== null && !node.parentNode.metadata.data._type.includes('coll-'))
                    if (node.parentNode.metadata.data._type.includes('partition')) {
                        _partitions.push(node.parentNode.metadata.data._id);
                    }
                    else {
                        _parent_path.push(node.parentNode.metadata.data._id);
                    }
            }
            _path = _parent;
        }
        _partitions = _partitions.reverse();
        // Replace the table with the last partition as in reality partition node is not child of the table
        if (_partitions.length > 0)
            _parent_path[0] = _partitions[_partitions.length - 1];
        _parent_path.reverse();
        return _parent_path.join('/');
    };
}
exports.ManageTreeNodes = ManageTreeNodes;
class TreeNode {
    constructor(id, data, domNode, parent, metadata, type) {
        this.id = id;
        this.data = data;
        this.setParent(parent);
        this.children = [];
        this.domNode = domNode;
        this.metadata = metadata;
        this.name = metadata ? metadata.data.label : '';
        this.type = type || undefined;
    }
    hasParent() {
        return this.parentNode !== null && this.parentNode !== undefined;
    }
    parent() {
        return this.parentNode;
    }
    setParent(parent) {
        this.parentNode = parent;
        this.path = this.id;
        if (this.id)
            if (parent !== null && parent !== undefined && parent.path !== undefined) {
                this.path = parent.path + '/' + this.id;
            }
            else {
                this.path = '/browser/' + this.id;
            }
    }
    getData() {
        if (this.data === undefined) {
            return undefined;
        }
        else if (this.data === null) {
            return null;
        }
        return { ...this.data };
    }
    getHtmlIdentifier() {
        return this.domNode;
    }
    /*
     * Find the ancestor with matches this condition
     */
    ancestorNode(condition) {
        let node = this;
        while (node.hasParent()) {
            node = node.parent();
            if (condition(node)) {
                return node;
            }
        }
        return null;
    }
    /**
     * Given a condition returns true if the current node
     * or any of the parent nodes condition result is true
     */
    anyFamilyMember(condition) {
        if (condition(this)) {
            return true;
        }
        return this.ancestorNode(condition) !== null;
    }
    anyParent(condition) {
        return this.ancestorNode(condition) !== null;
    }
    reload(tree) {
        return new Promise((resolve) => {
            this.unload(tree)
                .then(() => {
                tree.setInode(this.domNode);
                tree.deselect(this.domNode);
                setTimeout(() => {
                    tree.selectNode(this.domNode);
                }, 0);
                resolve();
            });
        });
    }
    unload(tree) {
        return new Promise((resolve, reject) => {
            this.children = [];
            tree.unload(this.domNode)
                .then(() => {
                resolve(true);
            }, () => {
                reject(new Error());
            });
        });
    }
    open(tree, suppressNoDom) {
        return new Promise((resolve, reject) => {
            if (suppressNoDom && (this.domNode == null || typeof (this.domNode) === 'undefined')) {
                resolve(true);
            }
            else if (tree.isOpen(this.domNode)) {
                resolve(true);
            }
            else {
                tree.open(this.domNode).then(() => resolve(true), () => reject(new Error(true)));
            }
        });
    }
}
exports.TreeNode = TreeNode;
function isCollectionNode(node) {
    if (pgadmin_1.default.Browser.Nodes && node in pgadmin_1.default.Browser.Nodes) {
        if (pgadmin_1.default.Browser.Nodes[node].is_collection !== undefined)
            return pgadmin_1.default.Browser.Nodes[node].is_collection;
        else
            return false;
    }
    return false;
}
//# sourceMappingURL=tree_nodes.js.map