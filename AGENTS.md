<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git Commit Rules (Always Active)

- **Maksimalkan jumlah commit (Atomic Commits)**: Setiap kali melakukan `git commit`, pecah perubahan menjadi beberapa commit kecil yang atomik (1 commit per file atau per unit logis: helper, test, komponen UI, halaman, dokumentasi). Jangan pernah menggabungkan banyak file berbeda ke dalam 1 commit tunggal.
- Gunakan format Conventional Commits berbahasa Indonesia (`feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `refactor(scope): ...`).
