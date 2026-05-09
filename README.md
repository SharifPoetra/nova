# 🌌 Nova - Discord Bot & Activity RPG

Nova adalah proyek Discord Bot berbasis **Activity RPG** yang dibangun dengan arsitektur **Monorepo**. Proyek ini menggunakan **Sapphire Framework** untuk logika bot dan **Mongoose (MongoDB)** untuk manajemen database yang scalable.

---

## 🛠️ Tech Stack

- **Runtime:** [Node.js 20+](https://nodejs.org/) (tested di 24.14.1 Termux)
- **Language:** [TypeScript](https://www.typescript.org/)
- **Bot Framework:** [Sapphire Framework](https://www.sapphirejs.dev/)
- **Database:** [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **Package Manager:** [NPM Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- **Development Tool:** [tsx](https://tsx.is/) (untuk eksekusi TS super cepat)
- **Linter/Formatter:** [ESLint v10](https://eslint.org/) & [Prettier](https://prettier.io/)

---

## 📂 Struktur Proyek

```text
nova/
├── apps/
│   └── bot/ # Sapphire bot (CommonJS output)
│       ├── src/
│       │   ├── commands/ # /ping, /daily, /hunt, dll
│       │   ├── listeners/
│       │   └── index.ts
│       └── dist/ # hasil build
├── packages/
│   └── database/ # @nova/db - schema & connection
│       ├── src/
│       │   ├── models/
│       │   └── index.ts
│       └── dist/
├──.env # di root
├── eslint.config.js
├── tsconfig.base.json
└── package.json
```

## 🚀 Cara Setup (Local/Termux)
### 1. Prasyarat
 * Node.js versi 20 atau lebih baru.
 * MongoDB (Local atau MongoDB Atlas).
### 2. Clone & Install
```bash
# Clone repository ini
git clone https://github.com/SharifPoetra/nova.git
cd nova

# Install semua dependencies (otomatis melink workspaces)
npm install

```

### 3. Konfigurasi (.env)
Buat file .env di **folder root** (/nova/.env):
```env
DISCORD_TOKEN=your_bot_token
MONGODB_URI=mongodb+srv://user:pass@cluster/nova
NODE_ENV=development
OWNER_ID=your_discord_account_id
DEV_GUILD_ID=your_test_server_id
```

## 🏃 Menjalankan Proyek
### Mode Pengembangan (Development)
Untuk menjalankan bot dengan fitur *hot-reload* (otomatis restart saat kode diubah):
```bash
npm run bot:dev
```

### Mode Produksi (Build)
Untuk mengompilasi TypeScript:
```bash
npm run build
npm run start
```

## 🧹 Maintenance Code
Kami menyediakan beberapa script untuk menjaga kualitas kode:
 * **Linting:** npm run lint (Mengecek kesalahan kode).
 * **Formatting:** npm run format (Merapikan penulisan kode).
 * **Clean:** npm run clean (Menghapus node_modules dan dist di semua workspace jika terjadi error cache).

## 📜 Fitur Saat Ini
 * [x] **Modular Database:** Skema terpisah di @nova/db.
 * [x] **Economy System:** /daily reward dengan cooldown 24 jam.
 * [x] **Profile System:** Cek saldo, EXP, dan level.
 * [x] **Modern ESLint:** Menggunakan Flat Config (ESLint 10).
 * [x] **Monorepo Architecture:** Menggunakan NPM Workspaces.

## 🤝 Kontribusi
 * 1. Fork repo
 * 2. npm run bot:dev untuk test
 * 3. Buat branch: feat/duel
 * 4. PR dengan deskripsi jelas
 * 
Pastikan npm run lint lolos sebelum push.

## 👤 Author
 * **SharifPoetra** - *Main Developer* - [GitHub](https://github.com/SharifPoetra/)

## 📄 License
Proyek ini dilisensikan di bawah **MIT License**.
