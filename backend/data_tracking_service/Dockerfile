FROM python:3.12-slim
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN apt-get update && apt-get install -y curl postgresql-client && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5004
ENV PYTHONUNBUFFERED=1
CMD ["python", "app.py"]
