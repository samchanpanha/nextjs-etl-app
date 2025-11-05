#!/bin/bash

# 🚀 ETL System Master Setup Script
# This script orchestrates the complete setup, optimization, testing, and validation of the ETL system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    log_success "All prerequisites are satisfied"
}

# Check if .env file exists
check_environment() {
    log_info "Checking environment configuration..."
    
    if [ ! -f .env ]; then
        log_warning ".env file not found. Creating from template..."
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success "Created .env file from template"
        else
            log_warning "No .env.example found. Please configure your environment manually."
        fi
    else
        log_success "Environment configuration found"
    fi
}

# Start Docker containers
start_docker() {
    log_info "Starting Docker containers..."
    
    # Check if dev compose file exists
    if [ -f "docker-compose.dev.yml" ]; then
        docker-compose -f docker-compose.dev.yml up -d
        log_success "Started development Docker containers"
    elif [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        log_success "Started Docker containers"
    else
        log_error "No docker-compose file found"
        exit 1
    fi
    
    # Wait for containers to be healthy
    log_info "Waiting for containers to be ready..."
    sleep 10
    
    # Check if containers are running
    if ! curl -f -s http://localhost:8080/api/health > /dev/null; then
        log_warning "Containers may not be fully ready yet. Waiting additional time..."
        sleep 15
    fi
}

# Run database optimization
optimize_database() {
    log_info "Optimizing database..."
    
    if [ -f "scripts/database-optimization.js" ]; then
        node scripts/database-optimization.js
        log_success "Database optimization completed"
    else
        log_warning "Database optimization script not found, skipping..."
    fi
}

# Setup sample data
setup_sample_data() {
    log_info "Setting up sample data..."
    
    if [ -f "scripts/sample-data-setup.js" ]; then
        node scripts/sample-data-setup.js
        log_success "Sample data setup completed"
    else
        log_warning "Sample data setup script not found, skipping..."
    fi
}

# Run system tests
run_system_tests() {
    log_info "Running system tests..."
    
    if [ -f "scripts/testing-utilities.js" ]; then
        node scripts/testing-utilities.js
        log_success "System tests completed"
    else
        log_warning "Testing utilities script not found, skipping..."
    fi
}

# Validate system integration
validate_integration() {
    log_info "Validating system integration..."
    
    if [ -f "scripts/integration-validation.js" ]; then
        node scripts/integration-validation.js
        log_success "Integration validation completed"
    else
        log_warning "Integration validation script not found, skipping..."
    fi
}

# Run load tests (optional)
run_load_tests() {
    log_info "Running load tests (this may take several minutes)..."
    
    if [ -f "scripts/load-testing.js" ]; then
        read -p "Do you want to run comprehensive load tests? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            node scripts/load-testing.js
            log_success "Load tests completed"
        else
            log_info "Skipping load tests"
        fi
    else
        log_warning "Load testing script not found, skipping..."
    fi
}

# Generate system status report
generate_status_report() {
    log_info "Generating system status report..."
    
    echo ""
    echo "========================================"
    echo "  🏆 ETL SYSTEM SETUP COMPLETE"
    echo "========================================"
    echo ""
    echo "📊 System Status:"
    
    # Check health endpoint
    if curl -f -s http://localhost:8080/api/health > /dev/null; then
        echo "  ✅ Main Application: http://localhost:8080"
    else
        echo "  ❌ Main Application: Not responding"
    fi
    
    # Check API endpoints
    endpoints=("/api/health" "/api/data-sources" "/api/jobs" "/api/notifications")
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "http://localhost:8080${endpoint}" > /dev/null; then
            echo "  ✅ API${endpoint}: Responding"
        else
            echo "  ❌ API${endpoint}: Not responding"
        fi
    done
    
    echo ""
    echo "📋 Generated Reports:"
    
    # List generated reports
    if [ -d "test-reports" ]; then
        report_count=$(ls -1 test-reports/*.json 2>/dev/null | wc -l)
        if [ "$report_count" -gt 0 ]; then
            echo "  📁 Test Reports: $report_count files in test-reports/"
            ls -1 test-reports/*.json 2>/dev/null | tail -5 | while read file; do
                echo "    📄 $(basename "$file")"
            done
        else
            echo "  📁 Test Reports: No reports generated yet"
        fi
    else
        echo "  📁 Test Reports: Directory not found"
    fi
    
    echo ""
    echo "🚀 Quick Start Commands:"
    echo "  • View system health: curl http://localhost:8080/api/health"
    echo "  • Check logs: docker-compose logs -f"
    echo "  • Stop system: docker-compose down"
    echo "  • Run tests: node scripts/testing-utilities.js"
    
    echo ""
    echo "📖 Documentation:"
    if [ -f "docs/PERFORMANCE-GUIDELINES.md" ]; then
        echo "  📚 Performance Guidelines: docs/PERFORMANCE-GUIDELINES.md"
    fi
    if [ -f "README.md" ]; then
        echo "  📚 System README: README.md"
    fi
    
    echo ""
    echo "========================================"
}

# Main setup function
main() {
    echo ""
    echo "🚀 ETL System Master Setup Script"
    echo "========================================"
    echo ""
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_LOAD_TESTS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-load-tests)
                SKIP_LOAD_TESTS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-tests      Skip running system tests"
                echo "  --skip-load-tests Skip running load tests"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run setup steps
    check_prerequisites
    check_environment
    start_docker
    optimize_database
    setup_sample_data
    
    if [ "$SKIP_TESTS" = false ]; then
        run_system_tests
        validate_integration
    else
        log_info "Skipping tests as requested"
    fi
    
    if [ "$SKIP_LOAD_TESTS" = false ]; then
        run_load_tests
    else
        log_info "Skipping load tests as requested"
    fi
    
    generate_status_report
    
    log_success "ETL system setup completed successfully!"
}

# Run main function with all arguments
main "$@"