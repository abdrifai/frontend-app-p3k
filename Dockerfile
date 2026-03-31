# Build stage for Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDeps for build)
RUN npm install

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Run stage
FROM node:20-alpine

WORKDIR /app

# Copy built files and package.json
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose port (SvelteKit default for node adapter is 3000, 
# but usually configured via PORT env)
ENV PORT=5173
EXPOSE 5173

# Start application
CMD ["node", "build"]
