# macOS Publish

This directory contains the unsigned macOS packaging flow for Ant Browser.

The macOS package is intended for internal testing and PR validation first. It deliberately does not perform Apple Developer ID signing or notarization.

## Targets

- `darwin/amd64`
- `darwin/arm64`

Output artifacts:

- `publish/output/AntBrowser-<version>-macos-<arch>.app`
- `publish/output/AntBrowser-<version>-macos-<arch>.zip`

## Runtime Policy

macOS publish uses repository-pinned runtime files and hash verification.

Pinned upstream source lock file:

- `publish/runtime-sources.json`

Required files:

- `bin/darwin-amd64/xray`
- `bin/darwin-amd64/sing-box`
- `bin/darwin-arm64/xray`
- `bin/darwin-arm64/sing-box`

Hashes are validated by:

- `tools/runtime/verify-runtime.sh`
- `publish/runtime-manifest.json`

Recommended way to refresh runtime files:

```bash
python3 tools/runtime/sync-runtime.py --target darwin-amd64
python3 tools/runtime/sync-runtime.py --target darwin-arm64
```

If you replace runtime files manually, update manifest hashes:

```bash
python3 tools/runtime/update-runtime-manifest.py --target darwin-amd64
python3 tools/runtime/update-runtime-manifest.py --target darwin-arm64
```

If runtime file or hash is missing/mismatched, publish will fail.

## Commands

Build on a native macOS host that matches the target architecture:

```bash
bash publish/mac/publish-mac.sh --arch amd64
bash publish/mac/publish-mac.sh --arch arm64
```

The first command is for Intel Macs. The second command is for Apple Silicon Macs.

The script:

1. verifies the host OS and architecture
2. verifies pinned Darwin runtime hashes
3. installs frontend dependencies
4. builds frontend assets
5. runs `wails build -platform darwin/<arch>`
6. assembles an unsigned `.app`
7. bundles `xray` and `sing-box` under `Contents/MacOS/bin`
8. writes a `.zip` artifact with the app bundle as the top-level item

## Writable State Layout

Installed `.app` bundles should be treated as read-only. When Ant Browser runs from:

- `Ant Browser.app/Contents/MacOS`
- `Ant Browser.app/Contents/Resources`

runtime state is redirected to:

- `~/Library/Application Support/ant-browser`

Bundled runtime files remain in the app bundle:

- `Ant Browser.app/Contents/MacOS/bin/xray`
- `Ant Browser.app/Contents/MacOS/bin/sing-box`

Writable files live in the user state root:

- `config.yaml`
- `proxies.yaml` if present
- `data/`
- `chrome/`

## Local Launch

After a successful build:

```bash
open "publish/output/AntBrowser-<version>-macos-<arch>.app"
```

For an unsigned local build copied to `/Applications`, remove quarantine if macOS blocks launch:

```bash
xattr -dr com.apple.quarantine "/Applications/Ant Browser.app"
open "/Applications/Ant Browser.app"
```

Unsigned builds are not suitable for public distribution. A public macOS release still needs Developer ID signing, helper binary signing, notarization, and staple.

## Validation Checklist

- build completes on native macOS
- output `.app` exists
- output `.zip` exists
- `Contents/MacOS/ant-chrome` is executable
- bundled `xray` and `sing-box` are executable
- app launches from Finder or `open`
- first launch creates `~/Library/Application Support/ant-browser`
- `config.yaml` is seeded with `--fingerprint-platform=mac`
- SQLite database and `data/` are created under the user state root
- browser core detection works for macOS `.app` cores
- proxy runtime binaries can be launched from the app bundle
