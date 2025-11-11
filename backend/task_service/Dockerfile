# Use a lightweight Python image
FROM python:3.12-slim

# Install needed packages (like curl & Postgres client)
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside container
WORKDIR /app

# Copy dependency list first (for Docker layer caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the service source code
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app:/app/shared

# Expose the Flask service port (5003)
EXPOSE 5003

# Command to start your service
CMD ["python", "app.py"]
