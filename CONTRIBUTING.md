# Contributing to Nova

Terima kasih udah tertarik kontribusi ke Nova!

## 🧰 Setup Cepat
```bash
git clone https://github.com/SharifPoetra/nova.git
cd nova
npm install
cp .env.example .env
npm run bot:dev
```

## 📐 Aturan Kode
1. TypeScript strict — hindari `any`
2. ESLint 10 — `npm run lint` sebelum push
3. Prettier — `npm run format`
4. Jangan ubah ke ESM tanpa diskusi (bot pakai CommonJS)
5. Model DB di `packages/database/src/models`

## 🌿 Workflow Git
- Branch: `feat/nama`, `fix/nama`, `docs/nama`
- Commit: `feat(daily): implement streak`
- PR ke `main` dengan checklist lint & build

## 🧪 Testing
- Set `DEV_GUILD_ID` untuk test guild
- Pastikan command punya `registerApplicationCommands`

## 🚫 Tidak Diterima
- Hardcode token
- Dependency berat tanpa diskusi
- Ubah struktur monorepo tanpa issue

Happy coding! — SharifPoetra
