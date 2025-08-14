# Ruthenium Browser

A Firefox-based browser with advanced multi-profile management for seamless account switching and enhanced privacy.

## Features

- 🔄 **Multi-Profile Management**: Create and manage isolated browser profiles
- 🔒 **Complete Data Isolation**: Separate cookies, sessions, and browsing data per profile
- 🦊 **Firefox Compatibility**: Built on Firefox ESR with full extension support
- 🎨 **Modern UI**: Beautiful, intuitive interface with dark/light themes
- 🚀 **High Performance**: Optimized for speed and memory efficiency
- 🔐 **Privacy Focused**: Advanced anti-fingerprinting and user agent spoofing
- 🌐 **Cross-Platform**: Native support for macOS, Windows, and Linux

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ruthenium-browser

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run package` - Package for current platform
- `npm run package:mac` - Package for macOS
- `npm run package:win` - Package for Windows
- `npm run package:linux` - Package for Linux

## Project Structure

```
src/
├── main/           # Electron main process
├── renderer/       # React frontend
├── components/     # UI components
├── services/       # Business logic services
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## License

MIT License - see LICENSE file for details