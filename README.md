# 🌌 Nova - Discord Bot & Activity RPG

Nova adalah proyek Discord Bot berbasis **Activity RPG** yang dibangun dengan arsitektur **Monorepo**. Proyek ini menggunakan **Sapphire Framework** untuk logika bot dan **Mongoose (MongoDB)** untuk manajemen database yang scalable.

---

## 🛠️ Tech Stack

- **Runtime:** [Node.js](https://nodejs.org/) (ESM Mode)
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
│   ├── bot/          # Core logika Discord Bot
│   └── activity/     # (Planned) Web dashboard atau activity RPG logic
├── packages/
│   └── database/     # Skema database & koneksi (Shared package)
├── .env              # Konfigurasi environment (Root)
├── package.json      # Root konfigurasi Monorepo
└── tsconfig.base.json     # Root konfigurasi TypeScript
```

## 🚀 Cara Setup (Local/Termux)
### 1. Prasyarat
 * Node.js versi 20 atau lebih baru.
 * MongoDB (Local atau MongoDB Atlas).
### 2. Clone & Install
```bash
# Clone repository ini
git clone [https://github.com/SharifPoetra/nova.git](https://github.com/SharifPoetra/nova.git)
cd nova

# Install semua dependencies (otomatis melink workspaces)
npm install

```

### 3. Konfigurasi (.env)
Buat file .env di **folder root** (/nova/.env):
```env
DISCORD_TOKEN=Token_Bot_Kamu_Disini
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nova

```

## 🏃 Menjalankan Proyek
### Mode Pengembangan (Development)
Untuk menjalankan bot dengan fitur *hot-reload* (otomatis restart saat kode diubah):
```bash
npm run bot:dev

```

### Mode Produksi (Build)
Untuk mengompilasi TypeScript menjadi JavaScript:
```bash
npm run build

```

## 🧹 Maintenance Commands
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

## 👤 Author
 * **SharifPoetra** - *Main Developer* - [GitHub](https://github.com/SharifPoetra/)

## 📄 License
Proyek ini dilisensikan di bawah **MIT License**.
