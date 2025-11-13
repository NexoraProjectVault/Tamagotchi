FROM python:3.11-slim
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

ENV PYTHONUNBUFFERED=1
#CMD ["python", "app.py"]

ENV PYTHONPATH=/app:/app/shared

CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--timeout", "120", "app:create_app()"]