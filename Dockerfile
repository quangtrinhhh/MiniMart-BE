# --- Build Stage ---
FROM node:23-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build


# --- Production Stage ---
FROM node:23-alpine AS runner

WORKDIR /app

# Copy only build output & necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm install --only=production

EXPOSE 8080
CMD ["node", "dist/main"]
