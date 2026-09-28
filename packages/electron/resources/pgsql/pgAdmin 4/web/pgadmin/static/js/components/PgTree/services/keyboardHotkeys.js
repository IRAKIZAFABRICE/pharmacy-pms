"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyboardHotkeys = void 0;
const react_aspen_1 = require("react-aspen");
const types_1 = require("../types");
class KeyboardHotkeys {
    fileTreeX;
    events;
    hotkeyActions = {
        'ArrowUp': () => this.jumpToPrevItem(),
        'ArrowDown': () => this.jumpToNextItem(),
        'ArrowRight': () => this.expandOrJumpToFirstChild(),
        'ArrowLeft': () => this.collapseOrJumpToFirstParent(),
        'Space': () => this.toggleDirectoryExpand(),
        'Enter': () => this.selectFileOrToggleDirState(),
        'Home': () => this.jumpToFirstItem(),
        'End': () => this.jumpToLastItem(),
        'Escape': () => this.resetSteppedOrSelectedItem(),
        'Ctrl+KeyC': () => this.copyEntry(),
    };
    constructor(fileTreeX, events) {
        this.fileTreeX = fileTreeX;
        this.events = events;
    }
    handleKeyDown = (ev) => {
        if (!this.fileTreeX.hasDirectFocus()) {
            return false;
        }
        let { code } = ev.nativeEvent;
        if ((ev.nativeEvent.ctrlKey || ev.nativeEvent.metaKey) && ev.nativeEvent.key !== 'Control') {
            code = `Ctrl+${code}`;
        }
        if (code in this.hotkeyActions) {
            ev.preventDefault();
            this.hotkeyActions[code]();
            return true;
        }
    };
    jumpToFirstItem = () => {
        const { root } = this.fileTreeX.getModel();
        this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(0), true);
    };
    jumpToLastItem = () => {
        const { root } = this.fileTreeX.getModel();
        this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(root.branchSize - 1), true);
    };
    jumpToNextItem = () => {
        const { root } = this.fileTreeX.getModel();
        let currentPseudoActive = this.fileTreeX.getActiveFile();
        if (!currentPseudoActive) {
            const selectedFile = this.fileTreeX.getActiveFile();
            if (selectedFile) {
                currentPseudoActive = selectedFile;
            }
            else {
                return this.jumpToFirstItem();
            }
        }
        const idx = root.getIndexAtFileEntry(currentPseudoActive);
        if (idx + 1 > root.branchSize) {
            return this.jumpToFirstItem();
        }
        else if (idx > -1) {
            this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(idx + 1), true);
        }
    };
    jumpToPrevItem = () => {
        const { root } = this.fileTreeX.getModel();
        let currentPseudoActive = this.fileTreeX.getActiveFile();
        if (!currentPseudoActive) {
            const selectedFile = this.fileTreeX.getActiveFile();
            if (selectedFile) {
                currentPseudoActive = selectedFile;
            }
            else {
                return this.jumpToLastItem();
            }
        }
        const idx = root.getIndexAtFileEntry(currentPseudoActive);
        if (idx - 1 < 0) {
            return this.jumpToLastItem();
        }
        else if (idx > -1) {
            this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(idx - 1), true);
        }
    };
    expandOrJumpToFirstChild() {
        const currentPseudoActive = this.fileTreeX.getActiveFile();
        if (currentPseudoActive && currentPseudoActive.type === react_aspen_1.FileType.Directory) {
            if (currentPseudoActive.expanded) {
                return this.jumpToNextItem();
            }
            else {
                this.fileTreeX.openDirectory(currentPseudoActive);
            }
        }
    }
    collapseOrJumpToFirstParent() {
        const currentPseudoActive = this.fileTreeX.getActiveFile();
        if (currentPseudoActive) {
            if (currentPseudoActive.type === react_aspen_1.FileType.Directory && currentPseudoActive.expanded) {
                return this.fileTreeX.closeDirectory(currentPseudoActive);
            }
            this.fileTreeX.setActiveFile(currentPseudoActive.parent, true);
        }
    }
    selectFileOrToggleDirState = () => {
        const currentPseudoActive = this.fileTreeX.getActiveFile();
        if (!currentPseudoActive) {
            return;
        }
        if (currentPseudoActive.type === react_aspen_1.FileType.Directory) {
            this.fileTreeX.toggleDirectory(currentPseudoActive);
        }
        else if (currentPseudoActive.type === react_aspen_1.FileType.File) {
            this.fileTreeX.setActiveFile(currentPseudoActive, true);
        }
    };
    toggleDirectoryExpand = () => {
        const currentPseudoActive = this.fileTreeX.getActiveFile();
        if (!currentPseudoActive) {
            return;
        }
        if (currentPseudoActive.type === react_aspen_1.FileType.Directory) {
            this.fileTreeX.toggleDirectory(currentPseudoActive);
        }
    };
    resetSteppedOrSelectedItem = () => {
        const currentPseudoActive = this.fileTreeX.getActiveFile();
        if (currentPseudoActive) {
            return this.resetSteppedItem();
        }
        this.fileTreeX.setActiveFile(null);
    };
    resetSteppedItem = () => {
        this.fileTreeX.setActiveFile(null);
    };
    copyEntry = () => {
        const currentPseudoActive = this.fileTreeX.getActiveFile();
        this.events.dispatch(types_1.FileTreeXEvent.onTreeEvents, null, 'copied', currentPseudoActive);
    };
}
exports.KeyboardHotkeys = KeyboardHotkeys;
//# sourceMappingURL=keyboardHotkeys.js.map