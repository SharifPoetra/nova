FROM node:22 AS build

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install
RUN npm install --save-dev typescript @types/node

COPY . .

RUN npm run build

FROM node:22-slim

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./
RUN npm install --only=production

COPY --from=build /usr/src/app/apps/bot ./apps/bot
COPY --from=build /usr/src/app/packages/database ./packages/database

ENV PORT=8080
EXPOSE $PORT


USER node

CMD [ "node", "apps/bot/dist/index.js" ]
