FROM node:22 AS build

WORKDIR /usr/src/app

COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/bot/package*.json ./apps/bot/

RUN npm ci --workspaces

COPY . .

RUN npm run build

FROM node:22-slim

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/ ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE $PORT

CMD [ "node", "apps/bot/dist/index.js" ]
