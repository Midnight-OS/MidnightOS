#!/bin/bash

# =============================================================================
# MidnightOS Platform Setup Script
# =============================================================================
# This script sets up the MidnightOS platform correctly based on the actual
# architecture:
# 
# Platform Services (Shared Infrastructure):
# - Orchestrator API (port 3002) - manages user accounts, bot creation
# - Midnight MCP (port 3001) - shared blockchain wallet/operations service
# - Frontend (port 3000) - web UI
# - Proof Server (port 6300) - Midnight blockchain proofs
# 
# User Services (Created dynamically by orchestrator):
# - Eliza Agent containers - AI bots with user configuration
# - Each user gets isolated storage, logs, config
# - Managed by orchestrator, not by this setup script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="MidnightOS"
ENV_FILE=".env"
DOCKER_COMPOSE_FILE="docker/docker-compose.yml"

# Functions
print_header() {
    echo -e "${PURPLE}"
    echo "=============================================================================="
    echo "  $1"
    echo "=============================================================================="
    echo -e "${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_deps=()
    
    # Check Bun for local development
    if [ "$1" = "local" ] && ! command_exists bun; then
        missing_deps+=("bun")
        print_error "Bun is not installed. Install with: curl -fsSL https://bun.sh/install | bash"
    elif [ "$1" = "local" ]; then
        print_success "Bun is installed: $(bun --version)"
    fi
    
    # Check Docker for Docker mode
    if [ "$1" = "docker" ] && ! command_exists docker; then
        missing_deps+=("docker")
        print_error "Docker is not installed. Please install Docker first."
    elif [ "$1" = "docker" ]; then
        print_success "Docker is installed: $(docker --version)"
    fi
    
    # Check Docker Compose for Docker mode
    if [ "$1" = "docker" ] && ! (command_exists docker-compose || docker compose version >/dev/null 2>&1); then
        missing_deps+=("docker-compose")
        print_error "Docker Compose is not installed. Please install Docker Compose first."
    elif [ "$1" = "docker" ]; then
        if command_exists docker-compose; then
            print_success "Docker Compose is installed: $(docker-compose --version)"
        else
            print_success "Docker Compose is installed: $(docker compose version)"
        fi
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Setup environment - Only manage root .env for Docker Compose
setup_environment() {
    print_header "Setting Up Environment"
    
    # Setup platform-level environment (root .env for Docker Compose)
    if [ ! -f "$ENV_FILE" ]; then
        print_info "Creating platform environment file from template..."
        cp .env.example "$ENV_FILE"
        
        # Generate JWT secret if not set
        if grep -q "^JWT_SECRET=your-super-secret-jwt-key-change-this-in-production$" "$ENV_FILE"; then
            local jwt_secret=$(openssl rand -hex 32)
            sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" "$ENV_FILE"
            rm -f "$ENV_FILE.bak"
            print_success "Generated JWT secret for platform"
        fi
        
        print_success "Platform environment file created: $ENV_FILE"
        print_warning "Please review and update the environment variables in $ENV_FILE"
    else
        print_info "Platform environment file already exists: $ENV_FILE"
    fi
    
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        print_info "Loading platform environment variables..."
        set -a
        source "$ENV_FILE"
        set +a
        print_success "Environment variables loaded"
    fi
}

# Install dependencies for platform services only
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_step "Installing root dependencies..."
    bun install
    
    print_step "Installing orchestrator dependencies..."
    cd platform/orchestrator
    bun install
    cd "$SCRIPT_DIR"
    
    print_step "Installing frontend dependencies..."
    cd platform/frontend
    bun install
    cd "$SCRIPT_DIR"
    
    # Only install midnight-mcp dependencies for local development
    if [ "$1" = "local" ]; then
        print_step "Installing midnight-mcp dependencies..."
        cd services/midnight-mcp
        bun install
        cd "$SCRIPT_DIR"
    fi
    
    print_success "Platform dependencies installed successfully"
}

