import { Notificar } from 'notificar';
import { FileTreeXEvent, IFileTreeXHandle } from '../types';
export declare class KeyboardHotkeys {
    private readonly fileTreeX;
    private readonly events;
    private readonly hotkeyActions;
    constructor(fileTreeX: IFileTreeXHandle, events: Notificar<FileTreeXEvent>);
    handleKeyDown: (ev: React.KeyboardEvent) => boolean | undefined;
    private readonly jumpToFirstItem;
    private readonly jumpToLastItem;
    private readonly jumpToNextItem;
    private readonly jumpToPrevItem;
    private expandOrJumpToFirstChild;
    private collapseOrJumpToFirstParent;
    private readonly selectFileOrToggleDirState;
    private readonly toggleDirectoryExpand;
    private readonly resetSteppedOrSelectedItem;
    private readonly resetSteppedItem;
    private readonly copyEntry;
}
//# sourceMappingURL=keyboardHotkeys.d.ts.map