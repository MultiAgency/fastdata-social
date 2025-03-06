# demo fastdata upload

this repo contains a single React page that uses the [`react-files` package](https://www.npmjs.com/package/react-files) to drag-and-drop (or click to open file menu) files, encode them, and broadcast a NEAR transaction, calling a potentially-existent function on a contract. The execution on chain is ignored in this circumstance, and focus is instead placed on what's been captured in the logs, which we sometimes think of as events.

see more: https://hackmd.io/@gJgX_4T9S4SmTnkE8aQQGQ/r1U2EOq5yx

## usage

first:

    yarn

serve:

    yarn start

navigate to: http://localhost:3666

a plain user interface appears, and you may drag a file in there. then press the buttons to encode and broadcast it using [@fastnear/api](https://www.npmjs.com/package/@fastnear/api)
