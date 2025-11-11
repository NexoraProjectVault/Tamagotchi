FROM node:20-alpine

WORKDIR /app

# Copy package files from frontend
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY frontend/ .

# Expose Vite dev server port
EXPOSE 5173

# Run development server with host set to allow external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]