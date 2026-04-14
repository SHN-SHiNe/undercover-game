FROM python:3.11-slim

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source code
COPY . .

# Build React frontend
WORKDIR /app/frontend
RUN npm install && node generate-icons.cjs && npm run build

WORKDIR /app

# Create persistent data directory
RUN mkdir -p /data

EXPOSE 7860

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:7860"]
