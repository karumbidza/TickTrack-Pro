#!/bin/bash

# Performance Optimization Testing Script
# ========================================
# Tests all optimization features locally

set -e

echo "🚀 TickTrack Pro - Performance Optimization Test Suite"
echo "======================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

echo ""
echo "📋 Pre-flight Checks"
echo "-------------------"

# Check if server is running
if ! curl -s "$BASE_URL" > /dev/null; then
    echo -e "${RED}❌ Server not running at $BASE_URL${NC}"
    echo "   Start with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Redis not running - caching will be disabled${NC}"
    echo "   Start Redis with: docker start ticktrack-redis"
else
    echo -e "${GREEN}✅ Redis is running${NC}"
fi

echo ""
echo "🧪 Running Tests"
echo "---------------"

# Test 1: Cache Performance
echo ""
echo "Test 1: Cache Performance (GET /api/admin/tickets)"
echo "---------------------------------------------------"

echo "Making first request (should be cache MISS)..."
RESPONSE1=$(curl -s -w "\nTime: %{time_total}s\n" -H "Content-Type: application/json" "$API_URL/admin/tickets" 2>&1)
TIME1=$(echo "$RESPONSE1" | grep "Time:" | awk '{print $2}')

sleep 1

echo "Making second request (should be cache HIT)..."
RESPONSE2=$(curl -s -w "\nTime: %{time_total}s\n" -H "Content-Type: application/json" "$API_URL/admin/tickets" 2>&1)
TIME2=$(echo "$RESPONSE2" | grep "Time:" | awk '{print $2}')

echo "  First request:  ${TIME1}"
echo "  Second request: ${TIME2}"

# Test 2: Pagination
echo ""
echo "Test 2: Pagination"
echo "------------------"

echo "Testing without pagination params..."
RESPONSE_NO_PAGE=$(curl -s "$API_URL/admin/tickets" | head -c 100)
echo "  Response preview: ${RESPONSE_NO_PAGE}..."

echo ""
echo "Testing with pagination params (page=1, limit=10)..."
RESPONSE_WITH_PAGE=$(curl -s "$API_URL/admin/tickets?page=1&limit=10" | head -c 100)
echo "  Response preview: ${RESPONSE_WITH_PAGE}..."

if echo "$RESPONSE_WITH_PAGE" | grep -q '"meta"'; then
    echo -e "  ${GREEN}✅ Pagination metadata found${NC}"
else
    echo -e "  ${YELLOW}⚠️  Pagination metadata not found (might be disabled)${NC}"
fi

# Test 3: Metrics Endpoint
echo ""
echo "Test 3: Performance Metrics"
echo "---------------------------"

METRICS=$(curl -s "$API_URL/metrics" 2>&1)

if echo "$METRICS" | grep -q "cache"; then
    echo -e "${GREEN}✅ Metrics endpoint accessible${NC}"
    echo "$METRICS" | head -20
else
    echo -e "${YELLOW}⚠️  Metrics endpoint requires authentication${NC}"
fi

# Test 4: Compression
echo ""
echo "Test 4: Response Compression"
echo "----------------------------"

UNCOMPRESSED_SIZE=$(curl -s "$API_URL/admin/tickets" | wc -c)
COMPRESSED_SIZE=$(curl -s -H "Accept-Encoding: gzip" "$API_URL/admin/tickets" | wc -c)

echo "  Uncompressed: ${UNCOMPRESSED_SIZE} bytes"
echo "  Compressed:   ${COMPRESSED_SIZE} bytes"

if [ "$COMPRESSED_SIZE" -lt "$UNCOMPRESSED_SIZE" ]; then
    SAVINGS=$((100 - (COMPRESSED_SIZE * 100 / UNCOMPRESSED_SIZE)))
    echo -e "  ${GREEN}✅ Compression working (${SAVINGS}% reduction)${NC}"
else
    echo -e "  ${YELLOW}⚠️  Compression not detected (might be disabled)${NC}"
fi

# Test 5: Async Logging (check logs)
echo ""
echo "Test 5: Async Logging"
echo "---------------------"
echo "  Check console logs for request IDs and async log entries"
echo "  Look for patterns like: [x-request-id] or [DEBUG]"

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo ""
echo "Check your .env file for feature flags:"
echo "  - ENABLE_REDIS_CACHE=true"
echo "  - ENABLE_PAGINATION=true"
echo "  - ENABLE_ASYNC_LOGGING=true"
echo "  - ENABLE_COMPRESSION=true"
echo "  - ENABLE_DB_POOLING=true"
echo ""
echo "View detailed metrics at: $BASE_URL/api/metrics"
echo ""
echo -e "${GREEN}✅ Test suite completed!${NC}"
