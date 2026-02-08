# Multi-stage Dockerfile for Navigation Monitoring System

FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY backend ./backend
COPY frontend ./frontend
COPY simulator ./simulator
COPY config ./config
COPY .env.example ./.env

# Expose ports
EXPOSE 3000 4000/udp

# Start the application
CMD ["npm", "start"]
