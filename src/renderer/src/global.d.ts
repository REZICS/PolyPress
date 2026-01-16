export {}

declare global {
  interface WindowEventMap {
    'native-drop': CustomEvent<string[]>
  }

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
        selectDirectory(): Promise<string | null>
        nativeDropEventHandler(): Promise<void>
        coerceToDir(path: string): Promise<string | null>
        listTree(
          path: string,
          options?: {
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
