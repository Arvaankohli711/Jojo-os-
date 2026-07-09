// Ad-hoc code-sign the macOS app after packaging. We have no paid Apple
// Developer certificate, and an *unsigned* arm64 app is rejected by Gatekeeper
// as "damaged and can't be opened". An ad-hoc signature (`codesign --sign -`,
// no certificate required) satisfies the "must be signed" rule, so the app
// launches normally (at worst a one-time right-click → Open). Runs on macOS
// builds only; a no-op everywhere else.
const { execSync } = require('child_process')

exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return
  const app = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' })
  console.log(`ad-hoc signed ${app}`)
}
