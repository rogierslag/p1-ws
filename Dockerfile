FROM node:14

ADD yarn.lock .
ADD package.json .
RUN yarn install --frozen-lockfile
ADD index.html .
ADD index.js .

CMD ["node", "--unhandled-rejections=strict", "index.js"]
