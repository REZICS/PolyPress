export {}

declare global {
  interface Window {
    api: {
      versions: {
        node: string
        chrome: string
        electron: string
      }
    }
  }
}

