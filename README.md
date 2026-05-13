# 🌌 Nova - Discord Bot & Activity RPG

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![Sapphire](https://img.shields.io/badge/Sapphire-v5-5865F2?logo=discord)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)
![ESLint](https://img.shields.io/badge/ESLint-v10-4B32C3?logo=eslint)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Monorepo](https://img.shields.io/badge/Monorepo-NPM_Workspaces-CB3837)
![Docker](https://img.shields.io/badge/Docker-ghcr.io-blue?logo=docker)

Nova adalah Discord Bot + Activity berbasis **RPG** yang dibangun dengan arsitektur **Monorepo**. Menggunakan **Sapphire Framework** untuk command handler yang modular dan **Mongoose (MongoDB)** untuk data persistence. Fokusnya ke sistem grinding, dungeon, class, dan economy yang scalable.

---

## ✨ Fitur Utama

**Core Systems**
- **RPG Progression**: EXP, leveling, class system dengan stat unik
- **Dungeon System**: Battle turn-based, event random, state management, UI komponen
- **Class & Buffs**: Pilih class saat `/start`, buff/debuff saat combat
- **Exploration & Gathering**: `/explore`, `/hunt`, `/fish` dengan drop table & droprate
- **Crafting**: `/cook` dengan sistem recipe dan select menu interaction

**Bot Infrastructure**
- **Interaction Handlers**: Support select menu untuk class, cook, help
- **Error Handling**: Listener untuk `chatInputCommandError`, `interactionHandlerError`
- **Preconditions**: `OwnerOnly` untuk command admin
- **Monorepo**: `@nova/db` package terpisah untuk semua schema User, Item, Dungeon

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
| --- | --- |
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript 6.0 |
| **Bot Framework** | Sapphire Framework v5 |
| **Database** | MongoDB via Mongoose |
| **Package Manager** | NPM Workspaces |
| **Dev Tools** | tsx untuk hot-reload |
| **Linter/Formatter** | ESLint v10 Flat Config & Prettier |

---

## 📂 Struktur Proyek

```
nova/
├── apps/
│ └── bot/ # Sapphire bot
│ ├── src/
│ │ ├── commands/
│ │ │ ├── Economy/ # daily.ts, shop.ts
│ │ │ ├── General/ # help.ts, ping.ts, profile.ts
│ │ │ ├── Owner/ # reset.ts
│ │ │ └── RPG/ # cook.ts, dungeon.ts, explore.ts, fish.ts, hunt.ts, etc
│ │ ├── interaction-handlers/
│ │ ├── listeners/
│ │ ├── lib/rpg/
│ │ ├── preconditions/
│ │ └── index.ts
│ └── tsconfig.json
├── packages/database/
├── .env.example
├── Dockerfile
└── package.json
```

---

## 📜 Daftar Command

### General
| Command | Deskripsi |
| --- | --- |
| `/ping` | Cek latency bot |
| `/help` | List semua command + select menu |
| `/profile` | Lihat profil, level, saldo, class |

### Economy
| Command | Deskripsi |
| --- | --- |
| `/daily` | Klaim reward harian |
| `/shop` | Beli item/consumable |
| `/sell` | Jual item dari inventory |

### RPG
| Command | Deskripsi |
| --- | --- |
| `/start` | Buat karakter & pilih class |
| `/explore` | Jelajahi area untuk EXP & drop |
| `/hunt` | Berburu monster |
| `/fish` | Memancing |
| `/cook` | Masak untuk heal/buff |
| `/dungeon` | Masuk dungeon 100 lantai |
| `/inventory` | Cek semua item |
| `/droprate` | Cek drop rate |

---

## 🐳 Deploy dengan Docker

### Opsi 1: Pull dari GHCR (Paling Cepat) ⭐
Image official auto-build tiap push ke main:

```bash
docker pull ghcr.io/sharifpoetra/nova:latest

docker run -d --name nova \
  --env-file .env \
  -e NODE_ENV=production \
  --restart unless-stopped \
  ghcr.io/sharifpoetra/nova:latest
```

### Opsi 2: Build Lokal
```bash
git clone https://github.com/SharifPoetra/nova.git
cd nova
docker build -t nova-bot .
docker run -d --env-file .env nova-bot
```

### Deploy ke Platform

**Railway**
1. New Project → Deploy from GitHub
2. Atau: Deploy from Image → `ghcr.io/sharifpoetra/nova:latest`
3. Add Variables: `DISCORD_TOKEN`, `MONGODB_URI`, `OWNER_ID`

**Fly.io**
```bash
fly launch --image ghcr.io/sharifpoetra/nova:latest
fly secrets set DISCORD_TOKEN=xxx MONGODB_URI=xxx
```

**Render**
- New → Web Service → Deploy existing image
- Image URL: `ghcr.io/sharifpoetra/nova:latest`

**Keunggulan:**
- Image ~84MB (Node 22 slim multi-stage)
- Build otomatis via GitHub Actions
- No build time di Railway/Render

---

## 🚀 Cara Setup (Local/Termux)

### 1. Prasyarat
- Node.js 20+
- MongoDB Atlas atau local

### 2. Install
```bash
git clone https://github.com/SharifPoetra/nova.git
cd nova
npm install
```

### 3. .env
```env
DISCORD_TOKEN=your_bot_token
MONGODB_URI=mongodb+srv://...
NODE_ENV=development
OWNER_ID=your_id
DEV_GUILD_ID=test_server_id
```

### 4. Jalankan
```bash
# dev
npm run bot:dev

# production
npm run build
npm run start
```

---

## 🧹 Scripts
| Script | Fungsi |
| `npm run lint` | Cek ESLint |
| `npm run format` | Format Prettier |
| `npm run clean` | Hapus node_modules & dist |

---

## 🤝 Kontribusi
Baca CONTRIBUTING.md sebelum PR.

## 👤 Author
**SharifPoetra** - [GitHub](https://github.com/SharifPoetra)

## 📄 License
MIT License
