FROM node:20-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install backend dependencies
RUN cd backend && npm ci --only=production

# Install frontend dependencies and build
RUN cd frontend && npm ci && npm run build

WORKDIR /app/backend

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "run", "start:prod"]
