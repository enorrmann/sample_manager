
export interface TreeNode {
    name: string;
    path: string;
    children: Record<string, TreeNode>;
}

export function buildFolderTree(filePaths: string[], rootFolders: string[]): TreeNode[] {
    // Helper to find which root a file belongs to
    const findRoot = (filePath: string) => rootFolders.find(root => filePath.startsWith(root));

    // Structure: Record<RootPath, TreeNode>
    const treeRoots: Record<string, TreeNode> = {};

    rootFolders.forEach(root => {
        const parts = root.split(/[/\\]/);
        const name = parts[parts.length - 1] || root;
        treeRoots[root] = {
            name,
            path: root,
            children: {}
        };
    });

    filePaths.forEach(filePath => {
        const root = findRoot(filePath);
        if (!root) return; // Should not happen if data is consistent

        let currentNode = treeRoots[root];

        // Get relative path parts
        // +1 for the separator
        const relativePath = filePath.substring(root.length + 1);
        const parts = relativePath.split(/[/\\]/);

        // Remove the filename (last part)
        parts.pop();

        let currentPath = root;

        for (const part of parts) {
            if (!part) continue; // Skip empty parts (e.g. double slash)

            currentPath = `${currentPath}/${part}`;

            if (!currentNode.children[part]) {
                currentNode.children[part] = {
                    name: part,
                    path: currentPath,
                    children: {}
                };
            }
            currentNode = currentNode.children[part];
        }
    });

    return Object.values(treeRoots);
}
