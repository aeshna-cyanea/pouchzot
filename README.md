# PouchZot

**Dungeon Crawl Stone Soup (DCSS) in your pocket.**

**[Play now: pouchzot.pages.dev](https://pouchzot.pages.dev)**

PouchZot is an independent, modified fork of
[PocketZot](https://github.com/pocketzot/pocketzot), an unofficial,
mobile-first app for playing
[DCSS](https://crawl.develz.org) on an iPhone or Android phone. It's a
[WebTiles](https://crawl.develz.org/wordpress/howto) client. It connects to
standard DCSS servers over the same WebSocket protocol as the official client,
but replaces the rendering and UI entirely: an ASCII-first map, a custom touch
HUD, and on-screen controls designed for portrait mode.

It's also a WebTiles *server*. A full build of DCSS runs on the device itself,
so you can play local games with no network at all. And there's no App Store or
Play Store: it runs in the browser and installs to your home screen as a
Progressive Web App.

<!-- These screenshots are served by the original PocketZot deployment; the
     image files are not part of this repository. -->
<p>
  <img src="https://pocketzot.app/shot-spriggan.png" alt="ASCII dungeon map with touch controls" height="420">
  <img src="https://pocketzot.app/shot-login.png" alt="PocketZot account picker with online accounts and an offline game" height="420">
  <img src="https://pocketzot.app/shot-shoals.png" alt="Tiles dungeon map, spectating player" height="420">
  <img src="https://pocketzot.app/shot-offline.png" alt="Offline lobby with a saved game and installed game data" height="420">
</p>

_Screenshots from the original PocketZot project._

## Features

- Play online (WebTiles) or offline (local).
- ASCII-first design that fits the full standard console map onto a phone in
  portrait mode, with a font still large enough to read.
- Graphical tiles support.
- Chat support.
- Customizable controls.
- Log in with multiple WebTiles server accounts and switch between them.
- Connect to custom WebTiles servers and save their accounts normally.
- Inline tap regions in many menus and descriptions for quick touch interaction.
- Context-aware control sets for common situations.
- Spectator mode with an expanded map view.
- Floating, collapsible monster list; tap for details.
- Pinch to zoom. Alternatively, double tap and hold, then drag vertically.
- Over 2.8 trillion logos.
- Installs to your home screen as a PWA.

See [ABOUT.md](ABOUT.md) for more, including the controls model and the
security and privacy notes.

## URL routes

PouchZot keeps the selected server and current screen in the URL. Choosing a
server updates the URL before the connection attempt, which gives browser
password managers a stable server-specific page to associate with the login.
Routes use the standard WebTiles hash names, for example:

- `?server=crawl.dcss.io&username=alice` (selected server / login pending)
- `?server=crawl.dcss.io&username=alice#lobby`
- `?server=crawl.dcss.io&username=alice#play-dcss-0.35`
- `?server=underhound.eu%3A8080#watch-playername`
- `?offline=1#lobby`
- `?offline=1#play-charactername`

`server` is always the WebTiles hostname with an optional port. PouchZot
derives the standard `wss://<host>/socket` endpoint; there are no server
aliases. Project Pages deployments retain their existing `/<repository>/`
base path. The username is public URL state; passwords and WebTiles login
tokens are never placed in the URL.

## Tech

TypeScript + [Vite](https://vitejs.dev).

Want to understand or modify the code? Start with
[Learning and hacking on PouchZot](docs/HACKING.md), which includes an
architecture map, guided code tours, build/testing notes, and small exercises.

## License

[AGPL-3.0-or-later](LICENSE).

Original PocketZot copyright © 2026 the PocketZot developer. PouchZot
modifications copyright © 2026 aeshna-cyanea. This fork contains modifications
beginning 2026-08-14; its corresponding source is this repository.

PouchZot is not affiliated with or endorsed by the original PocketZot project
or the DCSS development team. See [ATTRIBUTION.md](ATTRIBUTION.md) for details.

## Feedback

Please report bugs and suggestions in this repository's
[issue tracker](https://github.com/aeshna-cyanea/pouchzot/issues).
