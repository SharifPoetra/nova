# 🌌 Nova — Discord RPG Bot

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Sapphire](https://img.shields.io/badge/Sapphire-v5-5865F2?logo=discord&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ghcr.io-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)
[![Build](https://github.com/SharifPoetra/nova/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/SharifPoetra/nova/actions)

Nova adalah Discord bot RPG berbasis monorepo. Dibangun dengan Sapphire Framework v5 dan Mongoose, fokus ke grinding, dungeon 100 lantai, class system, dan economy yang scalable.

**🆕 Battle Engine v2**

## ✨ Fitur

- **RPG Core**: EXP, level, 3 class (Warrior/Mage/Rogue) dengan stat unik
- **Battle Engine v2**: turn-based, skill system, cooldown, buff/debuff
- **Class Passives**:
  - 🛡️ Warrior: Shield Wall (20% block) + Berserker Blood (+1% ATK per 10% HP lost)
  - 💨 Rogue: Evasion (10% dodge) + Shadow Dance (+15% crit)
  - 🔮 Mage: Mana Shield (20% dmg → stamina) + Arcane Intellect (+25% crit dmg)
- **Dungeon**: 100 lantai, boss setiap 10 lantai, state management
- **Hunt & Explore**: /hunt, /explore, /fish dengan drop table
- **Crafting**: /cook dan /craft dengan recipe dan select menu
- **Economy**: /daily, /shop, /sell, stamina system
- **Infra**: interaction handlers, error listeners, OwnerOnly, package @nova/db terpisah

## 🛠️ Stack

| Kategori | Teknologi |
|---|---|
| Runtime | Node.js 22 |
| Language | TypeScript 6 |
| Framework | Sapphire v5 |
| Database | MongoDB + Mongoose |
| Testing | Vitest |
| Monorepo | npm workspaces |
| Dev | tsx, ESLint v10, Prettier |

## 📂 Struktur

```
nova/
├── apps/bot/src/
│   ├── commands/General/  # ping, help, profile
│   ├── commands/Economy/  # daily, shop, sell
│   ├── commands/RPG/      # start, explore, hunt, fish, cook, dungeon
│   ├── interaction-handlers/
│   ├── listeners/
│   └── lib/rpg/
│       ├── combat.ts       # stat calculation & buffs
│       ├── skills.ts       # skills & passives
│       ├── battle-engine.ts # turn-based engine
│       └── ...
├── packages/database/     # @nova/db schemas
├── Dockerfile
└── package.json
```

## 📜 Commands

**General**: /ping, /help, /profile  
**Economy**: /daily, /shop, /sell  
**RPG**: /start, /explore, /hunt, /fish, /cook, /craft, /dungeon, /inventory, /droprate

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

Edit .env, lalu:

```bash
npm run bot:dev   # dev
npm run build && npm run start   # prod
```

**Railway / Render / Fly.io**
- Image: ghcr.io/sharifpoetra/nova:latest
- Env: DISCORD_TOKEN, MONGODB_URI, OWNER_ID

## 🧹 Scripts

- npm run lint — cek ESLint
- npm run format — Prettier
- npm test — run Vitest unit tests
- npm run clean — hapus node_modules & dist

## 🤝 Kontribusi

PR welcome. Baca [CONTRIBUTING.md](CONTRIBUTING.md) dulu.

## 👤 Author
**SharifPoetra** - [GitHub](https://github.com/SharifPoetra)

## 📄 License
[MIT License](LICENSE)
