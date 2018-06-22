#############################################################
##              gameboy-server dockerfile

FROM node:8.11.3-alpine

ENV WORKPLACE "/app"
ENV GIT_URL "https://github.com/baykier/gameboy-server.git"

RUN set -ex && \
    mkdir -p ${WORKPLACE} && \
    apk add --update git && \
    cd ${WORKPLACE} && \
    git clone ${GIT_URL} && \
    cd gameboy-server && \
    yarn install

EXPOSE 3000

CMD ["node","/app/gameboy-server/index.js"]

