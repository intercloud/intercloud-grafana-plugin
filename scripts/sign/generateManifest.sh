#!/usr/bin/env bash

version="0.0.1"
name="intercloud-grafana-plugin"

cat > /tmp/message <<-EOF
{
  "plugin": "${name}",
  "version": "${version}",
  "files": {
$(for i in $(ls $PWD/dist); do echo "    \"$i\": \"$(shasum -a 256 -p dist/LICENSE|sed 's/^\(.*\) .*$/\1/g')\",";done)
  },
  "time": $(date +%s)000,
  "keyId": "8600FC84B8C97CA2"
}
EOF

gpg --verbose --export-secret-key 8600FC84B8C97CA28973A93B670694730A0824DD > testGrafana.sec.asc
gpg --batch --allow-secret-key-import --import testGrafana.sec.asc

gpg --output /tmp/signature -u TestGrafana --clearsign /tmp/message
cp /tmp/signature MANIFEST.txt
rm /tmp/message /tmp/signature testGrafana.sec.asc
