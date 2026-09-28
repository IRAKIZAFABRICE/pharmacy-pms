import { IFileTreeHandle, FileEntry, Directory, FileType, IFileEntryItem, IItemRenderer, FileOrDir } from 'react-aspen';
import { IDisposable } from 'notificar';
import { TreeModelX } from './TreeModelX';
import React from 'react';
export interface IFileTreeXTriggerEvents {
    onEvent(event: string, path: string): boolean | Promise<boolean>;
}
export interface IItemRendererX extends IItemRenderer {
    getBoundingClientRectForItem(item: FileEntry | Directory): DOMRect;
}
export interface IFileTreeXHandle extends IFileTreeHandle {
    getActiveFile(): FileEntry | Directory;
    setActiveFile(path: string): any;
    setActiveFile(file: FileEntry): any;
    setActiveFile(dir: Directory): any;
    getPseudoActiveFile(): FileEntry | Directory;
    setPseudoActiveFile(path: string): any;
    setPseudoActiveFile(file: FileEntry): any;
    setPseudoActiveFile(dir: Directory): any;
    rename(path: string): any;
    rename(file: FileEntry): any;
    rename(dir: Directory): any;
    newFile(dirpath: string): any;
    newFile(dir: Directory): any;
    newFolder(dirpath: string): any;
    newFolder(dir: Directory): any;
    toggleDirectory(path: string): any;
    toggleDirectory(dir: Directory): any;
    first(file: FileEntry): FileEntry | Directory;
    first(dir: Directory): FileEntry | Directory;
    first(): FileEntry | Directory;
    parent(file: FileEntry): Directory;
    parent(dir: Directory): Directory;
    hasParent(file: FileEntry): boolean;
    hasParent(dir: Directory): boolean;
    isOpen(file: FileEntry): boolean;
    isOpen(dir: Directory): boolean;
    isClosed(file: FileEntry): boolean;
    isClosed(dir: Directory): boolean;
    itemData(file: FileEntry): array;
    itemData(dir: Directory): array;
    children(file: FileEntry): array;
    children(dir: Directory): array;
    getModel(): TreeModelX;
    /**
     * If document.activeElement === filetree wrapper element
     */
    hasDirectFocus(): boolean;
    onBlur(callback: () => void): IDisposable;
}
export interface IFileTreeXProps {
    height: number;
    width: number;
    model: TreeModelX;
    /**
     * Same as unix's `mv` command as in `mv [SOURCE] [DEST]`
     */
    mv: (oldPath: string, newPath: string) => boolean | Promise<boolean>;
    /**
     * Amalgam of unix's `mkdir` and `touch` command
     */
    create: (path: string, type: FileType) => IFileEntryItem | Promise<IFileEntryItem>;
    onReady?: (handle: IFileTreeXHandle) => void;
    onEvent?: (event: IFileTreeXTriggerEvents) => void;
    onContextMenu?: (ev: React.MouseEvent, item?: FileOrDir) => void;
    onScroll?: (ev: React.UIEvent<HTMLDivElement>) => void;
}
export declare enum FileTreeXEvent {
    OnBlur = 0,
    onTreeEvents = 1
}
//# sourceMappingURL=types.d.ts.map