FROM golang:alpine as build_container
WORKDIR /app
COPY go.mod .
COPY go.sum .
RUN go mod download
COPY . .
RUN go build -o server

FROM alpine
COPY --from=build_container /app/server /usr/bin
COPY --from=build_container /app/10k-worst-passwords.txt /app/10k-worst-passwords.txt
EXPOSE 8090
ENTRYPOINT ["/usr/bin/server"]