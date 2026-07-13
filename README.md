# Miniscript Visualizer

Design Bitcoin spending policies visually. You assemble conditions (keys, thresholds, timelocks, hash locks), the app draws the tree, and the policy, Miniscript, descriptor and raw script update live below. Each output is copiable in one click.

Compilation runs entirely in your browser, with the reference policy compiler from [sipa/miniscript](https://github.com/sipa/miniscript) packaged by [@bitcoinerlab](https://github.com/bitcoinerlab/miniscript-policies).

## Features

- Visual policy builder: AND, OR (with spend odds), k-of-n thresholds, absolute and relative timelocks, hash locks
- Interactive diagram: drag nodes, pan, zoom, add annotations, export as PNG
- Live outputs: policy, Miniscript, output descriptor and script opcodes, colorized to match the tree
- Script contexts: P2WSH, P2SH-P2WSH and P2TR (tapscript compilation included)
- Import any policy as text and get the visual tree back
- Sanity and malleability analysis on every compilation

This is an educational tool, made to learn, teach and prototype spending policies. It is not wallet software: keys are simple aliases, and nothing here should secure real funds.

## License

[MIT](LICENSE)
