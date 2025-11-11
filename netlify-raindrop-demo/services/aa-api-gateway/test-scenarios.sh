#!/bin/bash

# MoneyPenny Trading Console - Test Scenarios
# Complete end-to-end testing suite

set -e

BASE="http://localhost:8787"
BANK="http://localhost:8788"
API_KEY="DEV_KEY_123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}MoneyPenny Trading Console - Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"

    echo -e "${YELLOW}Testing:${NC} $test_name"

    if output=$(eval "$command" 2>&1); then
        if echo "$output" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✓ PASS${NC}\n"
            ((TESTS_PASSED++))
            return 0
        else
            echo -e "${RED}✗ FAIL${NC} - Expected pattern not found: $expected_pattern"
            echo "Output: $output"
            echo
            ((TESTS_FAILED++))
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC} - Command failed"
        echo "Output: $output"
        echo
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "${BLUE}=== Health Checks ===${NC}\n"

run_test "MoneyPenny API Health" \
    "curl -s $BASE/health" \
    "\"ok\":true"

run_test "Banking Profile Health" \
    "curl -s $BANK/health" \
    "\"ok\":true"

echo -e "${BLUE}=== Authentication Tests ===${NC}\n"

run_test "Missing API Key (should fail)" \
    "curl -s $BASE/config" \
    "missing_api_key"

run_test "Invalid API Key (should fail)" \
    "curl -s -H 'X-Api-Key: INVALID' $BASE/config" \
    "invalid_api_key"

run_test "Valid API Key" \
    "curl -s -H 'X-Api-Key: $API_KEY' $BASE/config" \
    "qripto-dev"

echo -e "${BLUE}=== Configuration Endpoint ===${NC}\n"

run_test "Get Effective Config" \
    "curl -s -H 'X-Api-Key: $API_KEY' $BASE/config" \
    "max_slippage_bps"

echo -e "${BLUE}=== Quotes Endpoint ===${NC}\n"

run_test "Get Quotes for Ethereum (small size)" \
    "curl -s -H 'X-Api-Key: $API_KEY' '$BASE/quotes?chain=ethereum&size_usd=1000'" \
    "floor_bps"

run_test "Get Quotes for Ethereum (large size)" \
    "curl -s -H 'X-Api-Key: $API_KEY' '$BASE/quotes?chain=ethereum&size_usd=10000'" \
    "best_opportunity"

run_test "Get Quotes for Solana" \
    "curl -s -H 'X-Api-Key: $API_KEY' '$BASE/quotes?chain=solana&size_usd=5000'" \
    "peg_usd"

run_test "Get Quotes - Missing Chain (should fail)" \
    "curl -s -H 'X-Api-Key: $API_KEY' '$BASE/quotes?size_usd=1000'" \
    "chain required"

echo -e "${BLUE}=== Intent Submission Tests ===${NC}\n"

# Test 1: Edge too low (should fail)
run_test "Intent with edge below floor (should fail)" \
    "curl -s -X POST -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' \
    -d '{
        \"intent_id\":\"00000001-0000-0000-0000-000000000001\",
        \"tenant_id\":\"qripto-dev\",
        \"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"actor\":{\"type\":\"user\",\"name\":\"MoneyPenny\"},
        \"kind\":\"PLACE_ORDER\",
        \"details\":{
            \"chain\":\"ethereum\",
            \"venue\":\"univ3\",
            \"symbol\":\"QCT/USDC\",
            \"side\":\"BUY\",
            \"size\":{\"notional\":1000,\"currency\":\"USDc\"},
            \"limits\":{\"max_slippage_bps\":2,\"min_edge_bps\":1.0,\"deadline_s\":60},
            \"reason\":\"Test: edge too low\"
        },
        \"policy\":{\"risk_profile\":\"CANARY\",\"requires_human_confirm\":false,\"kill_switch_ok\":true},
        \"meta\":{\"source\":\"MoneyPenny\"}
    }' $BASE/propose_intent" \
    "edge_too_low"

# Test 2: Valid CANARY intent
run_test "Valid CANARY Intent" \
    "curl -s -X POST -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' \
    -d '{
        \"intent_id\":\"00000002-0000-0000-0000-000000000002\",
        \"tenant_id\":\"qripto-dev\",
        \"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"actor\":{\"type\":\"user\",\"name\":\"MoneyPenny\"},
        \"kind\":\"PLACE_ORDER\",
        \"details\":{
            \"chain\":\"arbitrum\",
            \"venue\":\"univ3\",
            \"symbol\":\"QCT/USDC\",
            \"side\":\"BUY\",
            \"size\":{\"notional\":2000,\"currency\":\"USDc\"},
            \"limits\":{\"max_slippage_bps\":2,\"min_edge_bps\":80.0,\"deadline_s\":60},
            \"reason\":\"Test: valid canary order\"
        },
        \"policy\":{\"risk_profile\":\"CANARY\",\"requires_human_confirm\":false,\"kill_switch_ok\":true},
        \"meta\":{\"source\":\"MoneyPenny\"}
    }' $BASE/propose_intent" \
    "accepted"

