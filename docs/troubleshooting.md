# MidnightOS Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### pnpm not found
**Problem**: `command not found: pnpm`

**Solution**:
```bash
npm install -g pnpm@10.15.0
```

#### Node.js version error
**Problem**: `Node.js version v18.x.x is not supported`

**Solution**:
```bash
# Install Node.js v20+
curl -fsSL https://fnm.vercel.app/install | bash
fnm use 20
```

#### Dependencies installation failure
**Problem**: `pnpm install` fails with permission errors

**Solution**:
```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Service Startup Issues

#### Port already in use
**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different ports
PORT=3100 pnpm dev
```

#### Service fails to start
**Problem**: Service crashes immediately after starting

**Checklist**:
1. Check environment variables are set correctly
2. Verify all dependencies are installed
3. Check logs for specific error messages
4. Ensure database is accessible

### ElizaOS Agent Issues

#### Plugin loading failure
**Problem**: `Error: Cannot find module './plugin.ts'`

**Solution**:
1. Ensure plugin is properly exported:
```typescript
export default myPlugin;
```

2. Register plugin in character configuration:
```typescript
plugins: [sqlPlugin, bootstrapPlugin, mcpPlugin]
```

3. Rebuild the service:
```bash
cd services/eliza-agent
pnpm build
pnpm dev
```

#### MCP connection failure
**Problem**: `Failed to connect to MCP server`

**Solution**:
1. Verify MCP server is running on port 3001
2. Check MCP configuration in character.ts:
```typescript
mcp: {
  servers: {
    "midnight-mcp": {
      type: "stdio",
      command: "node",
      args: ["../midnight-mcp/dist/stdio-server.js"]
    }
  }
}
```

3. Ensure relative path is correct
4. Check MCP server logs for errors

#### AI model not responding
**Problem**: Bot doesn't respond to messages

**Solution**:
1. Verify API keys are set:
```bash
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
```

2. Check model configuration:
```typescript
modelProvider: "openai" // or "anthropic", "ollama"
```

3. Test API connectivity:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Midnight Blockchain Issues

#### Wallet sync failure
**Problem**: `Wallet failed to sync with network`

**Solution**:
1. Check network endpoints in .env:
```env
INDEXER=https://indexer.testnet-02.midnight.network/api/v1/graphql
MN_NODE=https://rpc.testnet-02.midnight.network
```

2. Test network connectivity:
```bash
curl https://rpc.testnet-02.midnight.network
```

3. Clear wallet cache and resync:
```bash
rm -rf .midnight/wallet-cache
pnpm dev
```

#### Transaction failures
**Problem**: `Transaction failed: insufficient funds`

**Solution**:
1. Check wallet balance:
```
"Check my wallet balance"
```

2. Ensure testnet faucet tokens:
- Visit testnet faucet
- Request test tokens
- Wait for confirmation

#### Proof generation timeout
**Problem**: `Proof generation timed out`

**Solution**:
1. Ensure proof server is running:
```bash
cd services/proof-server
pnpm dev
```

2. Check proof server configuration:
```env
USE_EXTERNAL_PROOF_SERVER=false
PROOF_SERVER=http://localhost:6300
```

3. Increase timeout in configuration

### Frontend Issues

#### Blank page or loading error
**Problem**: Frontend shows blank page

**Solution**:
1. Check browser console for errors
2. Verify API endpoint configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

3. Clear browser cache
4. Check network tab for failed requests

#### WebSocket connection failure
**Problem**: Real-time updates not working

**Solution**:
1. Check WebSocket endpoint
2. Verify CORS configuration
3. Check firewall settings
4. Test WebSocket connection:
```javascript
const ws = new WebSocket('ws://localhost:3002/ws');
ws.onopen = () => console.log('Connected');
```

### Database Issues

#### Prisma client errors
**Problem**: `PrismaClient is unable to be run`

**Solution**:
```bash
# Regenerate Prisma client
cd platform/orchestrator
pnpm prisma generate

cd ../../services/midnight-mcp
pnpm prisma generate
```

#### Database connection failure
**Problem**: `Can't connect to PostgreSQL database`

