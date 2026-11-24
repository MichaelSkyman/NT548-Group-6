#!/usr/bin/env bash
# Kiểm tra nhanh hệ thống đã chạy đúng chưa, qua địa chỉ công khai (Ingress/ALB/proxy).
# Chạy được với mọi môi trường: Compose, cluster local, EKS.
#
# Dùng:   bash scripts/smoke-test.sh <base_url> [--wait GIÂY | --no-wait]
#   ví dụ:  bash scripts/smoke-test.sh http://localhost:8080      (Compose)
#           bash scripts/smoke-test.sh http://localhost           (cluster local, Traefik)
#           bash scripts/smoke-test.sh http://<địa-chỉ-ALB>      (EKS)
#   ADMIN_USERNAME / ADMIN_PASSWORD   nếu đặt, kiểm thêm đăng nhập admin (không bao giờ in mật khẩu/token)
#   --wait GIÂY   chờ tối đa bấy nhiêu giây cho /api/health lên 200 (mặc định 300; ALB cần vài phút)
# Thoát 0 nếu mọi kiểm tra đạt, 1 nếu có lỗi.
set -uo pipefail

BASE_URL=""
WAIT_SECONDS=300

while [ $# -gt 0 ]; do
  case "$1" in
    --wait) WAIT_SECONDS="${2:?--wait cần số giây}"; shift ;;
    --no-wait) WAIT_SECONDS=0 ;;
    -h | --help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Tham số lạ: $1" >&2; exit 1 ;;
    *) BASE_URL="$1" ;;
  esac
  shift
