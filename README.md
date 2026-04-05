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

## Usage

```bash
npx claude-welcome-buddy apply     # apply your /buddy to the welcome screen
npx claude-welcome-buddy restore   # restore original welcome screen
```

## How It Works

1. Reads your account ID from `~/.claude.json`
2. Replicates Claude Code's internal hash + PRNG to determine your species, eye, and rarity
3. Replaces the welcome screen render function with your buddy's ASCII art
4. Applies the rarity color so it matches `/buddy` output

| Rarity | Color |
|-----------|---------|
| Common | Gray |
| Uncommon | Green |
| Rare | Blue |
| Epic | Purple |
| Legendary | Gold |

## Notes

- A backup of `cli.js` is created automatically before patching
- Patches reset when Claude Code updates — just re-run `apply`
- No dependencies required

## License

MIT
