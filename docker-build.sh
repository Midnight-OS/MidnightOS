#!/bin/bash

# MidnightOS Docker Build and Deploy Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Set docker directory
DOCKER_DIR="docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"

# Load environment variables
if [ -f .env.docker ]; then
    print_info "Loading environment variables from .env.docker"
    export $(cat .env.docker | grep -v '^#' | xargs)
else
    print_warning ".env.docker file not found. Using default values."
fi

# Parse command line arguments
COMMAND=${1:-"help"}
SERVICES=${2:-"all"}

case $COMMAND in
    "build")
        print_info "Building Docker images..."
        
        if [ "$SERVICES" == "all" ]; then
            print_info "Building all services..."
            docker-compose -f $COMPOSE_FILE build --parallel
        else
            print_info "Building $SERVICES..."
            docker-compose -f $COMPOSE_FILE build $SERVICES
        fi
        
        print_success "Docker images built successfully!"
        ;;
        
    "up")
        print_info "Starting services..."
        
        if [ "$SERVICES" == "all" ]; then
            docker-compose -f $COMPOSE_FILE up -d
        else
            docker-compose -f $COMPOSE_FILE up -d $SERVICES
        fi
        
        print_success "Services started successfully!"
        print_info "Checking service health..."
        sleep 5
        docker-compose -f $COMPOSE_FILE ps
        ;;
        
    "down")
        print_info "Stopping services..."
        docker-compose -f $COMPOSE_FILE down
        print_success "Services stopped successfully!"
        ;;
        
    "restart")
        print_info "Restarting services..."
        
        if [ "$SERVICES" == "all" ]; then
            docker-compose -f $COMPOSE_FILE restart
        else
            docker-compose -f $COMPOSE_FILE restart $SERVICES
        fi
        
        print_success "Services restarted successfully!"
        ;;
        
    "logs")
        if [ "$SERVICES" == "all" ]; then
            docker-compose -f $COMPOSE_FILE logs -f
        else
            docker-compose -f $COMPOSE_FILE logs -f $SERVICES
        fi
        ;;
        
    "status")
        print_info "Service status:"
        docker-compose -f $COMPOSE_FILE ps
        ;;
        
    "clean")
        print_warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
        read -r response
        
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            print_info "Cleaning up Docker resources..."
            docker-compose -f $COMPOSE_FILE down -v --rmi all
            print_success "Cleanup completed!"
        else
            print_info "Cleanup cancelled."
        fi
        ;;
        
    "dev")
        print_info "Starting services in development mode..."
        docker-compose -f $COMPOSE_FILE up
        ;;
        
    "test")
        print_info "Running tests in Docker containers..."
        
        # Build test images
        docker-compose -f $COMPOSE_FILE build
        
        # Run tests for each service
        print_info "Testing orchestrator..."
        docker-compose -f $COMPOSE_FILE run --rm orchestrator yarn test
        
        print_info "Testing MCP service..."
        docker-compose -f $COMPOSE_FILE run --rm midnight-mcp yarn test
        
        print_info "Testing frontend..."
        docker-compose -f $COMPOSE_FILE run --rm frontend yarn test
        
        print_success "All tests completed!"
        ;;
        
    "migrate")
        print_info "Running database migrations..."
        
        # Run migrations for orchestrator
        print_info "Running orchestrator migrations..."
        docker-compose -f $COMPOSE_FILE run --rm orchestrator yarn prisma db push
        
        # Run migrations for MCP
        print_info "Running MCP migrations..."
        docker-compose -f $COMPOSE_FILE run --rm midnight-mcp yarn prisma db push
        
        print_success "Migrations completed!"
        ;;
        
    "help"|*)
        echo -e "${GREEN}MidnightOS Docker Management Script${NC}"
        echo ""
        echo "Usage: ./docker-build.sh [COMMAND] [SERVICES]"
        echo ""
        echo "Commands:"
        echo "  build [services]    - Build Docker images (default: all)"
        echo "  up [services]       - Start services (default: all)"
        echo "  down               - Stop all services"
        echo "  restart [services]  - Restart services (default: all)"
        echo "  logs [services]     - View logs (default: all)"
        echo "  status             - Show service status"
        echo "  clean              - Remove all containers, images, and volumes"
        echo "  dev                - Start services in development mode"
        echo "  test               - Run tests in Docker containers"
        echo "  migrate            - Run database migrations"
        echo "  help               - Show this help message"
        echo ""
        echo "Services:"
        echo "  all         - All services (default)"
        echo "  orchestrator - Platform orchestrator service"
        echo "  midnight-mcp - Midnight MCP service"
        echo "  frontend    - Web frontend"
        echo "  eliza-agent - Eliza agent service"
        echo ""
        echo "Examples:"
        echo "  ./docker-build.sh build           - Build all services"
        echo "  ./docker-build.sh up frontend     - Start only frontend"
        echo "  ./docker-build.sh logs mcp        - View MCP logs"
        echo "  ./docker-build.sh restart          - Restart all services"
        ;;
esac