done
[ -n "$BASE_URL" ] || { echo "Thiếu <base_url>. Xem: bash $0 --help" >&2; exit 1; }
BASE_URL="${BASE_URL%/}"
command -v curl > /dev/null 2>&1 || { echo "Thiếu 'curl'" >&2; exit 1; }
command -v python3 > /dev/null 2>&1 || { echo "Thiếu 'python3'" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
BODY="$TMP/body"
PASS=0
FAIL=0
HTTP_CODE="000"

ok() { printf '  \033[32mOK\033[0m    %s\n' "$*"; PASS=$((PASS + 1)); }
bad() { printf '  \033[31mFAIL\033[0m  %s\n' "$*"; FAIL=$((FAIL + 1)); }

# http METHOD PATH [JSON_BODY] [TOKEN]: gọi API, đặt HTTP_CODE, ghi nội dung vào $BODY
http() {
  local method="$1" path="$2" data="${3:-}" token="${4:-}"
  local args=(-sS --max-time 15 -o "$BODY" -w '%{http_code}' -X "$method")
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' --data "$data")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  HTTP_CODE="$(curl "${args[@]}" "$BASE_URL$path" 2> /dev/null)" || HTTP_CODE="000"
  [ -f "$BODY" ] || : > "$BODY"
}

# Đọc JSON bằng python3 (không dùng eval trên dữ liệu từ máy chủ)
json_field() { python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); v=d.get(sys.argv[2]) if isinstance(d,dict) else None; print("" if v is None else v)' "$BODY" "$1" 2> /dev/null; }
json_len() { python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(len(d) if isinstance(d,list) else -1)' "$BODY" 2> /dev/null || echo -1; }
json_first_id() { python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d[0].get("id","") if isinstance(d,list) and d else "")' "$BODY" 2> /dev/null; }

expect_code() { # NHÃN MONG_ĐỢI
  if [ "$HTTP_CODE" = "$2" ]; then ok "$1 -> $HTTP_CODE"; else bad "$1 -> $HTTP_CODE (mong đợi $2)"; fi
}

echo "Smoke test: $BASE_URL"

# ---------- Chờ hệ thống lên ----------
if [ "$WAIT_SECONDS" -gt 0 ]; then
  printf 'Chờ /api/health = 200 (tối đa %ss)' "$WAIT_SECONDS"
  waited=0
  while :; do
    http GET /api/health
    [ "$HTTP_CODE" = "200" ] && break
    if [ "$waited" -ge "$WAIT_SECONDS" ]; then
      printf '\n'
      bad "sau ${WAIT_SECONDS}s /api/health vẫn trả $HTTP_CODE: hệ thống chưa sẵn sàng (ALB mới tạo có thể cần thêm vài phút)"
      printf '\n\033[1;31mSMOKE TEST THẤT BẠI\033[0m (không tới được hệ thống)\n'
      exit 1
    fi
    printf '.'
    sleep 10
    waited=$((waited + 10))
  done
  printf ' sẵn sàng sau ~%ss\n' "$waited"
fi

# ---------- Frontend ----------
echo
echo "Frontend"
http GET /
expect_code "GET /" 200
if grep -qi '<div id="root"' "$BODY"; then ok "trang chủ là app React (có #root)"; else bad "trang chủ không có phần tử #root"; fi

http GET /healthz
expect_code "GET /healthz" 200

# ---------- API công khai ----------
echo
echo "API công khai"
http GET /api/live
expect_code "GET /api/live" 200

http GET /api/health
expect_code "GET /api/health" 200
if [ "$(json_field database)" = "connected" ]; then ok "database: connected"; else bad "database không phải 'connected' ($(json_field database))"; fi

http GET /api/topics
expect_code "GET /api/topics" 200
N_TOPICS="$(json_len)"
if [ "$N_TOPICS" -ge 1 ] 2> /dev/null; then ok "có $N_TOPICS topic (đã seed)"; else bad "danh sách topic rỗng hoặc sai định dạng (seed chưa chạy?)"; fi
SLUG="$(json_first_id)"

if [ -n "$SLUG" ]; then
  http GET "/api/quiz/$SLUG"
  expect_code "GET /api/quiz/$SLUG" 200
  if grep -q 'correct_answer' "$BODY"; then bad "quiz LỘ đáp án đúng (correct_answer có trong phản hồi)"; else ok "quiz không lộ đáp án đúng"; fi
  if [ -n "$(json_field quiz_token)" ]; then ok "quiz có quiz_token"; else bad "quiz thiếu quiz_token"; fi

  http GET "/topics/$SLUG"
  expect_code "GET /topics/$SLUG (SPA fallback, tải lại trang)" 200
else
  bad "bỏ qua kiểm tra quiz và SPA fallback vì không có topic nào"
fi

http GET /api/khong-ton-tai
expect_code "GET /api/khong-ton-tai" 404

# ---------- Phân quyền ----------
echo
echo "Phân quyền"
http GET /api/admin/topics
expect_code "GET /api/admin/topics không kèm token" 401

if [ -n "${ADMIN_USERNAME:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  LOGIN_JSON="$(python3 -c 'import json,sys; print(json.dumps({"username": sys.argv[1], "password": sys.argv[2]}))' "$ADMIN_USERNAME" "$ADMIN_PASSWORD")"
  http POST /api/admin/login "$LOGIN_JSON"
  expect_code "POST /api/admin/login" 200
  TOKEN="$(json_field access_token)"
  if [ -n "$TOKEN" ]; then
    ok "đăng nhập nhận được access_token"
    http GET /api/admin/me "" "$TOKEN"
    expect_code "GET /api/admin/me (có token)" 200
    http GET /api/admin/dashboard "" "$TOKEN"
    expect_code "GET /api/admin/dashboard (có token)" 200
    http GET /api/admin/topics "" "invalid.token.value"
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "422" ]; then ok "token giả bị từ chối ($HTTP_CODE)"; else bad "token giả không bị từ chối ($HTTP_CODE)"; fi
  else
    bad "đăng nhập không trả access_token (sai mật khẩu admin hoặc seed chưa tạo admin?)"
  fi
else
  echo "  (bỏ qua kiểm tra đăng nhập admin: chưa đặt ADMIN_USERNAME và ADMIN_PASSWORD)"
fi

# ---------- Kết quả ----------
echo
if [ "$FAIL" -gt 0 ]; then
  printf '\033[1;31mSMOKE TEST THẤT BẠI: %d đạt, %d lỗi\033[0m\n' "$PASS" "$FAIL"
  exit 1
fi
printf '\033[1;32mSMOKE TEST ĐẠT: %d kiểm tra\033[0m\n' "$PASS"
