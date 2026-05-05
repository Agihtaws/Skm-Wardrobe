#!/bin/bash
SR_EMAIL="gmanjuns027@gmail.com"
SR_PASS='r$NoNl&DjkOUcKCpASdcMqhj8jt20AO2'
RZP_KEY="rzp_live_RzLli02v90Nasx"
RZP_SECRET="LYEbQ77Iu64xdwZS3CUQ2KUv"

echo "=== TEST 1: Shiprocket Login ==="
SR_LOGIN=$(curl -s -X POST https://apiv2.shiprocket.in/v1/external/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SR_EMAIL}\",\"password\":\"${SR_PASS}\"}")
echo "$SR_LOGIN"

SR_TOKEN=$(echo "$SR_LOGIN" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')
if [ -z "$SR_TOKEN" ]; then echo "❌ Token FAILED"; exit 1; fi
echo "✅ Token: ${SR_TOKEN:0:60}..."

echo ""
echo "=== TEST 2: Shiprocket Channels ==="
curl -s "https://apiv2.shiprocket.in/v1/external/channels" \
  -H "Authorization: Bearer $SR_TOKEN"

echo ""
echo "=== TEST 3: Shiprocket Orders ==="
curl -s "https://apiv2.shiprocket.in/v1/external/orders?per_page=5" \
  -H "Authorization: Bearer $SR_TOKEN"

echo ""
echo "=== TEST 4: Shiprocket Account Plan ==="
curl -s "https://apiv2.shiprocket.in/v1/external/account/details/company" \
  -H "Authorization: Bearer $SR_TOKEN"

echo ""
echo "=== TEST 5: Shiprocket Pickup Locations ==="
curl -s "https://apiv2.shiprocket.in/v1/external/settings/company/pickup" \
  -H "Authorization: Bearer $SR_TOKEN"

echo ""
echo "=== TEST 6: Create COD Test Order ==="
curl -s -X POST "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc" \
  -H "Authorization: Bearer $SR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"TEST-COD-$(date +%s)\",\"order_date\":\"$(date +%Y-%m-%d)\",\"pickup_location\":\"Primary\",\"channel_id\":\"10659975\",\"payment_method\":\"COD\",\"sub_total\":399,\"length\":10,\"breadth\":10,\"height\":5,\"weight\":0.5,\"billing_customer_name\":\"Test Customer\",\"billing_address\":\"123 Test St\",\"billing_city\":\"Chennai\",\"billing_pincode\":\"600001\",\"billing_state\":\"Tamil Nadu\",\"billing_country\":\"India\",\"billing_email\":\"test@test.com\",\"billing_phone\":\"9999999999\",\"order_items\":[{\"name\":\"Test Product\",\"sku\":\"TST001\",\"units\":1,\"selling_price\":399}]}"

echo ""
echo "=== TEST 7: Create Prepaid Test Order ==="
curl -s -X POST "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc" \
  -H "Authorization: Bearer $SR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"TEST-PREPAID-$(date +%s)1\",\"order_date\":\"$(date +%Y-%m-%d)\",\"pickup_location\":\"Primary\",\"channel_id\":\"10659975\",\"payment_method\":\"Prepaid\",\"sub_total\":499,\"length\":10,\"breadth\":10,\"height\":5,\"weight\":0.5,\"billing_customer_name\":\"Test Customer 2\",\"billing_address\":\"456 Test Ave\",\"billing_city\":\"Chennai\",\"billing_pincode\":\"600001\",\"billing_state\":\"Tamil Nadu\",\"billing_country\":\"India\",\"billing_email\":\"test2@test.com\",\"billing_phone\":\"9999999998\",\"order_items\":[{\"name\":\"Test Product 2\",\"sku\":\"TST002\",\"units\":1,\"selling_price\":499}]}"

echo ""
echo "=== TEST 8: Razorpay Recent Orders ==="
curl -s "https://api.razorpay.com/v1/orders?count=5" \
  -u "${RZP_KEY}:${RZP_SECRET}"

echo ""
echo "=== TEST 9: Razorpay Recent Payments ==="
curl -s "https://api.razorpay.com/v1/payments?count=5" \
  -u "${RZP_KEY}:${RZP_SECRET}"

echo ""
echo "=== DONE ==="