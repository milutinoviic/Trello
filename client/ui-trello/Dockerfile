FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install -g @angular/cli

COPY . .

#RUN ng build --configuration=production

#FROM nginx:alpine
#COPY --from=build /app/dist/ui-trello /usr/share/nginx/html

#COPY nginx.conf /etc/nginx/conf.d/default.conf

#EXPOSE 80

CMD ["ng", "serve", "--host", "0.0.0.0"]

