FROM python:3.11-slim
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
ENV PYTHONUNBUFFERED=1

ENV PYTHONPATH=/app:/app/shared

# CMD ["python", "app.py"]
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "120", "app:create_app()"]