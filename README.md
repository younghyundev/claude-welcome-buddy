# claude-welcome-buddy

Put your `/buddy` companion on the Claude Code welcome screen — with rarity color.

```
╭─ Claude Code ──────────────────╮
│                                │
│       Welcome back!            │
│                                │
│        .-o-OO-o-.              │
│       (__________)             │
│          |°  °|                │
│          |____|                │
│                                │
╰────────────────────────────────╯
```

## Install

```bash
npm install -g claude-welcome-buddy
```

## Usage (npx)

```bash
npx claude-welcome-buddy apply     # apply your /buddy to the welcome screen
npx claude-welcome-buddy restore   # restore original welcome screen
```

## Usage (clone)

```bash
git clone https://github.com/younghyundev/claude-welcome-buddy.git
cd claude-welcome-buddy
npm run apply
npm run restore
```

## How It Works

1. Reads your account ID from `~/.claude.json`
2. Replicates Claude Code's internal hash + PRNG to determine your species, eye, and rarity
3. Replaces the welcome screen render function with your buddy's ASCII art
4. Applies the rarity color so it matches `/buddy` output

| Rarity    | Color  |
| --------- | ------ |
| Common    | Gray   |
| Uncommon  | Green  |
| Rare      | Blue   |
| Epic      | Purple |
| Legendary | Gold   |

## Notes

- A backup of `cli.js` is created automatically before patching
- `hook` registers a macOS launchd agent that watches `cli.js` for changes. Whenever Claude Code updates, your buddy is re-applied automatically.
- No dependencies required

## License

MIT
