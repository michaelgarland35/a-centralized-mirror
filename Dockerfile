FROM node:10-alpine AS app-build
RUN apk add --no-cache git
RUN mkdir -p /app-src
WORKDIR /app-src
RUN git clone https://github.com/kyleratti/a-centralized-mirror.git .
RUN npm install
RUN npm run build

FROM node:10-alpine AS app
RUN mkdir /data
RUN mkdir /app
COPY --from=app-build /app-src/node_modules/ /app/node_modules/
COPY --from=app-build /app-src/templates/ /app/templates/
COPY --from=app-build /app-src/lib/ /app/lib/
COPY --from=app-build /app-src/scripts/ /app/scripts/

FROM alpine AS scripts
COPY --from=app /app/scripts/crontab.sh /usr/local/bin/a-centralized-mirror-crontab.sh
RUN echo '* * * * * /usr/local/bin/a-centralized-mirror-crontab.sh' > /etc/crontabs/node

EXPOSE 3010
VOLUME /data

WORKDIR /app
CMD [ "node", "-r", "dotenv/config", "lib/index.js" ]
