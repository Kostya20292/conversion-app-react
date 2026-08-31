FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-dejavu-core \
    fonts-liberation \
    libreoffice-writer-nogui \
  && rm -rf /var/lib/apt/lists/* \
  && soffice --version

WORKDIR /work
