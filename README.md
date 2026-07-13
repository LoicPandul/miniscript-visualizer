# Miniscript Visualizer

Design Bitcoin spending policies visually. You assemble conditions (keys, thresholds, timelocks, hash locks), the app draws the tree, and the policy, Miniscript, descriptor and raw script update live below. Each output is copiable in one click.

Compilation runs entirely in your browser, with the reference policy compiler from [sipa/miniscript](https://github.com/sipa/miniscript) packaged by [@bitcoinerlab](https://github.com/bitcoinerlab/miniscript-policies). Nothing leaves your machine.

## Features

- Visual policy builder: AND, OR (with spend odds), k-of-n thresholds, absolute and relative timelocks, hash locks
- Interactive diagram: drag nodes, pan, zoom, add annotations, export as PNG
- Live outputs: policy, Miniscript, output descriptor and script opcodes, colorized to match the tree
- Script contexts: P2WSH, P2SH-P2WSH and P2TR (tapscript compilation included)
- Import any policy as text and get the visual tree back
- Sanity and malleability analysis on every compilation

## Run it locally

```bash
npm install
npm run dev
```

Tests: `npm test` for the unit suite, `npm run test:e2e` for the Playwright suite. Deployment notes live in [docs/DEPLOY.md](docs/DEPLOY.md).

## Credits

This tool is a from-scratch rebuild inspired by the policy playground that [bitcoindevkit.org](https://bitcoindevkit.org) used to host. No code was reused, but the idea comes from there.

## License

[MIT](LICENSE)
