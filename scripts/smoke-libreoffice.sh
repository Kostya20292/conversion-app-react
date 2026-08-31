#!/usr/bin/env bash
# Проверяет тот же путь, что и worker: docker create → cp → soffice → cp.
set -euo pipefail

IMAGE="${LIBREOFFICE_DOCKER_IMAGE:-convertly-libreoffice:local}"
NAME="convertly-lo-smoke-$$"
TMP="$(mktemp -d)"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

DOCX_B64='UEsDBBQAAAAIAGOaHl3XeYTq8QAAALgBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QzU7DMBCE730Ky9cqccoBIZSkB36OwKE8wMreJFb9J69b2rdn00KREOVozXwz62nXB+/EHjPZGDq5qhspMOhobBg7+b55ru6koALBgIsBO3lEkut+0W6OCUkwHKiTUynpXinSE3qgOiYMrAwxeyj8zKNKoLcworppmlulYygYSlXmDNkvhGgfcYCdK+LpwMr5loyOpHg4e+e6TkJKzmoorKt9ML+Kqq+SmsmThyabaMkGqa6VzOL1jh/0lSfK1qB4g1xewLNRfcRslIl65xmu/0/649o4DFbjhZ/TUo4aiXh77+qL4sGG71+06jR8/wlQSwMEFAAAAAgAY5oeXSAbhuqyAAAALgEAAAsAAABfcmVscy8ucmVsc43Puw6CMBQG4J2naM4uBQdjDIXFmLAafICmPZRGeklbL7y9HRzEODie23fyN93TzOSOIWpnGdRlBQStcFJbxeAynDZ7IDFxK/nsLDJYMELXFs0ZZ57yTZy0jyQjNjKYUvIHSqOY0PBYOo82T0YXDE+5DIp6Lq5cId1W1Y6GTwPagpAVS3rJIPSyBjIsHv/h3ThqgUcnbgZt+vHlayPLPChMDB4uSCrf7TKzQHNKuorZvgBQSwMEFAAAAAgAY5oeXYiFzWylAAAA3wAAABEAAAB3b3JkL2RvY3VtZW50LnhtbDWOwQ7CIBBE734F2bulejCmKfRg4hfoByBg2wR2CaC1fy806eVlJpuZnX74ece+NqaZUMCpaYFZ1GRmHAU8H/fjFVjKCo1yhFbAahMM8tAvnSH98RYzKw2YukXAlHPoOE96sl6lhoLFcntT9CoXG0e+UDQhkrYplQfe8XPbXrhXM4I8MFZaX2TWKjcTZEGsyPJGWGZmt/a82sq4MWxJvker2qfJP1BLAQIUAxQAAAAIAGOaHl3XeYTq8QAAALgBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAY5oeXSAbhuqyAAAALgEAAAsAAAAAAAAAAAAAAIABIgEAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAY5oeXYiFzWylAAAA3wAAABEAAAAAAAAAAAAAAIAB/QEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAANECAAAAAA=='

node -e 'require("fs").writeFileSync(process.argv[1], Buffer.from(process.argv[2], "base64"))' \
  "$TMP/source.docx" "$DOCX_B64"

docker create --name "$NAME" --init --network=none --shm-size 256m \
  -e HOME=/tmp -e SAL_USE_VCLPLUGIN=svp \
  "$IMAGE" soffice \
  --headless --nologo --nofirststartwizard --norestore \
  -env:UserInstallation=file:///tmp/lo-profile \
  --convert-to pdf --outdir /tmp /tmp/source.docx >/dev/null

docker cp "$TMP/source.docx" "$NAME:/tmp/source.docx"
docker start -a "$NAME"
docker cp "$NAME:/tmp/source.pdf" "$TMP/source.pdf"
test -s "$TMP/source.pdf"
printf 'LibreOffice smoke: DOCX→PDF OK (%s bytes)\n' "$(wc -c < "$TMP/source.pdf" | tr -d ' ')"
