# Renders the vector tiles into raster tiles and static map images.
FROM alpine:3.22 AS fonts

ARG FONTS_VERSION=2.0
ARG FONTS_SHA256=d117316544b43a5dde7ee761b36e17701e9f85574e181d76a74814240fdbaf34

# Only the three faces the style asks for, out of the whole Noto family.
RUN apk add --no-cache curl unzip \
 && curl -fsSL -o /tmp/noto-sans.zip \
        "https://github.com/openmaptiles/fonts/releases/download/v${FONTS_VERSION}/noto-sans.zip" \
 && echo "${FONTS_SHA256}  /tmp/noto-sans.zip" | sha256sum -c - \
 && mkdir /fonts \
 && unzip -q /tmp/noto-sans.zip 'Noto Sans Regular/*' 'Noto Sans Bold/*' 'Noto Sans Italic/*' -d /fonts

FROM maptiler/tileserver-gl:v5.6.0

COPY --from=fonts /fonts /opt/map-server/fonts
COPY config.json /opt/map-server/config.json
COPY styles /opt/map-server/styles
COPY icons /opt/map-server/icons
COPY --chmod=755 entrypoint.sh /opt/map-server/entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD ["node", "/usr/src/app/src/healthcheck.js"]

ENTRYPOINT ["/opt/map-server/entrypoint.sh"]
