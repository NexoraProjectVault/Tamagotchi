# Currently using Node.js LTS version on Alpine Linux for a lightweight image - for development

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY . .

# Run development server with host set to allow external connections
CMD ["npm", "run", "dev"]