# Turns OpenStreetMap extracts into vector tiles, on a schedule of its own.
FROM eclipse-temurin:21-jre

ARG PLANETILER_VERSION=0.10.2
ARG PLANETILER_SHA256=f310bd0413e2e4512b27f4046d418664e8e1d3bf31603c2a70e23de06c167e4d
ARG SUPERCRONIC_VERSION=0.2.49
ARG SUPERCRONIC_SHA256_AMD64=a53ae236602c7338aba3fbaff40bda6300eae3b9fedb8261eb06cfe3724430c1
ARG SUPERCRONIC_SHA256_ARM64=02aa0cb229ba09050cba6638059dadb9eedc2276632ea43d6a57a2f8c1629dd5
ARG TARGETARCH

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl osmium-tool \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /opt/planetiler.jar \
        "https://github.com/onthegomap/planetiler/releases/download/v${PLANETILER_VERSION}/planetiler.jar" \
 && echo "${PLANETILER_SHA256}  /opt/planetiler.jar" | sha256sum -c -

RUN case "${TARGETARCH:-amd64}" in \
        amd64) sum="${SUPERCRONIC_SHA256_AMD64}" ;; \
        arm64) sum="${SUPERCRONIC_SHA256_ARM64}" ;; \
        *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
 && curl -fsSL -o /usr/local/bin/supercronic \
        "https://github.com/aptible/supercronic/releases/download/v${SUPERCRONIC_VERSION}/supercronic-linux-${TARGETARCH:-amd64}" \
 && echo "${sum}  /usr/local/bin/supercronic" | sha256sum -c - \
 && chmod +x /usr/local/bin/supercronic

# The same uid as MapProxy, so that one chown of the data directory serves everybody.
RUN userdel -r ubuntu 2>/dev/null || true \
 && useradd --uid 1000 --user-group --home-dir /data --no-create-home builder

COPY bin/ /usr/local/bin/
RUN chmod +x /usr/local/bin/*

USER builder
WORKDIR /data
ENTRYPOINT ["entrypoint"]
