
FROM node:18-alpine


WORKDIR /app


COPY package.json package-lock.json ./


RUN npm install && npm install -g @angular/cli


COPY . .

COPY ./cert.crt /app/cert.crt
COPY ./privat.key /app/privat.key


EXPOSE 4200

# Start the Angular development server
CMD ["ng", "serve", "--host", "0.0.0.0", "--ssl", "--ssl-key", "/app/privat.key", "--ssl-cert", "/app/cert.crt", "--poll", "2000"]
