import type { JojoApi } from './index'

declare global {
  interface Window {
    jojo: JojoApi
  }
}

export {}
