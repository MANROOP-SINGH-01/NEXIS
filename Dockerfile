# Stage 1: Build the Vite frontend
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
# We build the frontend assets which output to /app/dist
RUN npm run build

# Stage 2: Minimal Node.js production image
FROM node:22-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the backend code
COPY server ./server
# If there are any other necessary server-side files (like data for sqlite), copy them
COPY data ./data

# Copy the built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Set permissions for the data directory so SQLite can write to it
RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 8787
ENV NODE_ENV=production
ENV PORT=8787

# Run as non-root user for security
USER node

# Start the Express server
CMD ["node", "server/index.js"]
