#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "Building..."
rm -rf dist
npm run build
echo "Cleaning VPS..."
ssh root@178.156.214.163 "rm -rf /var/www/receptionist/*"
echo "Uploading..."
scp -r dist/* root@178.156.214.163:/var/www/receptionist/
echo "Reloading nginx..."
ssh root@178.156.214.163 "docker exec \$(docker ps -q --filter name=nginx) nginx -s reload"
echo "DEPLOYED to app.getfluxdata.com"
