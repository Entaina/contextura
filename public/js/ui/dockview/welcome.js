/**
 * Dockview watermark component shown when no panels are open.
 * Pure DOM, no state, no dependencies.
 */
export class WelcomeWatermark {
  constructor () {
    this.element = document.createElement('div')
    this.element.className = 'welcome'
    this.element.innerHTML = `
      <div class="welcome-inner">
        <h1>Contextura</h1>
        <p>Selecciona un archivo del \u00E1rbol para empezar.</p>
      </div>
    `
  }

  init () {}
  dispose () {}
}
