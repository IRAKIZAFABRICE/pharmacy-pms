"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTreeX = void 0;
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
const React = __importStar(require("react"));
const react_aspen_1 = require("react-aspen");
const aspen_decorations_1 = require("aspen-decorations");
const FileTreeItem_1 = require("../FileTreeItem");
const notificar_1 = require("notificar");
const types_1 = require("../types");
const keyboardHotkeys_1 = require("../services/keyboardHotkeys");
const react_virtualized_auto_sizer_1 = require("react-virtualized-auto-sizer");
class FileTreeX extends React.Component {
    fileTreeHandle;
    activeFileDec;
    pseudoActiveFileDec;
    activeFile;
    pseudoActiveFile;
    wrapperRef = React.createRef();
    events;
    disposables;
    keyboardHotkeys;
    fileTreeEvent;
    hoverTimeoutId = React.createRef();
    hoverDispatchId = React.createRef();
    constructor(props) {
        super(props);
        this.events = new notificar_1.Notificar();
        this.disposables = new notificar_1.DisposablesComposite();
        this.activeFileDec = new aspen_decorations_1.Decoration('active');
        this.pseudoActiveFileDec = new aspen_decorations_1.Decoration('pseudo-active');
    }
    render() {
        const { height, model, disableCache } = this.props;
        const { decorations } = model;
        return <div onKeyDown={this.handleKeyDown} className='file-tree' onBlur={this.handleBlur} onClick={this.handleClick} onScroll={this.props.onScroll} ref={this.wrapperRef} style={{
                height: height || 'calc(100vh - 60px)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                flex: 1
            }} tabIndex={-1}>
      <react_virtualized_auto_sizer_1.AutoSizer onResize={this.onResize} renderProp={({ width = 100, height = 100 }) => (<react_aspen_1.FileTree height={height} width={width} model={model} itemHeight={FileTreeItem_1.FileTreeItem.renderHeight} onReady={this.handleTreeReady} disableCache={disableCache || false}>
            {(props) => <FileTreeItem_1.FileTreeItem item={props.item} itemType={props.itemType} decorations={decorations.getDecorations(props.item)} onClick={this.handleItemClicked} onDoubleClick={this.handleItemDoubleClicked} onContextMenu={this.handleItemCtxMenu} onMouseEnter={this.onItemMouseEnter} onMouseLeave={this.onItemMouseLeave} changeDirectoryCount={this.changeDirectoryCount} events={this.events}/>}
          </react_aspen_1.FileTree>)}/>
    </div>;
    }
    componentDidMount() {
        for (const child of this.props.model.root.children) {
            this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'loaded', child);
        }
    }
    componentWillUnmount() {
        const { model } = this.props;
        model.decorations.removeDecoration(this.activeFileDec);
        model.decorations.removeDecoration(this.pseudoActiveFileDec);
        this.disposables.dispose();
    }
    handleTreeEvent = () => {
        this.fileTreeEvent = this.props.onEvent;
    };
    handleTreeReady = (handle) => {
        const { onReady, model } = this.props;
        const scrollDiv = this.wrapperRef.current?.querySelector('div')?.querySelector('div');
        if (this.props.onScroll) {
            scrollDiv?.addEventListener('scroll', (ev) => this.props.onScroll?.(ev));
        }
        this.fileTreeHandle = {
            ...handle,
            getModel: () => this.props.model,
            getActiveFile: () => this.activeFile,
            setActiveFile: this.setActiveFile,
            getPseudoActiveFile: () => this.pseudoActiveFile,
            setPseudoActiveFile: this.setPseudoActiveFile,
            toggleDirectory: this.toggleDirectory,
            closeDir: this.closeDir,
            newFile: async (dirOrPath) => this.supervisePrompt(await handle.promptNewFile(dirOrPath)),
            newFolder: async (dirOrPath) => this.supervisePrompt(await handle.promptNewDirectory(dirOrPath)),
            onBlur: (callback) => this.events.add(types_1.FileTreeXEvent.OnBlur, callback),
            hasDirectFocus: () => this.wrapperRef.current === document.activeElement,
            first: this.first,
            parent: this.parent,
            hasParent: this.hasParent,
            isOpen: this.isOpen,
            isClosed: this.isClosed,
            itemData: this.itemData,
            children: this.children,
            getItemFromDOM: this.getItemFromDOM,
            getDOMFromItem: this.getDOMFromItem,
            onTreeEvents: (callback) => this.events.add(types_1.FileTreeXEvent.onTreeEvents, callback),
            addIcon: this.addIcon,
            addCssClass: this.addCssClass,
            create: this.create,
            remove: this.remove,
            update: this.update,
            refresh: this.refresh,
            setLabel: this.setLabel,
            unload: this.unload,
            deSelectActiveFile: this.deSelectActiveFile,
            resize: this.resize,
            showLoader: this.showLoader,
            hideLoader: this.hideLoader,
            toggleItemLoader: this.toggleItemLoader,
        };
        model.decorations.addDecoration(this.activeFileDec);
        model.decorations.addDecoration(this.pseudoActiveFileDec);
        this.disposables.add(this.fileTreeHandle.onDidChangeModel((prevModel, newModel) => {
            this.setActiveFile(null);
            this.setPseudoActiveFile(null);
            prevModel.decorations.removeDecoration(this.activeFileDec);
            prevModel.decorations.removeDecoration(this.pseudoActiveFileDec);
            newModel.decorations.addDecoration(this.activeFileDec);
            newModel.decorations.addDecoration(this.pseudoActiveFileDec);
        }));
        this.disposables.add(this.fileTreeHandle.onBlur(() => {
            this.setPseudoActiveFile(null);
        }));
        this.keyboardHotkeys = new keyboardHotkeys_1.KeyboardHotkeys(this.fileTreeHandle, this.events);
        if (typeof onReady === 'function') {
            onReady(this.fileTreeHandle);
        }
    };
    onItemMouseEnter = (ev, item) => {
        clearTimeout(this.hoverDispatchId.current ?? undefined);
        this.hoverDispatchId.current = setTimeout(() => {
            clearTimeout(this.hoverTimeoutId.current ?? undefined);
            this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, ev, 'hovered', item);
        }, 500);
    };
    onItemMouseLeave = (ev) => {
        clearTimeout(this.hoverTimeoutId.current ?? undefined);
        clearTimeout(this.hoverDispatchId.current ?? undefined);
        this.hoverTimeoutId.current = setTimeout(() => {
            this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, ev, 'hovered', null);
        }, 100);
    };
    setActiveFile = async (fileOrDirOrPath, ensureVisible, align) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === this.props.model.root) {
            return;
        }
        if (this.activeFile !== fileH) {
            if (this.activeFile) {
                this.activeFileDec.removeTarget(this.activeFile);
            }
            if (fileH) {
                this.activeFileDec.addTarget(fileH, aspen_decorations_1.TargetMatchMode.Self);
            }
            this.activeFile = fileH;
            this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'selected', fileH);
            if (fileH && ensureVisible === true) {
                const alignTree = align ?? 'auto';
                await this.fileTreeHandle.ensureVisible(fileH, alignTree);
            }
        }
    };
    ensureVisible = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH) {
            await this.fileTreeHandle.ensureVisible(fileH);
        }
    };
    deSelectActiveFile = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === this.props.model.root) {
            return;
        }
        if (this.activeFile === fileH) {
            this.activeFileDec.removeTarget(this.activeFile);
            this.activeFile = null;
        }
        this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'deselected', fileH);
    };
    setPseudoActiveFile = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === this.props.model.root) {
            return;
        }
        if (this.pseudoActiveFile !== fileH) {
            if (this.pseudoActiveFile) {
                this.pseudoActiveFileDec.removeTarget(this.pseudoActiveFile);
            }
            if (fileH) {
                this.pseudoActiveFileDec.addTarget(fileH, aspen_decorations_1.TargetMatchMode.Self);
            }
            this.pseudoActiveFile = fileH;
        }
        if (fileH) {
            await this.fileTreeHandle.ensureVisible(fileH);
        }
        this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'selected', fileH);
    };
    create = async (parentDir, itemData) => {
        if (parentDir == undefined || parentDir == null) {
            parentDir = this.props.model.root;
        }
        const { create, model } = this.props;
        const isOpen = parentDir.isExpanded;
        let maybeFile = undefined;
        if (isOpen && (parentDir._children == null || parentDir._children.length == 0)) {
            await this.fileTreeHandle.closeDirectory(parentDir);
        }
        if (!parentDir.isExpanded && (parentDir._children == null || parentDir._children.length == 0)) {
            await this.fileTreeHandle.openDirectory(parentDir);
        }
        else {
            await this.fileTreeHandle.openDirectory(parentDir);
            maybeFile = await create(parentDir.path, itemData);
            if (maybeFile?.type && maybeFile?.name) {
                model.root.inotify({
                    type: react_aspen_1.WatchEvent.Added,
                    directory: parentDir.path,
                    file: maybeFile,
                });
            }
        }
        this.changeDirectoryCount(parentDir);
        const newItem = parentDir._children.find((c) => c._metadata.data.id === itemData.id);
        newItem.resolvedPathCache = newItem.parent.path + '/' + newItem._metadata.data.id;
        return newItem;
    };
    update = async (item, itemData) => {
        item._metadata.data = itemData;
        await this.props.update(item.path, itemData);
        this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'updated', item);
    };
    refresh = async (item) => {
        const isOpen = item.isExpanded;
        if (item.children && item.children.length > 0) {
            for (const entry of item.children) {
                await this.remove(entry).then(() => { }, () => { console.warn('Error removing item'); });
            }
        }
        if (isOpen) {
            const ref = FileTreeItem_1.FileTreeItem.itemIdToRefMap.get(item.id);
            if (ref) {
                this.showLoader(ref);
            }
            await this.fileTreeHandle.closeDirectory(item);
            await this.fileTreeHandle.openDirectory(item);
            await this.changeResolvePath(item);
            this.changeDirectoryCount(item);
            if (ref) {
                this.hideLoader(ref);
            }
        }
    };
    unload = async (item) => {
        const isOpen = item.isExpanded;
        if (item.children && item.children.length > 0) {
            for (const entry of item.children) {
                await this.remove(entry).then(() => { }, error => { console.warn(error); });
            }
        }
        if (isOpen) {
            await this.fileTreeHandle.closeDirectory(item);
            this.changeDirectoryCount(item);
        }
    };
    remove = async (item) => {
        const { remove, model } = this.props;
        const path = item.path;
        await remove(path, false);
        const dirName = model.root.pathfx.dirname(path);
        const fileName = model.root.pathfx.basename(path);
        const parent = item.parent;
        if (dirName === parent.path) {
            const item_1 = parent._children.find((c) => c._metadata && c._metadata.data.id === fileName);
            if (item_1) {
                parent.unlinkItem(item_1);
                if (parent._children.length == 0) {
                    parent._children = null;
                }
                this.changeDirectoryCount(parent);
                this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'removed', item);
            }
            else {
                console.warn('Item not found');
            }
        }
    };
    first = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === undefined || fileH === null) {
            return this.props.model.root.children[0];
        }
        if (fileH.branchSize > 0) {
            return fileH.children[0];
        }
        return null;
    };
    parent = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === react_aspen_1.FileType.Directory || fileH === react_aspen_1.FileType.File) {
            return fileH.parent;
        }
        return null;
    };
    hasParent = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === react_aspen_1.FileType.Directory || fileH === react_aspen_1.FileType.File) {
            return fileH.parent;
        }
        return false;
    };
    children = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === react_aspen_1.FileType.Directory) {
            return fileH.children;
        }
        return null;
    };
    isOpen = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === react_aspen_1.FileType.Directory) {
            return fileH.isExpanded;
        }
        return false;
    };
    isClosed = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === react_aspen_1.FileType.Directory || fileH === react_aspen_1.FileType.File) {
            return !fileH.isExpanded;
        }
        return false;
    };
    itemData = async (fileOrDirOrPath) => {
        const fileH = typeof fileOrDirOrPath === 'string'
            ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
            : fileOrDirOrPath;
        if (fileH === react_aspen_1.FileType.Directory || fileH === react_aspen_1.FileType.File) {
            return fileH._metadata.data;
        }
        return null;
    };
    setLabel = async (pathOrDir, label) => {
        const dir = typeof pathOrDir === 'string'
            ? await this.fileTreeHandle.getFileHandle(pathOrDir)
            : pathOrDir;
        const ref = FileTreeItem_1.FileTreeItem.itemIdToRefMap.get(dir.id);
        if (ref) {
            ref.style.background = 'none';
            const label$ = ref.querySelector('span.file-name');
            if (label$) {
                if (typeof (label) == 'object' && label.label) {
                    label = label.label;
                }
                label$.textContent = label;
            }
        }
    };
    changeDirectoryCount = async (pathOrDir) => {
        const dir = typeof pathOrDir === 'string'
            ? await this.fileTreeHandle.getFileHandle(pathOrDir)
            : pathOrDir;
        if (dir.type === react_aspen_1.FileType.Directory && dir._metadata.data && dir._metadata.data.is_collection === true) {
            const ref = FileTreeItem_1.FileTreeItem.itemIdToRefMap.get(dir.id);
            if (ref) {
                ref.style.background = 'none';
                const label$ = ref.querySelector('span.children-count');
                if (dir.children && dir.children.length > 0) {
                    label$.textContent = '(' + dir.children.length + ')';
                }
                else {
                    label$.textContent = '';
                }
            }
        }
    };
    closeDir = async (pathOrDir) => {
        const dir = typeof pathOrDir === 'string'
            ? await this.fileTreeHandle.getFileHandle(pathOrDir)
            : pathOrDir;
        if (dir.type === react_aspen_1.FileType.Directory) {
            if (dir.expanded) {
                this.fileTreeHandle.closeDirectory(dir);
                this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'closed', dir);
            }
        }
    };
    toggleDirectory = async (pathOrDir) => {
        const dir = typeof pathOrDir === 'string'
            ? await this.fileTreeHandle.getFileHandle(pathOrDir)
            : pathOrDir;
        if (dir.type === react_aspen_1.FileType.Directory) {
            if (dir.expanded) {
                this.fileTreeHandle.closeDirectory(dir);
                this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'closed', dir);
            }
            else {
                const ref = FileTreeItem_1.FileTreeItem.itemIdToRefMap.get(dir.id);
                if (ref) {
                    this.showLoader(ref);
                }
                await this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'beforeopen', dir);
                await this.fileTreeHandle.openDirectory(dir);
                await this.changeResolvePath(dir);
                if (ref) {
                    this.hideLoader(ref);
                }
                this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, window.event, 'opened', dir);
            }
        }
    };
    addIcon = async (pathOrDir, icon) => {
        const dir = typeof pathOrDir === 'string'
            ? await this.fileTreeHandle.getFileHandle(pathOrDir)
            : pathOrDir;
        const ref = FileTreeItem_1.FileTreeItem.itemIdToRefMap.get(dir.id);
        if (ref) {
            const label$ = ref.querySelector('.file-label i');
            label$.className = icon.icon;
        }
    };
    addCssClass = async (pathOrDir, cssClass) => {
        const dir = typeof pathOrDir === 'string'
            ? await this.fileTreeHandle.getFileHandle(pathOrDir)
            : pathOrDir;
        const ref = FileTreeItem_1.FileTreeItem.itemIdToRefMap.get(dir.id);
        if (ref) {
            ref.classList.add(cssClass);
            if (!dir._metadata.data.extraClasses)
                dir._metadata.data.extraClasses = [];
            dir._metadata.data.extraClasses.push(cssClass);
        }
    };
    toggleItemLoader = (item, show = false) => {
        const ref = FileTreeItem_1.FileTreeItem.itemIdToRefMap.get(item.id);
        if (ref) {
            if (show) {
                this.showLoader(ref);
            }
            else {
                this.hideLoader(ref);
            }
        }
    };
    showLoader = (ref) => {
        // get label ref and add loading class
        ref.style.background = 'none';
        const label$ = ref.querySelector('i.directory-toggle');
        if (label$)
            label$.classList.add('loading');
    };
    hideLoader = (ref) => {
        // remove loading class.
        ref.style.background = 'none';
        const label$ = ref.querySelector('i.directory-toggle');
        if (label$)
            label$.classList.remove('loading');
    };
    handleBlur = () => {
        this.events.dispatch(types_1.FileTreeXEvent.OnBlur);
    };
    handleItemClicked = async (ev, item, type) => {
        if (type === react_aspen_1.ItemType.Directory && ev.target.className.includes('directory-toggle')) {
            await this.toggleDirectory(item);
        }
        await this.setActiveFile(item);
    };
    handleItemDoubleClicked = async (ev, item) => {
        await this.toggleDirectory(item);
        await this.setActiveFile(item);
    };
    getItemFromDOM = (clientReact) => {
        return FileTreeItem_1.FileTreeItem.refToItemIdMap.get(clientReact);
    };
    getDOMFromItem = (item) => {
        return FileTreeItem_1.FileTreeItem.itemIdToRefMap.get(item.id);
    };
    handleClick = (ev) => {
        // clicked in "blank space"
        if (ev.currentTarget === ev.target) {
            this.setPseudoActiveFile(null);
        }
    };
    handleItemCtxMenu = (ev, item) => {
        return this.props.onContextMenu?.(ev, item);
    };
    handleKeyDown = (ev) => {
        return this.keyboardHotkeys.handleKeyDown(ev);
    };
    onResize = () => {
        if (this.wrapperRef.current != null) {
            this.resize();
        }
    };
    resize = (scrollX, scrollY) => {
        const scrollXPos = scrollX || 0;
        const scrollYPos = scrollY || this.props.model.state.scrollOffset;
        const div = this.wrapperRef.current.querySelector('div').querySelector('div');
        if (div) {
            div.scroll(scrollXPos, scrollYPos);
        }
    };
    changeResolvePath = async (item) => {
        // Change the path as per pgAdmin requirement: Item Id wise
        if (item.type === react_aspen_1.FileType.File) {
            item.resolvedPathCache = item.parent.path + '/' + item._metadata.data.id;
        }
        if (item.type === react_aspen_1.FileType.Directory && item.children && item.children.length > 0) {
            for (const entry of item.children) {
                entry.resolvedPathCache = entry.parent.path + '/' + entry._metadata.data.id;
            }
        }
    };
}
exports.FileTreeX = FileTreeX;
//# sourceMappingURL=index.js.map