# 🌌 Nova - Discord Bot & Activity RPG

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Sapphire](https://img.shields.io/badge/Sapphire-v5-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://sapphirejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![ESLint](https://img.shields.io/badge/ESLint-10-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)](https://eslint.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Monorepo](https://img.shields.io/badge/Monorepo-NPM_Workspaces-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://docs.npmjs.com/cli/v7/using-npm/workspaces)

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
| **Runtime** | [Node.js 20+](https://nodejs.org/) |
| **Language** | [TypeScript 6.0](https://www.typescript.org/) |
| **Bot Framework** | [Sapphire Framework v5](https://www.sapphirejs.dev/) |
| **Database** | [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) |
| **Package Manager** | [NPM Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) |
| **Dev Tools** | [tsx](https://tsx.is/) untuk hot-reload |
| **Linter/Formatter** | [ESLint v10 Flat Config](https://eslint.org/) & [Prettier](https://prettier.io/) |

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
│ │ ├── interaction-handlers/ # classSelect.ts, cookSelect.ts, helpSelect.ts
│ │ ├── listeners/ # client & command error handlers
│ │ ├── lib/rpg/ # Logic game: classes, buffs, dungeon, leveling, monsters
│ │ ├── preconditions/ # OwnerOnly.ts
│ │ └── index.ts
│ └── tsconfig.json
├── packages/
│ └── database/ # @nova/db
│ └── src/
│ ├── models/ # User.ts, Item.ts, Dungeon.ts
│ └── index.ts # DB connection
├── .env.example
├── eslint.config.js # Flat config ESLint 10
├── tsconfig.base.json # Base TS config untuk monorepo
└── package.json # Workspaces + scripts
```

---

## 📜 Daftar Command

### General
| Command | Deskripsi |
| --- | --- |
| `/ping` | Cek latency bot |
| `/help` | List semua command + select menu kategori |
| `/profile` | Lihat profil, level, saldo, class |

### Economy
| Command | Deskripsi |
| --- | --- |
| `/daily` | Klaim reward harian, cooldown 24 jam |
| `/shop` | Beli item/consumable |
| `/sell` | Jual item dari inventory |

### RPG
| Command | Deskripsi |
| --- | --- |
| `/start` | Buat karakter & pilih class |
| `/explore` | Jelajahi area untuk EXP & drop random |
| `/hunt` | Berburu monster untuk material |
| `/fish` | Memancing untuk dapat ikan |
| `/cook` | Masak dari recipe yang dimiliki |
| `/dungeon` | Masuk dungeon turn-based battle |
| `/inventory` | Cek semua item & equipment |
| `/droprate` | Cek drop rate monster/item |

### Owner
| Command | Deskripsi |
| --- | --- |
| `/reset <user>` | Reset data user, owner only |

---

## 🚀 Cara Setup (Local/Termux)

### 1. Prasyarat
- Node.js versi 20+
- MongoDB Local atau MongoDB Atlas

### 2. Clone & Install
```bash
git clone https://github.com/SharifPoetra/nova.git
cd nova

# Install semua dependencies + link workspaces
npm install
```

### 3. Konfigurasi .env
Copy `.env.example` ke `.env` di **folder root**:
```env
DISCORD_TOKEN=your_bot_token
MONGODB_URI=mongodb+srv://user:pass@cluster/nova
NODE_ENV=development
OWNER_ID=your_discord_account_id
DEV_GUILD_ID=your_test_server_id
```

## 🏃 Menjalankan Proyek
### Mode Development
Hot-reload dengan `tsx`:
```bash
npm run bot:dev
```

### Mode Produksi
```bash
npm run build
npm run start
```

## 🧹 Scripts Maintenance
| Script | Fungsi |
| --- | --- |
| `npm run lint` | Cek error ESLint v10 |
| `npm run format` | Format dengan Prettier |
| `npm run clean` | Hapus `node_modules` & `dist` semua workspace |

## 🤝 Kontribusi
Kontribusi terbuka! Baca **[CONTRIBUTING.md](CONTRIBUTING.md)** dulu sebelum PR.

Pastikan `npm run lint` lolos.

## 👤 Author
**SharifPoetra** - *Main Developer* - [GitHub](https://github.com/SharifPoetra/)

## 📄 License
Proyek ini dilisensikan di bawah **[MIT License](LICENSE)**.