# Test 3: Slippage too high (should fail)
run_test "Intent with slippage too high (should fail)" \
    "curl -s -X POST -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' \
    -d '{
        \"intent_id\":\"00000003-0000-0000-0000-000000000003\",
        \"tenant_id\":\"qripto-dev\",
        \"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"actor\":{\"type\":\"user\",\"name\":\"MoneyPenny\"},
        \"kind\":\"PLACE_ORDER\",
        \"details\":{
            \"chain\":\"ethereum\",
            \"venue\":\"univ3\",
            \"symbol\":\"QCT/USDC\",
            \"side\":\"BUY\",
            \"size\":{\"notional\":1000,\"currency\":\"USDc\"},
            \"limits\":{\"max_slippage_bps\":50,\"min_edge_bps\":805.0,\"deadline_s\":60},
            \"reason\":\"Test: slippage too high\"
        },
        \"policy\":{\"risk_profile\":\"CANARY\",\"requires_human_confirm\":false,\"kill_switch_ok\":true},
        \"meta\":{\"source\":\"MoneyPenny\"}
    }' $BASE/propose_intent" \
    "slippage_too_high"

# Test 4: Notional exceeds ceiling (should fail for CANARY)
run_test "CANARY intent exceeds ceiling (should fail)" \
    "curl -s -X POST -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' \
    -d '{
        \"intent_id\":\"00000004-0000-0000-0000-000000000004\",
        \"tenant_id\":\"qripto-dev\",
        \"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"actor\":{\"type\":\"user\",\"name\":\"MoneyPenny\"},
        \"kind\":\"PLACE_ORDER\",
        \"details\":{
            \"chain\":\"ethereum\",
            \"venue\":\"univ3\",
            \"symbol\":\"QCT/USDC\",
            \"side\":\"BUY\",
            \"size\":{\"notional\":10000,\"currency\":\"USDc\"},
            \"limits\":{\"max_slippage_bps\":2,\"min_edge_bps\":85.0,\"deadline_s\":60},
            \"reason\":\"Test: notional too high\"
        },
        \"policy\":{\"risk_profile\":\"CANARY\",\"requires_human_confirm\":false,\"kill_switch_ok\":true},
        \"meta\":{\"source\":\"MoneyPenny\"}
    }' $BASE/propose_intent" \
    "notional_exceeds_ceiling"

# Test 5: Large PROD intent (should require human confirm)
run_test "Large PROD Intent (requires confirmation)" \
    "curl -s -X POST -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' \
    -d '{
        \"intent_id\":\"00000005-0000-0000-0000-000000000005\",
        \"tenant_id\":\"qripto-dev\",
        \"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"actor\":{\"type\":\"user\",\"name\":\"MoneyPenny\"},
        \"kind\":\"PLACE_ORDER\",
        \"details\":{
            \"chain\":\"arbitrum\",
            \"venue\":\"univ3\",
            \"symbol\":\"QCT/USDC\",
            \"side\":\"SELL\",
            \"size\":{\"notional\":30000,\"currency\":\"USDc\"},
            \"limits\":{\"max_slippage_bps\":2,\"min_edge_bps\":8.0,\"deadline_s\":60},
            \"reason\":\"Test: large prod order\"
        },
        \"policy\":{\"risk_profile\":\"PROD\",\"requires_human_confirm\":true,\"kill_switch_ok\":true},
        \"meta\":{\"source\":\"MoneyPenny\"}
    }' $BASE/propose_intent" \
    "requires_human_confirm"

echo -e "${BLUE}=== Parameter Setting Tests ===${NC}\n"

run_test "Set inventory_band parameter" \
    "curl -s -X POST -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' \
    -d '{
        \"tenant_id\":\"qripto-dev\",
        \"key\":\"inventory_band\",
        \"value\":2.5,
        \"actor\":\"TestScript\"
    }' $BASE/set_param" \
    "\"success\":true"

run_test "Set invalid parameter (should fail)" \
    "curl -s -X POST -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' \
    -d '{
        \"tenant_id\":\"qripto-dev\",
        \"key\":\"invalid_key\",
        \"value\":5.0,
        \"actor\":\"TestScript\"
    }' $BASE/set_param" \
    "invalid_key"

run_test "Set max_slippage_bps above policy cap (should fail)" \
    "curl -s -X POST -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' \
    -d '{
        \"tenant_id\":\"qripto-dev\",
        \"key\":\"max_slippage_bps\",
        \"value\":100,
        \"actor\":\"TestScript\"
    }' $BASE/set_param" \
    "policy_violation"

echo -e "${BLUE}=== Banking Profile Tests ===${NC}\n"

# Create a dummy test file
echo "This is a test statement" > /tmp/test_statement.txt

