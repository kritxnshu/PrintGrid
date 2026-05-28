# Snapsheet

A browser-based photo print sheet builder. Upload images, arrange them in a custom grid, and export print-ready PDF, PNG, or JPEG at up to 300 DPI — no account, no installation, no upload to any server.


## Features

- Upload multiple photos and arrange them in a fully customizable grid
- Drag and swap images between cells
- Choose from standard paper sizes — A4, A3, Letter, and more — or set a custom size in mm
- Portrait and landscape orientation
- Adjustable rows, columns, and cell gap
- Cover or contain fit mode per image
- Per-image scale control
- Multi-page support — extra images automatically overflow to new pages
- Export as PDF, PNG, or JPEG at 150, 300, or 600 DPI
- Dark and light mode with persistent preference

## Tech Stack

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Konva / react-konva](https://konvajs.org/) — canvas rendering
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export

## Getting Started

```bash
# Clone the repo
git clone https://github.com/kritxnshu/SnapSheet.git
cd snapsheet

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output goes to the `dist/` folder. Deploy anywhere — Vercel, Netlify, GitHub Pages.

## Live Demo

[snapsheet-kritanshu.vercel.app/](https://snapsheet-kritanshu.vercel.app/)


