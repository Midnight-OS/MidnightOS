#!/bin/bash

# Switch MidnightOS to TestNet configuration
# Note: TestNet requires a properly configured proof server for TestNet network

echo "Switching to TestNet configuration..."

# Update root .env file
sed -i.bak \
  -e 's/^NETWORK_ID=.*/NETWORK_ID=TestNet/' \
  -e 's|^INDEXER=.*|INDEXER=https://indexer.testnet-02.midnight.network/api/v1/graphql|' \
  -e 's|^INDEXER_WS=.*|INDEXER_WS=wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws|' \
  -e 's|^MN_NODE=.*|MN_NODE=https://rpc.testnet-02.midnight.network|' \
  -e 's/^ADMIN_ADDRESS=mn_shield-addr_undeployed.*/ADMIN_ADDRESS=mn_shield-addr_test1fh3pc5m3p325kh6gtrgvp7lwlqaag3mkfqs9ewkhjyl8ljaexv3sxqyxry4vaj3nxkkwlfd6l7la78tmhhesp2z4623sd8hgtuqjg3j3dqh7d46v/' \
  .env

# Run sync to update all services
echo "Syncing environment to all services..."
pnpm env:sync

echo "✅ Switched to TestNet configuration"
echo ""
echo "⚠️  WARNING: TestNet requires a proof server configured for TestNet."
echo "   The default Docker proof server runs in 'Undeployed' mode."
echo "   You may encounter 'Bad Request' errors when deploying contracts."
echo ""
echo "To start services:"
echo "  - Proof Server: Contact Midnight Labs for TestNet proof server access"
echo "  - Or use Standalone mode: ./scripts/switch-to-standalone.sh"