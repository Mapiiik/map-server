# map-server

A self-hosted map server in one Docker Compose project: OpenStreetMap raster tiles for Leaflet,
OpenLayers and the like, cached aerial imagery, static map images and an embeddable map page.
Nothing on the pages that use it has to talk to a third party, which is the point.

```
Geofabrik extracts ──> builder (osmium + Planetiler) ──> tiles.mbtiles
                                                            │
browser ──> Caddy ──/tiles/───> MapProxy (cache) ──> tileserver-gl (renders the tiles)
             │                        └───────────> national orthophoto WMS
             ├──/static/──> tileserver-gl (static images)
             └──/embed/───> a Leaflet page for iframes
```

| Service    | What it does                                                                        |
|------------|-------------------------------------------------------------------------------------|
| builder    | Downloads the extracts, merges them and builds vector tiles with Planetiler (OpenMapTiles schema). Checks daily, rebuilds when the tiles are older than `UPDATE_MAX_AGE_DAYS`. |
| tileserver | tileserver-gl with the OSM Bright style, renders raster tiles and static images. Picks up new tiles without a restart. |
| mapproxy   | MapProxy, caches the rendered tiles and the aerial imagery and serves them as XYZ.  |
| seeder     | Renders the cache ahead after every update, so a busy day does not wait for the renderer. Trims tiles nobody asked for. |
| caddy      | TLS with automatic certificates, standalone or behind an SNI proxy with the PROXY protocol. |

Scheduling runs inside the containers (supercronic); the host needs no cron and no Docker socket is
mounted anywhere.

## Quick start

```sh
cp .env.example .env    # set SERVER_NAME and REGIONS at least
docker compose up -d
docker compose logs -f builder
```

The first start downloads the extracts and builds the tiles; the tileserver waits for them. For
scale: the Czech Republic, Croatia and two neighbouring regions (1.5 GB of extracts) build in about
four minutes on 24 cores, with the container peaking at 5.5 GB of memory (`PLANETILER_HEAP` is 4 GB
by default). Fewer cores take proportionally longer. The data directory then holds about 4 GB of
sources and 1.2 GB of tiles, plus temporary files during a build and the cache.

`REGIONS` lists Geofabrik regions as they appear in their download URLs, for instance
`europe/czech-republic europe/poland/dolnoslaskie`. Several regions are merged into one map.

## Running behind a proxy

When another proxy already owns ports 80 and 443 and routes TLS by SNI without terminating it,
run the server in its network:

```sh
COMPOSE_FILE=compose.yaml:compose.behind-proxy.yaml
INGRESS_NETWORK=ingress            # the proxy's Docker network
INGRESS_ALIAS=maps_example_com     # the name the proxy reaches Caddy by
PROXY_ALLOW=172.18.0.0/16          # where the PROXY protocol header is trusted from
```

The proxy should send the PROXY protocol (v1 or v2) and must redirect plain HTTP to HTTPS itself.
Caddy takes the client's address from the PROXY header when it comes from `PROXY_ALLOW`, and
serves a connection without one under the connecting address. It obtains its certificate with the
TLS-ALPN challenge, which passes through SNI routing. See [examples/haproxy.cfg](examples/haproxy.cfg).

## Using the maps

**XYZ tiles**, e.g. in Leaflet:

```js
L.tileLayer('https://maps.example.com/tiles/osm/webmercator/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenMapTiles &copy; OpenStreetMap contributors',
}).addTo(map);
```

Layers: `osm` (PNG), and the example aerial imagery `cz-orthophoto` and `hr-orthophoto` (JPEG).

**Static images:**

```
https://maps.example.com/static/15.7399,50.7359,13/600x300.png
https://maps.example.com/static/15.7399,50.7359,13/600x300@2x.png?marker=15.7399,50.7359|pin.png
```

Markers use the icons in [tileserver/icons](tileserver/icons); remote and inline icons are refused.

**Embedded map:**

```html
<iframe src="https://maps.example.com/embed/?lat=50.7359&lng=15.7399&zoom=13&title=Sn%C4%9B%C5%BEka"
        width="600" height="400" style="border: 0" loading="lazy"></iframe>
```

Parameters: `lat`, `lng` (required), `zoom`, `title`, `layer=aerial`, `link=0` to hide the link to
Google Maps. Which pages may embed it is set by `EMBED_FRAME_ANCESTORS`. The layers it offers are
in [embed/layers.json](embed/layers.json).

## Aerial imagery

[mapproxy/mapproxy.yaml](mapproxy/mapproxy.yaml) carries two national orthophoto services as
examples, both open data: the Czech ČÚZK (CC BY 4.0) and the Croatian DGU (Open Licence of the
Republic of Croatia). MapProxy reprojects them into web mercator where needed and caches what
people look at. Replace them with your own country's, and keep the attribution their licences ask
for. Do not put services whose terms forbid caching, such as most commercial imagery, behind it.

## Keeping it current

- The builder checks daily (`UPDATE_SCHEDULE`) and rebuilds once the tiles are
  `UPDATE_MAX_AGE_DAYS` old. A failed run is simply tried again the next day. To rebuild now:
  `docker compose exec builder update-tiles --force`.
- The tileserver notices the new file within a minute and reloads it.
- The seeder then renders the whole area up to `SEED_MAX_ZOOM` again, and the places listed in
  `DATA_DIR/config/seed-coverage.geojson` up to `SEED_DETAIL_MAX_ZOOM` (points stand for a square of
  `SEED_DETAIL_RADIUS_KM`, see [the example](examples/seed-coverage.example.geojson)). Tiles from the
  old data are served until they are replaced, the ones not rendered ahead are dropped afterwards.
- Every week the cache loses what nobody asked for in `CACHE_MAX_AGE_DAYS`.

## Checking it works

```sh
curl -I https://maps.example.com/tiles/osm/webmercator/7/69/43.png
curl -o map.png "https://maps.example.com/static/15.74,50.74,12/400x300.png"
docker compose logs --tail 20 seeder
```

Behind a proxy, `ACCESS_LOG=on` shows whether Caddy sees the clients' addresses rather than the
proxy's. Locally, curl can send the PROXY header itself:
`curl --haproxy-protocol --resolve maps.example.com:443:127.0.0.1 https://maps.example.com/...`.

## Attribution and licences

Wherever the map is shown, credit **© OpenMapTiles © OpenStreetMap contributors**; the map data
is under the [ODbL](https://www.openstreetmap.org/copyright). The OSM Bright style is BSD and
CC-BY 4.0, see [its licence](tileserver/styles/osm-bright/LICENSE.md). Leaflet is BSD-2-Clause.

This project is under the GNU Affero General Public License v3, see [LICENSE.md](LICENSE.md).

## When something else fits better

This project serves raster tiles because the pages using it run Leaflet. If you can use vector
tiles and MapLibre GL JS, have a look at [VersaTiles](https://versatiles.org),
[OpenFreeMap](https://openfreemap.org), or for a whole maps stack with search and routing,
[Headway](https://github.com/headwaymaps/headway).
