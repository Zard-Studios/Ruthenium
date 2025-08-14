# Ruthenium Browser

Un browser basato su Firefox con gestione avanzata multi-profilo per il cambio account senza interruzioni e privacy migliorata.

## Caratteristiche

- 🔄 **Gestione Multi-Profilo**: Crea e gestisci profili browser isolati
- 🔒 **Isolamento Completo dei Dati**: Cookie, sessioni e dati di navigazione separati per profilo
- 🦊 **Compatibilità Firefox**: Basato su Firefox ESR con supporto completo alle estensioni
- 🎨 **UI Moderna**: Interfaccia bella e intuitiva con temi scuri/chiari
- 🚀 **Alte Prestazioni**: Ottimizzato per velocità ed efficienza della memoria
- 🔐 **Focalizzato sulla Privacy**: Anti-fingerprinting avanzato e spoofing user agent
- 🌐 **Cross-Platform**: Supporto nativo per macOS, Windows e Linux

## Setup Sviluppo

### Prerequisiti

- Node.js 18+ 
- npm o yarn
- Git

### Installazione

```bash
# Clona il repository
git clone https://github.com/Zard-Studios/Ruthenium
cd ruthenium-browser

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev
```

### Script Disponibili

- `npm run dev` - Avvia server di sviluppo con hot reload
- `npm run build` - Build per produzione
- `npm run test` - Esegui i test
- `npm run test:watch` - Esegui i test in modalità watch
- `npm run lint` - Esegui ESLint
- `npm run format` - Formatta il codice con Prettier
- `npm run package` - Pacchettizza per la piattaforma corrente
- `npm run package:mac` - Pacchettizza per macOS
- `npm run package:win` - Pacchettizza per Windows
- `npm run package:linux` - Pacchettizza per Linux

## Struttura Progetto

```
src/
├── main/           # Processo principale Electron
├── renderer/       # Frontend React
├── components/     # Componenti UI
├── services/       # Servizi logica business
├── types/          # Definizioni tipi TypeScript
└── utils/          # Funzioni di utilità
```

## Contribuire

1. Fai il fork del repository
2. Crea un branch per la feature
3. Fai le tue modifiche
4. Aggiungi test per le nuove funzionalità
5. Esegui test e linting
6. Invia una pull request

## Licenza

Licenza MIT - vedi il file LICENSE per i dettagli