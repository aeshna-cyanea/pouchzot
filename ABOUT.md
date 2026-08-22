# About PouchZot

PouchZot is an independent, modified fork of [PocketZot](https://github.com/pocketzot/pocketzot), an unofficial [DCSS](https://crawl.develz.org) app designed for iOS and Android phones in portrait mode. Play online on public [WebTiles](https://crawl.develz.org/wordpress/howto) servers, or offline with a full build of DCSS that runs entirely on your device.

## Getting started

DCSS has no app on the App Store, but you don't need one: install PouchZot like an app with "Add to Home Screen". Then log in to a WebTiles server and play, or tap "Play offline". iPads and other tablets work too.

## Features

- Custom ASCII-first design that fits the full standard console map onto a phone in portrait mode, with a font still large enough to read
- Offline play support
- Tiles support
- Chat support
- Customizable controls
- Log in with multiple WebTiles server accounts and switch between them
- Connect to custom WebTiles servers; their accounts are saved normally
- Inline tap targets in many menus and descriptions
- Context-aware control sets for common situations
- Spectator mode with an expanded map view
- Floating, collapsible monster list; tap for details
- Over 2.8 trillion logos
- Installs to your home screen as a PWA

## Controls

The controls are organized into three tabs: **@**, **>**, and **?**. The mental model is:

- **@** *"micro"* — moment-to-moment actions, including during battle
- **>** *"macro"* — actions often taken outside of battle, or after clearing a floor
- **?** *"info"* — commands to get information about your character or game

Obligatory virtual keyboard also available.

## Gestures

- Pinch to zoom. Alternatively, double tap and hold, then drag vertically.
- Double tap Shift to lock it
- Tap place name in HUD (e.g. @D:1) to toggle minimap
- Tap floating monster list for full view, then tap monster to inspect
- Tap chevron at top-right of monster list to collapse to single-line view

## Offline play

Tap the "Play offline" card on the login screen to run DCSS directly on your device: no server, no account, no connection. The first launch installs the engine and tile data as a one-time download. After that, games start and play with no network at all, including in airplane mode.

Offline characters get named save slots, a past-games list with scores and full morgues, an editable options (RC) file, and a Backup feature that exports everything to a single file you can keep or move to another device. Saves live in your browser's storage, which the OS can evict under storage pressure: if a character matters to you, export a backup now and then.

## Version support

Current stable and trunk DCSS are supported. Versions back to 0.24 generally work; older versions and forks may or may not. In particular, starting a new character on versions before 0.24 doesn't work. Offline play ships its own DCSS build.

## Security and privacy

PouchZot has no accounts of its own. Your browser connects directly to your chosen DCSS server over WebSocket, just like the desktop WebTiles client; all built-in servers use encrypted `wss://` connections. Credentials go only in the login message and are never stored. Saved logins keep the server's session cookie, not your password; when that token expires, PouchZot asks for the password inline to refresh it. The site records anonymous usage counts.

Custom servers also supply WebTiles tile metadata as JavaScript, just as the built-in servers do. Only connect to a custom server you trust.

## How it was built

The original PocketZot implementation was written mostly with Claude Code under its developer's direction and review. PouchZot continues from that codebase as an independently maintained fork.

PouchZot contains modifications beginning 2026-08-14. Its corresponding source is available at <https://github.com/aeshna-cyanea/pocketzot>, licensed under [AGPL-3.0-or-later](LICENSE). The original project is available at <https://github.com/pocketzot/pocketzot>. See [ATTRIBUTION.md](ATTRIBUTION.md) for copyright, fork, and DCSS attribution details.

## Feedback

Please report bugs and suggestions in PouchZot's [issue tracker](https://github.com/aeshna-cyanea/pocketzot/issues).
