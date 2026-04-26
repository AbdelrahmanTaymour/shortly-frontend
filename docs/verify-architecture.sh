#!/bin/bash

# Shortly v2 Architecture Verification Script
# Verify the refactored architecture structure is complete

echo "================================================"
echo "Shortly v2 Architecture Verification"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "dashboard.html" ]; then
    echo "❌ Error: Not in the Shortly project root"
    exit 1
fi

echo "✓ Running verification from project root"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check file existence
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

# Function to check directory existence
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

echo "=== CORE INFRASTRUCTURE ==="
check_dir "src/core"
check_file "src/core/EventBus.js"
check_file "src/core/Router.js"
check_file "src/core/Application.js"
check_file "src/core/DependencyContainer.js"
echo ""

echo "=== CONFIGURATION ==="
check_dir "src/config"
check_file "src/config/api.config.js"
check_file "src/config/routes.config.js"
check_file "src/config/app.config.js"
echo ""

echo "=== UTILITIES ==="
check_dir "src/utils"
check_file "src/utils/storage.js"
check_file "src/utils/validation.js"
check_file "src/utils/dom.js"
check_file "src/utils/formatting.js"
echo ""

echo "=== API LAYER ==="
check_dir "src/services/api"
check_file "src/services/api/ApiClient.js"
check_file "src/services/api/AuthApi.js"
check_file "src/services/api/LinksApi.js"
check_file "src/services/api/AnalyticsApi.js"
echo ""

echo "=== SERVICE LAYER ==="
check_dir "src/services/auth"
check_file "src/services/auth/TokenManager.js"
check_file "src/services/auth/AuthService.js"
echo ""
check_dir "src/services/links"
check_file "src/services/links/LinksService.js"
echo ""

echo "=== UI BASE CLASSES ==="
check_dir "src/ui/components"
check_file "src/ui/components/BaseComponent.js"
check_file "src/ui/components/shared/Toast.js"
echo ""
check_dir "src/ui/pages"
check_file "src/ui/pages/BasePage.js"
echo ""

echo "=== BOOTSTRAP ==="
check_file "src/main.js"
echo ""

echo "=== DOCUMENTATION ==="
check_file "ARCHITECTURE.md"
check_file "REFACTORING_GUIDE.md"
check_file "QUICK_START.md"
echo ""

echo "=== STRUCTURE SUMMARY ==="
echo ""
echo "Directories created:"
find src -type d | sort | sed 's|^|  |'
echo ""

echo "Files created:"
find src -type f -name "*.js" | wc -l
echo " JavaScript files in src/"
echo ""

echo "================================================"
echo "Architecture Verification Complete!"
echo "================================================"
echo ""
echo "Next Steps:"
echo "1. Review QUICK_START.md for implementation guide"
echo "2. Start migrating existing pages to new architecture"
echo "3. Create components as needed"
echo "4. Update main.js with page routes as implemented"
echo "5. Test the application thoroughly"
echo ""
