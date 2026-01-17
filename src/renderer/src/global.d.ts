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
        getLastModifiedTime(path: string): Promise<string>
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
      publication: {
        listByFile(payload: {
          workspaceRoot: string
          filePath: string
        }): Promise<
          Array<{
            id: string
            filePath: string
            platformId: string
            platformName: string
            lastLocalSubmittedAt: string
            metadataJson: string
          }>
        >
        touch(payload: {
          workspaceRoot: string
          publicationId: string
          contentPath: string
        }): Promise<{
          id: string
          filePath: string
          platformId: string
          platformName: string
          lastLocalSubmittedAt: string
          metadataJson: string
        } | null>
        setRemoteUrl(payload: {
          workspaceRoot: string
          publicationId: string
          remoteUrl: string
        }): Promise<{
          id: string
          filePath: string
          platformId: string
          platformName: string
          lastLocalSubmittedAt: string
          metadataJson: string
        } | null>
      }
    }
  }
}
