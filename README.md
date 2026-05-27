# Ant Browser

English | [简体中文](README.zh-CN.md)

> A desktop browser management tool for multi-account isolation, proxy binding, and local environment control. Supports Windows, Linux, and unsigned macOS builds.

[![Release](https://img.shields.io/github/v/release/black-ant/Ant-Browser?sort=semver)](https://github.com/black-ant/Ant-Browser/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue)](https://github.com/black-ant/Ant-Browser/releases)
[![Issues](https://img.shields.io/github/issues/black-ant/Ant-Browser)](https://github.com/black-ant/Ant-Browser/issues)

## Recommended Browser Core

Ant Browser currently recommends using browser cores from the open-source [fingerprint-chromium](https://github.com/adryfish/fingerprint-chromium) project.

If you need downloadable and maintainable fingerprint Chromium builds, start with its Releases page:

- <https://github.com/adryfish/fingerprint-chromium/releases>

This project provides a practical upstream source for preparing browser cores used by Ant Browser. Thanks to the original project for making these builds available.

Ant Browser has a focused goal: help users manage multiple isolated browser instances on one desktop device, with proxy pools, browser core management, and quick launch workflows for daily operations and testing.

## Table of Contents

- [Overview](#overview)
- [Recent Updates](#recent-updates)
- [Changelog](CHANGELOG.md)
- [Source Branches](#source-branches)
- [Features](#features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Common Tasks](#common-tasks)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Support and Feedback](#support-and-feedback)
- [License](#license)

## Overview

Ant Browser is suitable for:

- Multi-account environment isolation
- Cross-border ecommerce and social media account operations
- Local testing that needs independent proxy exits
- Teams that need centralized browser core and instance configuration management

The core value of this project is:

- Assign an isolated browser instance to each account
- Bind a dedicated proxy to each instance
- Manage browser cores, tags, keywords, and quick launch codes in one place
- Store configuration and runtime data locally for better control and backup

## Recent Updates

### 1.2.0 · 2026-05-09

- Major Launch API upgrade: added instance CRUD, launch by code or selector, runtime session / status / stop, and a unified CDP entry point for external integrations
- Improved automation API flow: script execution supports selector / params overrides and `timeoutMs`; dual-instance runtime flows support timeout cancellation and structured errors
- Enhanced proxy pool: added chained proxy import, edit, and preview support for HTTP / SOCKS5 two-hop chains, plus improved direct proxy bulk import
- Improved proxy checks: added speed test targets, IP health targets, and bridge startup timeout settings; chained proxies can also participate in latency and health checks
- Improved instance launch behavior: when proxy startup fails, the instance can launch directly for the current run without changing its saved proxy configuration; the default proxy pool only keeps direct nodes
- Upgraded bookmarks: added default IP check bookmarks, launch-time auto-open settings, and sync support for existing stopped instances

### 1.1.0 · 2026-03-19

- Improved Linux support: completed the development, packaging, installation, startup, and runtime flow, with continued fixes for installed build stability
- Added unsigned macOS internal build flow: native macOS hosts can build `.app` / `.zip` artifacts, with user state stored under `~/Library/Application Support/ant-browser`
- Added experimental SOCKS proxy testing support; stability and compatibility will continue to be verified
- Added experimental API-triggered browser launch support for future automation workflows

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## Source Branches

- `master`: clean developer baseline. It does not commit `data/app.db`, instance directories, or other user data. A fresh empty database is initialized on first launch.
- `user_data`: adds a test snapshot of `data/app.db` on top of `master` for demos, integration testing, and issue reproduction.
- Proxy runtimes `bin/xray.exe` and `bin/sing-box.exe` are included in the repository. Development and release packaging do not require downloading these runtime files separately.

## Features

- Instance isolation management: create, edit, start, stop, restart, clone, and delete browser instances
- Proxy pool configuration: maintain proxy nodes centrally and assign them to specific instances
- Multi-protocol support: supports common proxy configurations and Clash import
- Browser core management: maintain multiple Chrome core versions and set a default core
- Quick launch: open target instances quickly by instance code or `Ctrl + K`
- Tags and search: filter by tag, keyword, status, proxy, core, and group
- Local storage: configuration and instance data are stored locally for long-term use and backup

## Screenshots

### 1. Dashboard

<img src="images/readme/001-首页.png" alt="Dashboard" width="100%" />

Main capabilities:

- View total instances, running instances, proxy node count, and browser core versions
- Jump from the dashboard to `Browser Instances`, `Proxy Pool`, `Core Management`, and `Settings`
- Check client version, runtime environment, storage engine, and current running state

### 2. Browser Instances

<img src="images/readme/002-实例列表.png" alt="Browser Instances" width="100%" />

Main capabilities:

- View and manage all browser instances in one place
- Filter instances by status, proxy, core, group, and keyword
- Create new profiles, start, stop, restart, configure, clone, and delete instances
- Assign quick launch codes for direct startup later

### 3. Proxy Pool

<img src="images/readme/003-设置代理池.png" alt="Proxy Pool" width="100%" />

Main capabilities:

- Manage proxy nodes centrally
- Filter proxies by protocol and group
- Maintain proxies manually or import Clash configurations
- Check latency and IP health to choose available nodes

### 4. Proxy Validation

<img src="images/readme/004-自定义代理.png" alt="Proxy Validation" width="100%" />

Main capabilities:

- Visit an IP check site after starting an instance to verify that the proxy is active
- Check IP region, ASN, ISP, and risk values
- Confirm whether the instance is using the expected proxy exit

## Quick Start

### Requirements

- Operating systems:
  - Windows 10 / 11 (64-bit)
  - Linux (amd64 / arm64)
  - macOS (amd64 / arm64, currently unsigned internal builds)
- Recommended memory: 8 GB or more
- Recommended disk space: 2 GB or more

### Download and Run

1. Download the latest release from <https://github.com/black-ant/Ant-Browser/releases>.
2. For the Windows installer, run `AntBrowser-Setup-*.exe`.
3. For the portable Windows package, extract it and run `ant-chrome.exe`.
4. For Linux, install `ant-browser_<version>_<arch>.deb`, or extract the `tar.gz` package and run `ant-chrome`.
5. For unsigned macOS packages, extract and run `AntBrowser.app`. If macOS says the app is damaged, cannot be opened, or is blocked by Gatekeeper after copying it to `/Applications`, run `sudo xattr -dr com.apple.quarantine /Applications/AntBrowser.app` and open it again.

### Run from Source

1. Use the `master` branch for development by default. It does not include test user data and is intended as the daily development baseline.
2. If you need a demo environment with a test database, switch to the `user_data` branch.
3. On Windows, run `bat\dev.bat`. It starts in stable mode by default. Use `bat\dev.bat live` for frontend HMR, or `bat\dev.bat limited` to reproduce constrained-memory behavior.
4. Windows uses `bin/xray.exe` and `bin/sing-box.exe`; Linux uses `bin/linux-<arch>/xray` and `bin/linux-<arch>/sing-box`; macOS uses `bin/darwin-<arch>/xray` and `bin/darwin-<arch>/sing-box`.
5. Runtime files are pinned in the repository and verified by hash. The hash manifest is `publish/runtime-manifest.json`, and the pinned source manifest is `publish/runtime-sources.json`.
6. To refresh Linux / macOS runtimes, run `python3 tools/runtime/sync-runtime.py --target <target>`. The script downloads from pinned sources, verifies archives, and updates the manifest.

Development modes:

- `bat\dev.bat`: stable mode. Builds `frontend/dist` first, then starts Wails with static assets and no external Vite dev server dependency.
- `bat\dev.bat live`: starts the Vite watcher explicitly and connects it to the desktop shell through `-frontenddevserverurl`.
- `bat\dev.bat limited`: based on `live`, with Windows Job Object memory limits applied to the watcher and child processes.
- To configure a proxy for dependency downloads, set `DEV_PROXY_URL`, `DEV_NO_PROXY`, and `DEV_GOPROXY` before startup.

### Linux Release Packaging from Source

Linux release scripts are under `publish/linux/`.

```bash
bash publish/linux/publish-linux.sh --arch amd64
bash publish/linux/publish-linux.sh --arch arm64
```

See [publish/linux/README.md](publish/linux/README.md) for details.

### macOS Unsigned Release Packaging from Source

macOS release scripts are under `publish/mac/`. They must run on a native macOS host, and the target architecture must match the host architecture.

```bash
bash publish/mac/publish-mac.sh --arch amd64
bash publish/mac/publish-mac.sh --arch arm64
```

The scripts generate unsigned `.app` and `.zip` artifacts for PR verification and internal testing. See [publish/mac/README.md](publish/mac/README.md) for details.

### Prepare a Browser Core

Proxy runtimes are already included in the repository. You only need to prepare a browser core.

1. Open the app and go to `Fingerprint Browser > Core Management`.
2. Prefer the in-app download flow to prepare a core.
3. If you prepare a core manually, make sure the directory contains `chrome.exe`.

Suggested directory layout:

```text
chrome/
  chrom-142/
    chrome.exe
    ...
```

### First-use Workflow

1. Import or add available proxy nodes in `Proxy Pool`.
2. Click `New Profile` in `Browser Instances`.
3. Choose the instance name, core, proxy, tags, and required launch arguments.
4. Return to the instance list and click the start button.
5. Open an IP check site and confirm that the proxy result matches expectations.

## Common Tasks

| Goal | Entry | Notes |
| --- | --- | --- |
| Create a browser instance | `Browser Instances > New Profile` | Create a new isolated browser environment |
| Configure proxy pool | `Proxy Pool` | Maintain proxy nodes and check latency / health |
| Bind proxy to instance | `Instance Edit Page` | Assign a target proxy node to an instance |
| Start an instance | `Browser Instances` | Click the start button to run the target instance |
| Quick launch an instance | `Ctrl + K` | Search by code, instance name, tag, or keyword |
| Manage browser cores | `Core Management` | Add, edit, delete, and set the default core |
| Validate proxy result | Visit an IP check site after launching an instance | Check IP, region, ASN, and risk values |

## FAQ

### 1. What should I check if the app cannot start?

First check whether the browser core path is valid and whether the target directory contains `chrome.exe`.

### 2. What if an instance starts but the proxy does not work?

First verify that the proxy node itself is available, then confirm that the instance is bound to the correct proxy. After launch, visit an IP check site to verify the current exit IP.

### 3. How do I find a target instance when there are many instances?

Use filters in `Browser Instances` by status, proxy, core, group, and keyword. You can also use `Ctrl + K` to quick launch by instance code or name.

### 4. How can I avoid account cross-contamination?

Use one account per instance and one stable proxy per instance. Avoid mixing browser environments or frequently switching the exit IP of the same instance.

### 5. What if macOS says the app is damaged or cannot be opened?

The current macOS package is an unsigned build. After copying it to `/Applications`, Gatekeeper may mark it as quarantined. Run this command to remove the quarantine flag and open it again:

```bash
sudo xattr -dr com.apple.quarantine /Applications/AntBrowser.app
```

## Roadmap

- Improve automation module capabilities
- Continue adding user guides and API documentation
- Improve instance templates, batch management, and search experience

## Contributing

Issues and pull requests are welcome.

- Bug reports: include the app version, OS version, reproduction steps, and screenshots
- Feature requests: describe the business scenario, expected behavior, and current limitation
- Documentation improvements: README, tutorials, and screenshot updates are welcome

For larger changes, please open an issue first to align on the requirements before submitting a PR.

## Support and Feedback

- Releases: <https://github.com/black-ant/Ant-Browser/releases>
- Issues: <https://github.com/black-ant/Ant-Browser/issues>

## License

This repository does not currently include a standalone `LICENSE` file. It will be added later.
