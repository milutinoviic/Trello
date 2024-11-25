FROM nginx:latest

COPY ./api-gateway.conf /etc/nginx/conf.d/api_gateway.conf

COPY ./cert.crt /etc/nginx/ssl/cert.crt
COPY ./privat.key /etc/nginx/ssl/privat.key

RUN rm /etc/nginx/conf.d/default.conf