# Setup database
setup_database() {
    print_header "Setting Up Database"
    
    print_step "Generating Prisma client for orchestrator..."
    cd platform/orchestrator
    bun run prisma generate
    
    print_step "Pushing database schema..."
    bun run prisma db push
    cd "$SCRIPT_DIR"
    
    # Only setup midnight-mcp database for local development
    if [ "$1" = "local" ]; then
        print_step "Generating Prisma client for midnight-mcp..."
        cd services/midnight-mcp
        bun run prisma generate
        cd "$SCRIPT_DIR"
    fi
    
    print_success "Database setup completed"
}

# Build platform services only (orchestrator and frontend)
build_services() {
    print_header "Building Platform Services"
    
    print_step "Building orchestrator..."
    cd platform/orchestrator
    bun run build
    cd "$SCRIPT_DIR"
    
    print_step "Building frontend..."
    cd platform/frontend
    bun run build
    cd "$SCRIPT_DIR"
    
    # Only build midnight-mcp for local development
    if [ "$1" = "local" ]; then
        print_step "Building midnight-mcp..."
        cd services/midnight-mcp
        bun run build
        cd "$SCRIPT_DIR"
    fi
    
    print_success "Platform services built successfully"
}

# Setup local development
setup_local() {
    print_header "Setting Up Local Development"
    
    # Create necessary directories
    print_step "Creating necessary directories..."
    mkdir -p wallet-storage mcp-logs user-data
    
    # Install dependencies
    install_dependencies "local"
    
    # Setup database
    setup_database "local"
    
    # Build services
    build_services "local"
    
    print_success "Local development setup completed"
    print_info "To start the platform locally, run:"
    echo "  ./setup.sh start local"
    echo ""
    print_info "Platform services:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Orchestrator API: http://localhost:3002"
    echo "  - Midnight MCP: http://localhost:3001"
    echo ""
    print_warning "Note: User bot containers are created dynamically via the orchestrator API"
}

# Setup Docker development
setup_docker() {
    print_header "Setting Up Docker Development"
    
    # Create necessary directories
    print_step "Creating necessary directories..."
    mkdir -p wallet-storage mcp-logs user-data
    
    # Install root dependencies for workspace management
    print_step "Installing root dependencies..."
    bun install
    
    # Setup database (use orchestrator locally for schema setup)
    print_step "Setting up database schema..."
    cd platform/orchestrator
    bun install
    bun run prisma generate
    bun run prisma db push
    cd "$SCRIPT_DIR"
    
    # Build Docker images
    print_step "Building Docker images..."
    if command_exists docker-compose; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" build --parallel
    else
        docker compose -f "$DOCKER_COMPOSE_FILE" build --parallel
    fi
    
    print_success "Docker development setup completed"
    print_info "To start the platform with Docker, run:"
    echo "  ./setup.sh start docker"
}

# Start services locally (platform services only)
start_local() {
    print_header "Starting Platform Services Locally"
    
    print_info "Starting platform services in development mode..."
    print_warning "This will start platform services. Press Ctrl+C to stop all services."
    print_info "User bot containers are managed via the orchestrator API, not this script."
    
    # Use concurrently to start services
    print_step "Starting platform services..."
    
    # Create a temporary script to run services
    cat > /tmp/start-platform.sh << 'EOF'
#!/bin/bash
export NODE_ENV=development

# Start orchestrator
echo "Starting orchestrator on port 3002..."
cd platform/orchestrator && bun run dev &
ORCHESTRATOR_PID=$!

# Start midnight-mcp
echo "Starting midnight-mcp on port 3001..."
cd services/midnight-mcp && bun run dev &
MCP_PID=$!

# Start frontend
echo "Starting frontend on port 3000..."
cd platform/frontend && bun run dev &
FRONTEND_PID=$!

echo "Platform services started!"
echo "Services running on:"
echo "  - Frontend: http://localhost:3000"
echo "  - Orchestrator API: http://localhost:3002"
echo "  - Midnight MCP: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'kill $ORCHESTRATOR_PID $MCP_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
wait
EOF
    
    chmod +x /tmp/start-platform.sh
    cd "$SCRIPT_DIR"
    /tmp/start-platform.sh
    rm -f /tmp/start-platform.sh
}