**Solution**:
1. Check DATABASE_URL format:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/midnightos"
```

2. Verify PostgreSQL is running:
```bash
pg_isready
```

3. Test connection:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Docker Issues

#### Container fails to build
**Problem**: Docker build fails

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Rebuild with no cache
docker-compose build --no-cache
```

#### Container networking issues
**Problem**: Containers can't communicate

**Solution**:
1. Check Docker network:
```bash
docker network ls
docker network inspect midnightos_default
```

2. Use container names for internal communication
3. Verify port mappings in docker-compose.yml

### Performance Issues

#### Slow response times
**Problem**: Bot responses are slow

**Diagnosis**:
1. Check system resources:
```bash
top
df -h
free -m
```

2. Monitor service logs for bottlenecks
3. Check database query performance

**Solutions**:
- Increase memory allocation
- Enable caching
- Optimize database queries
- Use lighter AI models for testing

#### Memory leaks
**Problem**: Service memory usage keeps growing

**Solution**:
1. Monitor memory usage:
```bash
ps aux | grep node
```

2. Set memory limits:
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev
```

3. Enable heap snapshots for debugging

## Debugging Techniques

### Enable Debug Logging

Set environment variables:
```bash
DEBUG=* pnpm dev
LOG_LEVEL=debug pnpm dev
```

### View Service Logs

```bash
# Frontend logs
cd platform/frontend && pnpm dev 2>&1 | tee frontend.log

# Orchestrator logs
cd platform/orchestrator && pnpm dev 2>&1 | tee orchestrator.log

# ElizaOS logs
cd services/eliza-agent && pnpm dev 2>&1 | tee eliza.log

# MCP server logs
cd services/midnight-mcp && pnpm dev 2>&1 | tee mcp.log
```

### Network Debugging

Monitor network traffic:
```bash
# Monitor HTTP traffic
tcpdump -i any -n port 3000 or port 3001 or port 3002 or port 3003

# Check open ports
netstat -tulpn | grep LISTEN
```

### Database Debugging

```bash
# Connect to database
psql $DATABASE_URL

# Check active connections
SELECT * FROM pg_stat_activity;

# Monitor slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC;
```

## Getting Help

### Before Asking for Help

1. **Check the logs**: Most issues are explained in error messages
2. **Search existing issues**: [GitHub Issues](https://github.com/Midnight-OS/MidnightOS/issues)
3. **Try the solutions above**: Common issues have known fixes
4. **Gather information**: Collect logs, environment details, steps to reproduce

### Information to Provide

When reporting an issue, include:

1. **Environment**:
```bash
node --version
pnpm --version
uname -a
```

2. **Configuration**: Sanitized .env files (remove secrets)

3. **Logs**: Relevant error messages and stack traces

4. **Steps to reproduce**: Exact commands and actions

5. **Expected vs actual behavior**: Clear description of the problem

### Support Channels

- **GitHub Issues**: [Report bugs](https://github.com/Midnight-OS/MidnightOS/issues)
- **Discussions**: [Ask questions](https://github.com/Midnight-OS/MidnightOS/discussions)
- **Documentation**: [Read the docs](https://github.com/Midnight-OS/MidnightOS#readme)

## Emergency Recovery

### Reset Everything

If all else fails, reset the entire setup:

```bash
# Stop all services
pkill -f node

# Clean all data
rm -rf node_modules pnpm-lock.yaml
rm -rf services/*/node_modules services/*/pnpm-lock.yaml
rm -rf platform/*/node_modules platform/*/pnpm-lock.yaml
rm -rf .eliza .midnight

# Reinstall everything
pnpm install
pnpm build

# Regenerate Prisma clients
cd platform/orchestrator && pnpm prisma generate
cd ../../services/midnight-mcp && pnpm prisma generate

# Start fresh
cd ../.. && pnpm dev
```

### Backup Important Data

Before resetting:
```bash
# Backup environment files
cp -r . ../midnightos-backup

# Export database
pg_dump $DATABASE_URL > backup.sql

# Save wallet data
cp -r .midnight/wallet ./wallet-backup
```

---

For additional support, visit our [GitHub repository](https://github.com/Midnight-OS/MidnightOS)