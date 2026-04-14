FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
COPY --from=build /app/dist ./static
RUN mkdir -p /data
EXPOSE 7860
CMD ["gunicorn", "server:app", "--bind", "0.0.0.0:7860", "--workers", "2"]
