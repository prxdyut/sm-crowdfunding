# Build and run stage
FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json /app
RUN npm i

# Copy the rest of the application code
COPY . .

# Expose port 4000
EXPOSE 5173

# Start the application
CMD ["npm", "run", "dev", "--", "--port", "5173", "--host"]