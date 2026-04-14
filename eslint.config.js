import neostandard from 'neostandard'
import globals from 'globals'

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'out/**',
      'release/**',
      'build/**',
      '**/.history/**',
      '.claude/**'
    ]
  },
  ...neostandard({
    noStyle: false
  }),
  // Electron main / preload / config / updater: CommonJS + Node globals.
  {
    files: ['electron/**/*.cjs', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node }
    }
  },
  // Backend ESM (server + lib): Node globals.
  {
    files: ['server.mjs', 'lib/**/*.mjs', 'lib/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node }
    }
  },
  // Frontend vanilla JS: browser globals + librerías cargadas por <script>.
  {
    files: ['public/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Cargadas como globales desde public/index.html.
        lucide: 'readonly',
        toastui: 'readonly'
      }
    }
  }
]
