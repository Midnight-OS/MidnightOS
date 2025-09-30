#!/bin/bash

# Switch MidnightOS to Standalone/Undeployed configuration
# This uses local node, indexer, and proof server

echo "Switching to Standalone (Undeployed) configuration..."

# Update root .env file
sed -i.bak \
  -e 's/^NETWORK_ID=.*/NETWORK_ID=Undeployed/' \
  -e 's|^INDEXER=.*|INDEXER=http://localhost:8088/api/v1/graphql|' \
  -e 's|^INDEXER_WS=.*|INDEXER_WS=ws://localhost:8088/api/v1/graphql/ws|' \
  -e 's|^MN_NODE=.*|MN_NODE=http://localhost:9944|' \
  -e 's/^ADMIN_ADDRESS=mn_shield-addr_test.*/ADMIN_ADDRESS=mn_shield-addr_undeployed1fh3pc5m3p325kh6gtrgvp7lwlqaag3mkfqs9ewkhjyl8ljaexv3sxqyxry4vaj3nxkkwlfd6l7la78tmhhesp2z4623sd8hgtuqjg3j3dqswhvxf/' \
  .env

# Run sync to update all services
echo "Syncing environment to all services..."
pnpm env:sync

echo "✅ Switched to Standalone configuration"
echo ""
echo "To start the standalone network:"
echo "  cd platform/orchestrator"
echo "  docker compose -f docker-compose.standalone.yml up -d"
echo ""
echo "Services will be available at:"
echo "  - Node: http://localhost:9944"
echo "  - Indexer: http://localhost:8088"
echo "  - Proof Server: http://localhost:6300"
echo ""
echo "Use the genesis wallet for initial funds:"
echo "  Seed: 0000000000000000000000000000000000000000000000000000000000000001"