# Start services with Docker
start_docker() {
    print_header "Starting Platform Services with Docker"
    
    print_info "Starting platform services with Docker Compose..."
    if command_exists docker-compose; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    else
        docker compose -f "$DOCKER_COMPOSE_FILE" up -d
    fi
    
    print_success "Platform services started with Docker!"
    print_info "Services are running on:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Orchestrator API: http://localhost:3002"
    echo "  - Midnight MCP: http://localhost:3001"
    echo "  - Proof Server: http://localhost:6300"
    echo ""
    print_info "To view logs: docker compose -f $DOCKER_COMPOSE_FILE logs -f"
    print_info "To stop services: ./setup.sh stop docker"
    print_warning "User bot containers are managed via the orchestrator API"
}

# Stop Docker services
stop_docker() {
    print_header "Stopping Docker Services"
    
    print_info "Stopping all Docker services..."
    if command_exists docker-compose; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
    else
        docker compose -f "$DOCKER_COMPOSE_FILE" down
    fi
    
    print_success "All Docker services stopped"
}

# Clean up
cleanup() {
    print_header "Cleaning Up"
    
    print_step "Cleaning up build artifacts..."
    rm -rf platform/*/dist platform/*/build services/*/dist
    
    print_step "Cleaning up node_modules..."
    rm -rf node_modules platform/*/node_modules services/*/node_modules
    
    print_step "Cleaning up lock files..."
    rm -f bun.lockb platform/*/bun.lockb services/*/bun.lockb
    
    print_success "Cleanup completed"
}

# Show help
show_help() {
    echo -e "${GREEN}MidnightOS Platform Setup Script${NC}"
    echo ""
    echo "This script manages the MidnightOS platform services:"
    echo "  - Orchestrator API (user management, bot creation)"
    echo "  - Midnight MCP (shared blockchain service)"
    echo "  - Frontend (web UI)"
    echo "  - Proof Server (Midnight blockchain proofs)"
    echo ""
    echo "User bot containers are created dynamically by the orchestrator."
    echo ""
    echo "Usage: $0 [COMMAND] [MODE]"
    echo ""
    echo "Commands:"
    echo "  setup [local|docker]  - Set up the platform (default: local)"
    echo "  start [local|docker]  - Start the platform (default: local)"
    echo "  stop [docker]         - Stop Docker services"
    echo "  build [local|docker]  - Build the platform (default: local)"
    echo "  clean                 - Clean up build artifacts and dependencies"
    echo "  help                  - Show this help message"
    echo ""
    echo "Modes:"
    echo "  local                 - Use local development environment"
    echo "  docker                - Use Docker environment"
    echo ""
    echo "Examples:"
    echo "  $0 setup local        - Set up for local development"
    echo "  $0 setup docker       - Set up for Docker development"
    echo "  $0 start local        - Start platform services locally"
    echo "  $0 start docker       - Start platform services with Docker"
    echo "  $0 stop docker        - Stop Docker services"
    echo "  $0 clean              - Clean up everything"
    echo ""
    echo "Quick Start:"
    echo "  $0 setup local && $0 start local    - Complete local setup and start"
    echo "  $0 setup docker && $0 start docker  - Complete Docker setup and start"
}

# Main execution
main() {
    local command=${1:-"help"}
    local mode=${2:-"local"}
    
    # Change to script directory
    cd "$SCRIPT_DIR"
    
    case $command in
        "setup")
            check_prerequisites "$mode"
            setup_environment
            
            if [ "$mode" = "docker" ]; then
                setup_docker
            else
                setup_local
            fi
            ;;
        "start")
            if [ "$mode" = "docker" ]; then
                start_docker
            else
                start_local
            fi
            ;;
        "stop")
            if [ "$mode" = "docker" ]; then
                stop_docker
            else
                print_error "Stop command only available for Docker mode"
                print_info "For local mode, use Ctrl+C to stop running services"
                exit 1
            fi
            ;;
        "build")
            check_prerequisites "$mode"
            setup_environment
            install_dependencies "$mode"
            build_services "$mode"
            ;;
        "clean")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"