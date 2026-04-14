/**
 * electron-builder afterPack hook — applies an ad-hoc codesign to the
 * packaged .app before the DMG is built.
 *
 * Why this exists:
 *   electron-builder's `mac.identity` accepts a real certificate name or
 *   `null` (skip signing). It does NOT support "-" as the ad-hoc sentinel
 *   that Apple's `codesign` CLI understands. So when we set identity to
 *   null we get an entirely unsigned binary, which on macOS Sonoma+ gets
 *   rejected as "damaged" and refuses to open even with right-click.
 *
 *   Solution: leave `identity: null` in the YAML (skip electron-builder's
 *   own signing pipeline), and run `codesign --force --deep --sign -` on
 *   the .app from this afterPack hook. The result is an ad-hoc signed
 *   binary that Gatekeeper treats as "unidentified developer" — which is
 *   the expected friction we want (right-click → Open works once per
 *   install). When we eventually buy an Apple Developer ID, this file
 *   gets deleted and `mac.identity` switches to the real cert name.
 */

const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

exports.default = async function afterPack (context) {
  if (context.electronPlatformName !== 'darwin') return

  // Universal builds invoke afterPack three times: once per arch into
  // mac-universal-{x64,arm64}-temp/, then once for the merged binary
  // in mac-universal/. We must only sign the merged result — signing the
  // temps independently produces divergent _CodeSignature files which
  // make @electron/universal refuse to merge them.
  if (context.appOutDir.includes('-temp')) {
    console.log(`  • skipping ad-hoc sign for intermediate build  ${context.appOutDir}`)
    return
  }

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = join(context.appOutDir, appName)

  console.log(`  • ad-hoc signing  app=${appPath}`)

  try {
    // No --options runtime: hardened runtime is only needed for notarization
    // and requires specific entitlements to not crash Electron at launch.
    // For ad-hoc distribution we just want a valid signature so Gatekeeper
    // accepts the bundle; the default runtime is what Electron was built for.
    execFileSync('codesign', [
      '--force',
      '--deep',
      '--sign', '-',
      '--timestamp=none',
      appPath,
    ], { stdio: 'inherit' })

    // Verify the signature was applied
    execFileSync('codesign', ['--verify', '--verbose', appPath], { stdio: 'inherit' })
    console.log('  • ad-hoc signing complete')
  } catch (err) {
    console.error(`  ✗ ad-hoc signing failed: ${err.message}`)
    throw err
  }
}
