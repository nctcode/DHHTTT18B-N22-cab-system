FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy service code
COPY . .

EXPOSE 3004

CMD ["npm", "start"]