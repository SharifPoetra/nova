# ---- BUILD ----
FROM node:24 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/bot/package*.json ./apps/bot/
COPY apps/api/package*.json ./apps/api/

RUN npm ci --workspaces

COPY . .
RUN npm run build

# ---- RUNTIME ----
FROM node:24-alpine

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# install prod deps only
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/bot/package*.json ./apps/bot/
RUN npm ci --omit=dev --workspaces --ignore-scripts && npm cache clean --force

# copy build output
COPY --from=build /usr/src/app/packages/database/dist ./packages/database/dist
COPY --from=build /usr/src/app/apps/bot/dist ./apps/bot/dist

RUN mkdir -p /usr/src/app/logs && chown -R node:node /usr/src/app

USER node
CMD ["node", "apps/bot/dist/index.js"]
