# syntax=docker/dockerfile:1.4
FROM node:24-alpine AS builder

ARG COMPONENT_VERSION
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/patches ./.yarn/patches
COPY web-components/package.json ./web-components/
COPY react/package.json ./react/

RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    corepack enable \
 && yarn install --immutable --inline-builds --network-timeout 600000

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=12288"
ENV CI=true
ENV STORYBOOK_DISABLE_TELEMETRY=1
ENV NODE_ENV=production

# Build the matching source revision first to generate its stories and
# custom-elements metadata. Then replace the browser runtime with the exact npm
# tarball selected by the workflow.
RUN --mount=type=cache,target=/app/.stencil \
    set -eu; \
    test -n "$COMPONENT_VERSION"; \
    npm pkg set version="$COMPONENT_VERSION"; \
    timeout 600 yarn build; \
    mkdir -p /tmp/npm-package; \
    npm pack "@egov-moldova/mud@${COMPONENT_VERSION}" --pack-destination /tmp/npm-package; \
    tar -xzf /tmp/npm-package/*.tgz -C /tmp/npm-package; \
    test "$(node -p 'require("/tmp/npm-package/package/package.json").version')" = "$COMPONENT_VERSION"; \
    rm -rf dist loader; \
    cp -R /tmp/npm-package/package/dist ./dist; \
    cp -R /tmp/npm-package/package/loader ./loader; \
    yarn tokens.build; \
    timeout 600 yarn sp.docker

FROM nginx:1.27-alpine3.20

RUN apk update && apk upgrade && rm -rf /var/cache/apk/*
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/storybook-static /usr/share/nginx/html
COPY --from=builder /app/dist/esm /usr/share/nginx/html/assets
COPY --from=builder /app/tokens/generated /usr/share/nginx/html/tokens/generated
COPY docker/nginx-default.conf /etc/nginx/conf.d/default.conf

RUN addgroup -g 1001 -S appgroup \
    && adduser -u 1001 -S -G appgroup -h /home/appuser appuser
RUN chown -R 1001:1001 \
        /usr/share/nginx/html \
        /var/cache/nginx \
        /var/run \
        /etc/nginx \
    && chmod -R g+w \
        /var/cache/nginx \
        /var/run \
        /etc/nginx

EXPOSE 6006

RUN sed -i 's#pid[[:space:]]\+/var/run/nginx.pid;#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf

USER 1001:1001

CMD ["nginx", "-g", "daemon off;"]
