FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3009

ENV NODE_ENV=production
ENV PORT=3009

CMD ["node", "src/server.js"]