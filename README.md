# JuxtaGlobe 🌍

An interactive dual-globe visualization tool that lets you explore Earth from multiple perspectives simultaneously. Compare modern Earth with its antipodal points or journey through deep time with prehistoric continental configurations.

**[juxtaglobe.com](https://www.juxtaglobe.com)**

## Features

- **Dual Globe Display**: View two synchronized 3D globes side by side
- **Antipodal Mode**: See the exact opposite point on Earth from any location
- **Prehistoric Maps**: Explore Earth's continental configurations from different geological periods
- **Location Detection**: Automatically centers on your approximate location via IP geolocation
- **Interactive Controls**: Drag to rotate, scroll to zoom, click buttons for quick navigation
- **Responsive Design**: Works on desktop and mobile devices
- **Google Maps Integration**: Quick links to open any location in Google Maps

## Prehistoric Maps Available

- Early Triassic (~240 Ma) - Pangea formation
- Early Jurassic (~200 Ma) - Pangea at its peak
- Middle Jurassic (~165 Ma) - Pangea beginning to break apart
- Early Cretaceous (~120 Ma) - Continental drift in progress

*Maps courtesy of C. R. Scotese, PALEOMAP Project (CC BY-SA 4.0)*

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with Bun runtime
- **3D Rendering**: Three.js via react-globe.gl
- **Styling**: Tailwind CSS 4
- **Routing**: React Router
- **Icons**: Lucide React & React Icons
- **Deployment**: GitHub Pages

## Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Node.js 18+ (for compatibility with some tools)
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/jekrch/juxtaglobe.git
cd juxtaglobe
```

2. Install dependencies:
```bash
bun install
```

## Development

Start the development server:
```bash
bun run dev
```

The app will be available at `http://localhost:5173`

## Build

Create a production build:
```bash
bun run build
```

Preview the production build:
```bash
bun run preview
```

## Deployment

Deploy to GitHub Pages:
```bash
bun run deploy
```

This will build the project and push to the `gh-pages` branch.


## Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Fix ESLint issues
- `bun run deploy` - Deploy to GitHub Pages

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers with WebGL support


## Acknowledgments

- [Three.js](https://threejs.org/) for 3D rendering
- [react-globe.gl](https://github.com/vasturiano/react-globe.gl) for the globe component
- [C. R. Scotese](http://www.scotese.com/) for prehistoric Earth maps
- [ipapi.co](https://ipapi.co/) for IP geolocation services
