FROM node:20 as builder
WORKDIR /app

# Copy package files and install all dependencies (including dev dependencies for building)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application (TypeScript compilation + Vite build)
RUN npm run build

# Production stage
FROM nginx:1.27-alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

