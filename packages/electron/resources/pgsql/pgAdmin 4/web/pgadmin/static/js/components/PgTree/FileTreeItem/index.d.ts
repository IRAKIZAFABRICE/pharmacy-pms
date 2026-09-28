import * as React from 'react';
import { ClasslistComposite } from 'aspen-decorations';
import { Directory, FileEntry, IItemRendererProps, ItemType } from 'react-aspen';
import { FileTreeXEvent } from '../types';
import { Notificar } from 'notificar';
interface IItemRendererXProps {
    /**
     * In this implementation, decoration are null when item is `PromptHandle`
     *
     * If you would like decorations for `PromptHandle`s, then get them using `DecorationManager#getDecorations(<target>)`.
     * Where `<target>` can be either `NewFilePromptHandle.parent` or `RenamePromptHandle.target` depending on type of `PromptHandle`
     *
     * To determine the type of `PromptHandle`, use `IItemRendererProps.itemType`
     */
    decorations: ClasslistComposite;
    onClick: (ev: React.MouseEvent, item: FileEntry | Directory, type: ItemType) => void;
    onContextMenu: (ev: React.MouseEvent, item: FileEntry | Directory) => void;
    onMouseEnter: (ev: React.MouseEvent, item: FileEntry | Directory) => void;
    onMouseLeave: (ev: React.MouseEvent, item: FileEntry | Directory) => void;
    onItemHovered: (ev: React.MouseEvent, item: FileEntry | Directory, type: ItemType) => void;
    events: Notificar<FileTreeXEvent>;
}
export declare class FileTreeItem extends React.Component<IItemRendererXProps & IItemRendererProps> {
    static getBoundingClientRectForItem(item: FileEntry | Directory): DOMRect;
    static readonly renderHeight: number;
    private static readonly itemIdToRefMap;
    private static readonly refToItemIdMap;
    private readonly fileTreeEvent;
    constructor(props: any);
    render(): React.JSX.Element;
    componentDidMount(): void;
    private readonly setFileLoaded;
    componentWillUnmount(): void;
    componentDidUpdate(prevProps: IItemRendererXProps): void;
    private readonly handleDivRef;
    private readonly handleContextMenu;
    private readonly handleClick;
    private readonly handleDoubleClick;
    private readonly handleMouseEnter;
    private readonly handleMouseLeave;
    private readonly handleDragStartItem;
}
export {};
//# sourceMappingURL=index.d.ts.map