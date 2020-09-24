#!/usr/bin/env bash

version="0.0.1"
name="intercloud-grafana-plugin"

cat > /tmp/message <<-EOF
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

{
  "plugin": ${name},
  "version": ${version},
  "files": {
$(for i in $(ls $PWD/dist); do echo "    \"$i\": \"$(shasum -a 256 -p dist/LICENSE|sed 's/^\(.*\) .*$/\1/g')\",";done)
  },
  "time": $(date +%s)000,
  "keyId": "7e4d0c6a708866e7"
}
EOF
cat > /tmp/signature <<-EOF
-----BEGIN PGP SIGNATURE-----
Version: OpenPGP.js v4.10.1
Comment: https://openpgpjs.org

wqAEARMKAAYFAl6+uyoACgkQfk0ManCIZuc0+QIHdWC0dp7GRRFu3Hgk9tnl
FJnPwM6Y2tTdq7AkpVTTAb3RTFadA8dRmLfajxgHxmDf5yUv9M2M6sa1eTSG
8kJtOlwCB096dXOKsH1IOGQMCY+/xM2081FqbMTvWgN81xrxMoxftQn8z6VC
2nA2Rmt1VStppFVCCUXaq6Y4sFGHQF/yq5oi
=vqUQ
-----END PGP SIGNATURE-----
EOF

cat /tmp/message
cat /tmp/signature

rm /tmp/message /tmp/signature
