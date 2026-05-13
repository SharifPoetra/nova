FROM node:22 AS build

WORKDIR /usr/src/app

COPY package*.json ./
COPY . .

RUN npm install

RUN npm run build

FROM node:22-slim

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/ ./

RUN mkdir -p /usr/src/app/logs && chown -R node:node /usr/src/app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE $PORT

USER node

CMD [ "node", "apps/bot/dist/index.js" ]
