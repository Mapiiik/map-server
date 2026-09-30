#!/bin/bash
# Serves the tiles once they exist, and reloads them whenever the builder replaces the file.
set -u

tiles=/data/tiles/tiles.mbtiles

until [ -s "$tiles" ]; do
    echo "Waiting for $tiles, the builder makes it on its first run."
    sleep 30
done

/usr/src/app/docker-entrypoint.sh \
    --config /opt/map-server/config.json \
    --public_url http://tileserver:8080/ \
    "$@" &
pid=$!
trap 'kill -TERM "$pid" 2>/dev/null' TERM INT

seen=$(stat -c %Y "$tiles")
while kill -0 "$pid" 2>/dev/null; do
    sleep "${RELOAD_CHECK_INTERVAL:-60}" &
    wait $!

    current=$(stat -c %Y "$tiles" 2>/dev/null || echo "$seen")
    if [ "$current" != "$seen" ]; then
        echo "The tiles changed, reloading."
        kill -HUP "$pid"
        seen=$current
    fi
done

wait "$pid"
