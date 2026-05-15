#!/bin/bash
set -e

# Always run from backend/api/ regardless of caller's CWD.
# Works whether called as "bash vercel-build.sh" (from backend/api/)
# or as "bash backend/api/vercel-build.sh" (from repo root).
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "Generating Swagger spec..."
node scripts/generate-swagger.js

echo "Creating Build Output API structure..."
mkdir -p .vercel/output/functions/api.func
mkdir -p .vercel/output/static/public

echo "Bundling with esbuild..."
../../node_modules/.bin/esbuild server.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=.vercel/output/functions/api.func/index.js \
  '--external:sharp' \
  '--external:@img/sharp-linux-x64' \
  '--external:@img/sharp-darwin-arm64' \
  '--external:@img/sharp-linux-arm64' \
  '--external:@img/sharp-wasm32'

echo "Copying static assets..."
cp public/swagger.json .vercel/output/static/public/swagger.json

echo "Writing function config..."
cat > .vercel/output/functions/api.func/.vc-config.json << 'EOF'
{
  "handler": "index.js",
  "runtime": "nodejs20.x",
  "architecture": "x86_64",
  "launcherType": "Nodejs",
  "shouldAddHelpers": true,
  "shouldAddSourcemapSupport": false
}
EOF

echo "Writing output config..."
cat > .vercel/output/config.json << 'EOF'
{
  "version": 3,
  "routes": [
    {
      "src": "^/public/(.*)",
      "dest": "/public/$1"
    },
    {
      "src": "^/(.*)",
      "dest": "/api",
      "headers": {
        "Access-Control-Allow-Origin": "*"
      }
    }
  ]
}
EOF

echo "Build complete!"
