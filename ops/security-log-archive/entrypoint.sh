#!/bin/sh
set -eu
# Fixed archive directory only. The receiver itself runs without root.
mkdir -p /var/data/apgi-security-logs
chown node:node /var/data/apgi-security-logs
exec gosu node node /app/receiver.mjs
