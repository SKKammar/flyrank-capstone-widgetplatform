FROM node:20-alpine AS base

# Install build dependencies for native modules (bcrypt, better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (including production and build tools)
RUN npm ci

# Copy entire application source
COPY . .

# Expose default HTTP port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start server (runs migration check on startup if desired, or npm start)
CMD ["npm", "start"]
