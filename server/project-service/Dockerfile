FROM golang:alpine as build_container
WORKDIR /app
COPY go.mod .
COPY go.sum .
RUN go mod download
COPY . .
RUN go build -o server

FROM alpine
COPY --from=build_container /app/server /usr/bin
COPY --from=build_container /app/cert.crt /app/cert.crt
COPY --from=build_container /app/privat.key /app/privat.key

EXPOSE 8080
ENTRYPOINT ["server"]