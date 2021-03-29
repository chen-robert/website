FROM node:14

RUN mkdir /app
WORKDIR /app

COPY package.json yarn.lock ./

ENV NODE_ENV production
RUN yarn install --prod --frozen-lockfile && yarn cache clean

COPY . .

CMD ["node", "index.js"]
