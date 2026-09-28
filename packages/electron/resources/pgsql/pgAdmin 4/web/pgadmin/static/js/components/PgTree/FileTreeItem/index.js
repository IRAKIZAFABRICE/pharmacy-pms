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
exports.FileTreeItem = void 0;
const classnames_1 = __importDefault(require("classnames"));
const React = __importStar(require("react"));
const react_aspen_1 = require("react-aspen");
const types_1 = require("../types");
const lodash_1 = __importDefault(require("lodash"));
const DoubleClickHandler_1 = __importDefault(require("./DoubleClickHandler"));
// DO NOT EXTEND FROM PureComponent!!! You might miss critical changes made deep within `item` prop
// as far as efficiency is concerned, `react-aspen` works hard to ensure unnecessary updates are ignored
class FileTreeItem extends React.Component {
    static getBoundingClientRectForItem(item) {
        const divRef = FileTreeItem.itemIdToRefMap.get(item.id);
        if (divRef) {
            return divRef.getBoundingClientRect();
        }
        return null;
    }
    // ensure this syncs up with what goes in CSS, (em, px, % etc.) and what ultimately renders on the page
    static renderHeight = 24;
    static itemIdToRefMap = new Map();
    static refToItemIdMap = new Map();
    fileTreeEvent;
    constructor(props) {
        super(props);
        // used to apply decoration changes, you're welcome to use setState or other mechanisms as you see fit
        this.forceUpdate = this.forceUpdate.bind(this);
    }
    render() {
        const { item, itemType, decorations } = this.props;
        const isRenamePrompt = itemType === react_aspen_1.ItemType.RenamePrompt;
        const isNewPrompt = itemType === react_aspen_1.ItemType.NewDirectoryPrompt || itemType === react_aspen_1.ItemType.NewFilePrompt;
        const isDirExpanded = itemType === react_aspen_1.ItemType.Directory
            ? item.expanded
            : itemType === react_aspen_1.ItemType.RenamePrompt && item.target.type === react_aspen_1.FileType.Directory
                ? item.target.expanded
                : false;
        const fileOrDir = (itemType === react_aspen_1.ItemType.File ||
            itemType === react_aspen_1.ItemType.NewFilePrompt ||
            (itemType === react_aspen_1.ItemType.RenamePrompt && item.target.constructor === react_aspen_1.FileEntry))
            ? 'file'
            : 'directory';
        if (this.props.item.parent?.parent && this.props.item.parent?.path) {
            this.props.item.resolvedPathCache = this.props.item.parent.path + '/' + this.props.item._metadata.data.id;
        }
        const itemChildren = item.children && item.children.length > 0 && item._metadata.data._type.indexOf('coll-') !== -1 ? '(' + item.children.length + ')' : '';
        const extraClasses = item._metadata.data.extraClasses ? item._metadata.data.extraClasses.join(' ') : '';
        const tags = item._metadata.data?.tags ?? [];
        return (<DoubleClickHandler_1.default onDoubleClick={this.handleDoubleClick} onSingleClick={this.handleClick}>
        <div className={(0, classnames_1.default)('file-entry', {
                renaming: isRenamePrompt,
                prompt: isRenamePrompt || isNewPrompt,
                new: isNewPrompt,
            }, fileOrDir, decorations ? decorations.classlist : null, `depth-${item.depth}`, extraClasses)} data-depth={item.depth} onContextMenu={this.handleContextMenu} onDragStart={this.handleDragStartItem} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} onKeyDown={() => { }} 
        // required for rendering context menus when opened through context menu button on keyboard
        ref={this.handleDivRef} draggable={true}>

          {!isNewPrompt && fileOrDir === 'directory' ?
                <i className={(0, classnames_1.default)('directory-toggle', isDirExpanded ? 'open' : '')}/>
                : null}

          <span className='file-label'>{item._metadata?.data?.icon ?
                <i className={(0, classnames_1.default)('file-icon', item._metadata?.data?.icon ? item._metadata.data.icon : fileOrDir)}/> : null}
          <span className='file-name'>
            {lodash_1.default.unescape(this.props.item.getMetadata('data')._label)}
          </span>
          <span className="text-muted" style={{ fontSize: '0.9em', whiteSpace: 'nowrap' }}>
            {lodash_1.default.unescape(this.props.item.getMetadata('data').info_label)}
          </span>
          <span className='children-count'>{itemChildren}</span>
          {tags.map((tag) => (<div key={tag.text} className='file-tag' style={{ '--tag-color': tag.color }}>
              {tag.text}
            </div>))}
          </span>
        </div>
      </DoubleClickHandler_1.default>);
    }
    componentDidMount() {
        this.events = this.props.events;
        this.props.item.resolvedPathCache = this.props.item.parent.path + '/' + this.props.item._metadata.data.id;
        if (this.props.decorations) {
            this.props.decorations.addChangeListener(this.forceUpdate);
        }
        this.setFileLoaded(this.props.item);
    }
    setFileLoaded = async (FileOrDir) => {
        this.props.changeDirectoryCount(FileOrDir.parent);
        if (FileOrDir._loaded !== true) {
            this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'added', FileOrDir);
        }
        FileOrDir._loaded = true;
    };
    componentWillUnmount() {
        if (this.props.decorations) {
            this.props.decorations.removeChangeListener(this.forceUpdate);
        }
    }
    componentDidUpdate(prevProps) {
        if (prevProps.decorations) {
            prevProps.decorations.removeChangeListener(this.forceUpdate);
        }
        if (this.props.decorations) {
            this.props.decorations.addChangeListener(this.forceUpdate);
        }
    }
    handleDivRef = (r) => {
        if (r === null) {
            FileTreeItem.itemIdToRefMap.delete(this.props.item.id);
        }
        else {
            FileTreeItem.itemIdToRefMap.set(this.props.item.id, r);
            FileTreeItem.refToItemIdMap.set(r, this.props.item);
        }
    };
    handleContextMenu = (ev) => {
        const { item, itemType, onContextMenu } = this.props;
        if (itemType === react_aspen_1.ItemType.File || itemType === react_aspen_1.ItemType.Directory) {
            onContextMenu(ev, item);
        }
    };
    handleClick = (ev) => {
        const { item, itemType, onClick } = this.props;
        if (itemType === react_aspen_1.ItemType.File || itemType === react_aspen_1.ItemType.Directory) {
            onClick(ev, item, itemType);
        }
    };
    handleDoubleClick = (ev) => {
        const { item, itemType, onDoubleClick } = this.props;
        if (itemType === react_aspen_1.ItemType.File || itemType === react_aspen_1.ItemType.Directory) {
            onDoubleClick(ev, item, itemType);
        }
    };
    handleMouseEnter = (ev) => {
        const { item, itemType, onMouseEnter } = this.props;
        if (itemType === react_aspen_1.ItemType.File || itemType === react_aspen_1.ItemType.Directory) {
            onMouseEnter?.(ev, item);
        }
    };
    handleMouseLeave = (ev) => {
        const { item, itemType, onMouseLeave } = this.props;
        if (itemType === react_aspen_1.ItemType.File || itemType === react_aspen_1.ItemType.Directory) {
            onMouseLeave?.(ev, item);
        }
    };
    handleDragStartItem = (e) => {
        const { item, itemType, events } = this.props;
        if (itemType === react_aspen_1.ItemType.File || itemType === react_aspen_1.ItemType.Directory) {
            const ref = FileTreeItem.itemIdToRefMap.get(item.id);
            if (ref) {
                events.dispatch(types_1.FileTreeXEvent.onTreeEvents, e, 'dragstart', item);
            }
        }
    };
}
exports.FileTreeItem = FileTreeItem;
//# sourceMappingURL=index.js.map