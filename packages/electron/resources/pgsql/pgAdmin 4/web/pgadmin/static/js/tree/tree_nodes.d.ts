export declare class ManageTreeNodes {
    constructor();
    init: (_root: string) => Promise<unknown>;
    updateNode: (_path: any, _data: any) => Promise<unknown>;
    removeNode: (_path: any) => Promise<boolean>;
    findNode(path: any): any;
    addNode: (_parent: string, _path: string, _data: []) => Promise<unknown>;
    readNode: (_path: string) => Promise<any>;
    generate_url: (path: string) => string;
}
export declare class TreeNode {
    constructor(id: any, data: any, domNode: any, parent: any, metadata: any, type: any);
    hasParent(): boolean;
    parent(): any;
    setParent(parent: any): void;
    getData(): any;
    getHtmlIdentifier(): any;
    ancestorNode(condition: any): this | null;
    /**
     * Given a condition returns true if the current node
     * or any of the parent nodes condition result is true
     */
    anyFamilyMember(condition: any): boolean;
    anyParent(condition: any): boolean;
    reload(tree: any): Promise<unknown>;
    unload(tree: any): Promise<unknown>;
    open(tree: any, suppressNoDom: any): Promise<unknown>;
}
export declare function isCollectionNode(node: any): any;
//# sourceMappingURL=tree_nodes.d.ts.map