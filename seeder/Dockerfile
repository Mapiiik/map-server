# Keeps the MapProxy cache warm: renders it ahead after every tile update and trims it by age.
FROM ghcr.io/mapproxy/mapproxy/mapproxy:7.0.0

ARG SUPERCRONIC_VERSION=0.2.49
ARG SUPERCRONIC_SHA256_AMD64=a53ae236602c7338aba3fbaff40bda6300eae3b9fedb8261eb06cfe3724430c1
ARG SUPERCRONIC_SHA256_ARM64=02aa0cb229ba09050cba6638059dadb9eedc2276632ea43d6a57a2f8c1629dd5
ARG TARGETARCH

USER root
RUN python3 - <<'EOF'
import hashlib, os, urllib.request

arch = os.environ.get('TARGETARCH') or 'amd64'
expected = {
    'amd64': os.environ['SUPERCRONIC_SHA256_AMD64'],
    'arm64': os.environ['SUPERCRONIC_SHA256_ARM64'],
}[arch]
url = ('https://github.com/aptible/supercronic/releases/download/'
       f"v{os.environ['SUPERCRONIC_VERSION']}/supercronic-linux-{arch}")
data = urllib.request.urlopen(url).read()
if hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit('supercronic checksum mismatch')
with open('/usr/local/bin/supercronic', 'wb') as f:
    f.write(data)
os.chmod('/usr/local/bin/supercronic', 0o755)
EOF

COPY --chmod=755 bin/ /usr/local/bin/

USER mapproxy
ENTRYPOINT ["seeder-entrypoint"]
