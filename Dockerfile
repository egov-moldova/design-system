# syntax=docker/dockerfile:1.4
# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json yarn.lock .yarnrc.yml ./
COPY web-components/package.json ./web-components/

# Ensure Yarn 4 via Corepack and install dependencies immutably
# PERF: BuildKit cache mount for Yarn cache — persists between builds on self-hosted runner
RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    corepack enable \
 && corepack prepare yarn@4.9.4 --activate \
 && yarn install --immutable --inline-builds --network-timeout 600000

# Copy the rest of the application
COPY . .

# Set environment variables for non-interactive build
ENV NODE_OPTIONS="--max-old-space-size=12288"
ENV CI=true
ENV STORYBOOK_DISABLE_TELEMETRY=1
ENV NODE_ENV=production

# Build the application with explicit timeout and error handling
# yarn build runs tokens.build.prod + wca.custom-elements in parallel (Stencil + dist tokens)
# yarn tokens.build runs afterwards to write tokens/generated/*.css for Storybook preview-head.html
# PERF: BuildKit cache mount for Stencil cache — only changed components recompile
RUN --mount=type=cache,target=/app/.stencil \
    set -e && \
    echo "[1/2] Building Stencil components + tokens + custom-elements (parallel)..." && \
    timeout 600 yarn build || (echo "Build timed out or failed" && exit 1) && \
    echo "[2/2] Building token CSS for Storybook preview..." && \
    yarn tokens.build && \
    echo "[3/3] Building Storybook..." && \
    timeout 600 yarn sp.docker || (echo "Storybook build timed out or failed" && exit 1) && \
    echo "✅ Build completed successfully"

# Production stage with nginx
FROM nginx:1.27-alpine3.20

# Update Alpine packages to get latest security patches
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/storybook-static /usr/share/nginx/html
# Copy Stencil lazy-loaded entry modules to assets folder for runtime loading
COPY --from=builder /app/dist/esm /usr/share/nginx/html/assets
# Copy token CSS files — preview-head.html links to ./tokens/generated/*.css relative to iframe
COPY --from=builder /app/tokens/generated /usr/share/nginx/html/tokens/generated

# Copy nginx configuration
COPY docker/nginx-default.conf /etc/nginx/conf.d/default.conf

# Expose port 6006
EXPOSE 6006

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
