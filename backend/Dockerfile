# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl

# Copy package files and prisma schema (needed for postinstall prisma generate)
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies (postinstall runs prisma generate, needs schema above)
RUN npm install --legacy-peer-deps

# Copy remaining source
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies (OpenSSL is required by Prisma, postgresql-client and gzip for DB backups)
RUN apk add --no-cache openssl postgresql-client gzip

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
# Include static web site and built admin frontend so controllers can serve them
# COPY --from=builder /app/web ./web
# COPY --from=builder /app/admin/dist ./admin/dist

# Copy startup script
COPY --from=builder /app/startup.sh ./startup.sh
RUN chmod +x startup.sh

# Expose the API port
EXPOSE 3000

# Default command
CMD ["sh", "startup.sh"]
