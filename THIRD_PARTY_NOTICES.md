# Third-party notices

## noFAYZ/zuno

The YouTube Music public-catalogue integration in ZUNO Music is adapted from the architecture and publicly available integration approach of [noFAYZ/zuno](https://github.com/noFAYZ/zuno).

- Upstream project: noFAYZ/zuno
- License: Apache License 2.0
- License text: [licenses/noFAYZ-zuno-APACHE-2.0.txt](licenses/noFAYZ-zuno-APACHE-2.0.txt)
- Adapted areas in this repository: `src/utils/youtubeMusicApi.ts`, `src-tauri/src/lib.rs`, and the related search/player wiring.

ZUNO Music's adapted provider is a separate implementation for Capacitor Android and Tauri desktop. It uses public YouTube Music catalogue metadata and opens tracks through YouTube's official embedded player. It does not copy the upstream app's stored Google cookies, private account database, or audio download/stream-extraction implementation.

The upstream project and this integration are not affiliated with or endorsed by Google or YouTube.
