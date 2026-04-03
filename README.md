# Base64 Codec

Base64 encoder and decoder for text and files. Client-side only — no data leaves your browser.

**[Live Demo](https://gmowses.github.io/base64-codec)**

## Features

- Encode plain text or binary files to Base64
- Decode Base64 back to text or downloadable file
- Auto-detect: warns when the input in the plain-text panel looks like Base64
- URL-safe mode: replaces `+` and `/` with `-` and `_`
- File support: drag & drop a file onto the plain-text panel to encode it
- Image preview: if the decoded result is an image (PNG, JPEG, GIF, WEBP, SVG), shows a preview inline
- Stats: input size, output size, ratio, character counts
- Copy buttons on both panels
- Dark / Light mode (follows OS preference, toggle available)
- i18n: English and Portuguese (BR)

## Stack

React 19, TypeScript, Tailwind CSS v4, Vite, Lucide icons.

## Development

```sh
git clone https://github.com/gmowses/base64-codec.git
cd base64-codec
npm install
npm run dev
```

## License

[MIT](LICENSE) — Gabriel Mowses
