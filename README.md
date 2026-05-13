# 🌌 Nova — Discord RPG Bot

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Sapphire](https://img.shields.io/badge/Sapphire-v5-5865F2?logo=discord&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ghcr.io-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)
[![Build](https://github.com/SharifPoetra/nova/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/SharifPoetra/nova/actions)

Nova adalah Discord bot RPG berbasis monorepo. Dibangun dengan Sapphire Framework v5 dan Mongoose, fokus ke grinding, dungeon 100 lantai, class system, dan economy yang scalable.

## ✨ Fitur

- **RPG**: EXP, level, class dengan stat unik
- **Dungeon**: turn-based battle, event random, state management
- **Exploration**: `/explore`, `/hunt`, `/fish` dengan drop table
- **Crafting**: `/cook` dengan recipe dan select menu
- **Economy**: `/daily`, `/shop`, `/sell`
- **Infra**: interaction handlers, error listeners, preconditions OwnerOnly, package `@nova/db` terpisah

## 🛠️ Stack

| Kategori | Teknologi |
|---|---|
| Runtime | Node.js 22 |
| Language | TypeScript 6 |
| Framework | Sapphire v5 |
| Database | MongoDB + Mongoose |
| Monorepo | npm workspaces |
| Dev | tsx, ESLint v10, Prettier |

## 📂 Struktur

```
nova/
├── apps/bot/src/
│   ├── commands/General/  # ping, help, profile
│   ├── commands/Economy/  # daily, shop, sell
│   ├── commands/RPG/      # start, explore, hunt, fish, cook, dungeon
│   ├── commands/Owner/    # reset
│   ├── interaction-handlers/
│   ├── listeners/
│   └── lib/rpg/
├── packages/database/     # @nova/db schemas
├── Dockerfile
└── package.json
```

## 📜 Commands

**General**: `/ping`, `/help`, `/profile`  
**Economy**: `/daily`, `/shop`, `/sell`  
**RPG**: `/start`, `/explore`, `/hunt`, `/fish`, `/cook`, `/dungeon`, `/inventory`, `/droprate`

## 🐳 Deploy

### Pull dari GHCR
```bash
docker pull ghcr.io/sharifpoetra/nova:latest
docker run -d --name nova --env-file .env -e NODE_ENV=production --restart unless-stopped ghcr.io/sharifpoetra/nova:latest
```

### Build lokal
```bash
git clone https://github.com/SharifPoetra/nova.git
cd nova
docker build -t nova .
docker run -d --env-file .env nova
```

## 🚀 Setup lokal

```bash
git clone https://github.com/SharifPoetra/nova.git
cd nova
npm install
cp .env.example .env
```

Edit `.env`, lalu:

```bash
npm run bot:dev   # dev
npm run build && npm run start   # prod
```

**Railway / Render / Fly.io**
- Image: `ghcr.io/sharifpoetra/nova:latest`
- Env: `DISCORD_TOKEN`, `MONGODB_URI`, `OWNER_ID`

## 🧹 Scripts

- `npm run lint` — cek ESLint
- `npm run format` — Prettier
- `npm run clean` — hapus node_modules & dist

## 🤝 Kontribusi

PR welcome. Baca [CONTRIBUTING.md](CONTRIBUTING.md) dulu.

## 👤 Author
**SharifPoetra** - [GitHub](https://github.com/SharifPoetra)

## 📄 License
[MIT License](LICENSE)