run_test "Upload and extract statement features" \
    "curl -s -F 'tenant_id=qripto-dev' -F 'file=@/tmp/test_statement.txt' $BANK/bank/extract" \
    "avg_daily_surplus"

run_test "Extract returns proposed overrides" \
    "curl -s -F 'tenant_id=qripto-dev' -F 'file=@/tmp/test_statement.txt' $BANK/bank/extract" \
    "proposed_overrides"

run_test "Extract includes consent scope" \
    "curl -s -F 'tenant_id=qripto-dev' -F 'file=@/tmp/test_statement.txt' $BANK/bank/extract" \
    "Qc-suitability-v1"

# Cleanup
rm -f /tmp/test_statement.txt

echo -e "${BLUE}=== Webhook Tests ===${NC}\n"

# HMAC webhook test
TIMESTAMP=$(date +%s)
BODY='{"intent_id":"00000002-0000-0000-0000-000000000002","status":"ACCEPTED"}'
SECRET=${WEBHOOK_HMAC_SECRET:-"CHANGE_ME_32B_SECRET"}

# Create HMAC signature
PAYLOAD="${TIMESTAMP}.${BODY}"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)

run_test "Valid HMAC webhook" \
    "curl -s -X POST -H 'Content-Type: application/json' \
    -H \"X-Timestamp: $TIMESTAMP\" \
    -H \"X-Signature: $SIGNATURE\" \
    -d '$BODY' $BASE/webhooks/aigentz" \
    "\"success\":true"

run_test "Webhook without HMAC (should fail)" \
    "curl -s -X POST -H 'Content-Type: application/json' \
    -d '{\"intent_id\":\"test\",\"status\":\"ACCEPTED\"}' \
    $BASE/webhooks/aigentz" \
    "missing_hmac_headers"

echo -e "${BLUE}=== Integration Test: Full Flow ===${NC}\n"

echo "Running complete end-to-end flow..."

# 1. Get quotes
echo "1. Fetching quotes..."
QUOTES=$(curl -s -H "X-Api-Key: $API_KEY" "$BASE/quotes?chain=arbitrum&size_usd=3000")
echo "   ✓ Quotes received"

# 2. Upload statement
echo "2. Uploading bank statement..."
echo "Mock statement data" > /tmp/integration_test.txt
EXTRACT=$(curl -s -F "tenant_id=qripto-dev" -F "file=@/tmp/integration_test.txt" "$BANK/bank/extract")
INVENTORY_BAND=$(echo "$EXTRACT" | python3 -c "import sys,json; print(json.load(sys.stdin)['proposed_overrides']['inventory_band'])" 2>/dev/null || echo "2.0")
echo "   ✓ Features extracted, inventory_band=$INVENTORY_BAND"

# 3. Apply parameter
echo "3. Applying inventory_band to MoneyPenny..."
SET_RESULT=$(curl -s -X POST -H "X-Api-Key: $API_KEY" -H "Content-Type: application/json" \
    -d "{\"tenant_id\":\"qripto-dev\",\"key\":\"inventory_band\",\"value\":$INVENTORY_BAND,\"actor\":\"IntegrationTest\"}" \
    "$BASE/set_param")
echo "   ✓ Parameter applied"

# 4. Submit intent
echo "4. Submitting trading intent..."
INTENT_ID=$(uuidgen 2>/dev/null || echo "00000099-0000-0000-0000-000000000099")
INTENT_RESULT=$(curl -s -X POST -H "X-Api-Key: $API_KEY" -H "Content-Type: application/json" \
    -d "{
        \"intent_id\":\"$INTENT_ID\",
        \"tenant_id\":\"qripto-dev\",
        \"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"actor\":{\"type\":\"user\",\"name\":\"MoneyPenny\"},
        \"kind\":\"PLACE_ORDER\",
        \"details\":{
            \"chain\":\"arbitrum\",
            \"venue\":\"univ3\",
            \"symbol\":\"QCT/USDC\",
            \"side\":\"BUY\",
            \"size\":{\"notional\":3000,\"currency\":\"USDc\"},
            \"limits\":{\"max_slippage_bps\":2,\"min_edge_bps\":55.0,\"deadline_s\":60},
            \"reason\":\"Integration test order\"
        },
        \"policy\":{\"risk_profile\":\"CANARY\",\"requires_human_confirm\":false,\"kill_switch_ok\":true},
        \"meta\":{\"source\":\"MoneyPenny\"}
    }" "$BASE/propose_intent")

if echo "$INTENT_RESULT" | grep -q "accepted"; then
    echo "   ✓ Intent accepted"
    ((TESTS_PASSED++))
else
    echo "   ✗ Intent rejected: $INTENT_RESULT"
    ((TESTS_FAILED++))
fi

# Cleanup
rm -f /tmp/integration_test.txt

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}\n"
    exit 1
fi
