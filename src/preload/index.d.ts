export {}

declare global {
  interface WorkspaceTreeNode {
    id: string
    name: string
    path: string
    kind: 'file' | 'dir'
    children?: WorkspaceTreeNode[]
  }

  interface Window {
    api: {
      versions: {
        node: string
        chrome: string
        electron: string
      }
      workspace: {
        getCwd(): Promise<string>
        listTree(options?: {
          maxDepth?: number
          maxEntries?: number
        }): Promise<WorkspaceTreeNode>
        readText(
          path: string,
          options?: {maxBytes?: number},
        ): Promise<{
          text: string
          truncated: boolean
          bytesRead: number
          totalBytes: number
        }>
      }
    }
  }
}

