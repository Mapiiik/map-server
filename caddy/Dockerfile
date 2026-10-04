# Caddy with the site configuration and the embeddable map page baked in.
# Built from the repository root, see .dockerignore.
FROM caddy:2.11-alpine

COPY caddy/Caddyfile /etc/caddy/Caddyfile
COPY caddy/modes/ /etc/caddy/modes/
COPY caddy/log/ /etc/caddy/log/
COPY embed/ /srv/embed/
