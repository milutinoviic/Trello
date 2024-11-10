FROM nginx:latest

COPY ./api-gateway.conf /etc/nginx/conf.d/api_gateway.conf

COPY ./trello.crt /etc/nginx/ssl/trello.crt
COPY ./trello.key /etc/nginx/ssl/trello.key

RUN rm /etc/nginx/conf.d/default.conf
