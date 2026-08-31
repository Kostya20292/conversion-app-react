FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    HOME=/work \
    SAL_USE_VCLPLUGIN=svp

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-dejavu-core \
    fonts-liberation \
    libreoffice-writer-nogui \
  && rm -rf /var/lib/apt/lists/* \
  && soffice --version \
  && useradd --system --uid 1000 --home-dir /work --shell /usr/sbin/nologin convertly \
  && mkdir -p /work \
  && chown convertly:convertly /work

USER convertly
WORKDIR /work
