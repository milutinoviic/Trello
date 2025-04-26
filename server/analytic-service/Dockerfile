FROM golang:alpine as build_container
WORKDIR /app
COPY go.mod .
COPY go.sum .
RUN go mod download
COPY . .
RUN go build -o server

FROM alpine

# Install ca-certificates package to update the CA certificates
RUN apk add --no-cache ca-certificates

# Copy the built server and certificates from the build container
COPY --from=build_container /app/server /usr/bin
COPY --from=build_container /app/cert.crt /app/cert.crt
COPY --from=build_container /app/privat.key /app/privat.key

# Update CA certificates in the Alpine container to trust the copied certificate
RUN cp /app/cert.crt /usr/local/share/ca-certificates/cert.crt && update-ca-certificates

EXPOSE 8082

ENTRYPOINT ["server"]
