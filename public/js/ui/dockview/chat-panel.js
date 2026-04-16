/**
 * ChatPanelRenderer — Dockview component that hosts the Claude chat panel.
 *
 * Follows the same contract as EditorPanelRenderer: the Dockview layout
 * manager calls `init(params)` once the panel is added and `dispose()` when
 * it is removed. The chat panel is a singleton (id: '__chat__').
 */

import { ChatView } from '../chat/chat-view.js'

export class ChatPanelRenderer {
  constructor () {
    this.element = document.createElement('div')
    this.element.className = 'chat-panel'
  }

  init (params) {
    this._panelApi = params.api
    this._chatView = new ChatView(this.element)
  }

  dispose () {
    if (this._chatView) {
      this._chatView.dispose()
      this._chatView = null
    }
  }
}
