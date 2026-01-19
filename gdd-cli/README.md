# GDD CLI

AI-driven game design document writing tool.

## Setup

```bash
cd gdd-cli
npm install
```

## Usage

Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=your_key_here
```

Start a new session:
```bash
npm run dev start
```

Send mail to the agent:
```bash
npm run dev mail
```

## Features

- **Interview Phase**: Deep conversation to understand your needs
- **Writing Phase**: AI writes comprehensive GDD with mail checking
- **Review Phase**: Multi-dimensional document review
- **Mail System**: Send commands, opinions, and comments during execution
- **Context Management**: Progressive document loading to avoid context pollution

## Project Structure

```
.gdd/
├── config.json        # Session state
├── decisions.json     # Decision tracking
└── mails/
    └── mails.json     # Mail storage
```
