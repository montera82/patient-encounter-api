# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Create logs directory
RUN mkdir -p logs && chown nestjs:nodejs logs

# Create startup script for handling migrations
RUN echo '#!/bin/sh\n\
echo "Running Prisma migrations..."\n\
npx prisma migrate deploy\n\
echo "Starting application..."\n\
exec "$@"' > /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh && \
    chown nestjs:nodejs /app/docker-entrypoint.sh

USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/main.js --health-check || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["/app/docker-entrypoint.sh", "dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
