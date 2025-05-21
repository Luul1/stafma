# Build stage for React frontend
FROM node:16 AS frontend-build
WORKDIR /app/frontend
# Copy frontend package files
COPY frontend/package*.json ./
# Install frontend dependencies
RUN npm install
# Copy frontend source code
COPY frontend/ ./
# Build the frontend
RUN npm run build

# Build stage for Node.js backend
FROM node:16 AS backend-build
WORKDIR /app
# Copy backend package files
COPY package*.json ./
# Install backend dependencies
RUN npm install --production
# Copy backend source code
COPY . .
# Remove frontend directory to avoid duplication
RUN rm -rf frontend

# Final stage
FROM node:16-slim
WORKDIR /app
# Copy built backend
COPY --from=backend-build /app .
# Copy built frontend files to your backend's public folder
# Adjust the path if your backend serves static files from a different directory
COPY --from=frontend-build /app/frontend/build ./public

# Expose the port your app runs on
EXPOSE 8000

# Command to run your app
CMD ["npm", "start"]
