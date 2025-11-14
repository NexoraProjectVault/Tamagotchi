# Currently using Node.js LTS version on Alpine Linux for a lightweight image - for development

FROM node:20-alpine

WORKDIR /app

# Copy package files
# COPY frontend/package*.json ./
COPY package*.json ./


# Install dependencies
RUN npm install

# Copy frontend source code
# COPY frontend/ .
COPY . .

# Expose Vite dev server port

# Run development server with host set to allow external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]