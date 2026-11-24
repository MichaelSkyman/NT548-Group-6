#!/usr/bin/env bash
# Sinh tải lên ứng dụng để HPA tự tăng số pod, đồng thời ghi lại dòng thời gian của HPA.
# Dùng làm bằng chứng cho buổi demo / ảnh minh chứng (README: "HPA tự tăng số pod khi chạy tải").
#
# Dùng:   bash scripts/loadtest.sh <base_url> [tuỳ chọn]
#   --vus N         số người dùng ảo chạy đồng thời (mặc định 60)
#   --duration T    thời gian chạy, kiểu k6: 90s, 3m ... (mặc định 3m)
#   --namespace NS  namespace chứa HPA để theo dõi (mặc định devops-app)
#   --out-dir DIR   nơi lưu báo cáo (mặc định docs/images)
#   --no-hpa        không theo dõi HPA (khi không có kubectl hoặc không có quyền)
# Cần: docker (chạy image k6), và kubectl nếu muốn theo dõi HPA.
#
# CẢNH BÁO: tạo tải thật. Chỉ chạy vào hệ thống của chính mình. Trên EKS, tải kéo HPA tăng pod,
# có thể làm cụm cần thêm node (tốn tiền); chạy ngắn và teardown ngay sau khi xong.
set -uo pipefail

K6_IMAGE="${K6_IMAGE:-grafana/k6:2.4.0}"
VUS=60
DURATION="3m"
NAMESPACE="devops-app"
OUT_DIR="docs/images"
WATCH_HPA=1
BASE_URL=""

while [ $# -gt 0 ]; do
  case "$1" in
    --vus) VUS="${2:?--vus cần một số}"; shift ;;
    --duration) DURATION="${2:?--duration cần giá trị như 90s hoặc 3m}"; shift ;;
    --namespace) NAMESPACE="${2:?--namespace cần một giá trị}"; shift ;;
    --out-dir) OUT_DIR="${2:?--out-dir cần một đường dẫn}"; shift ;;
    --no-hpa) WATCH_HPA=0 ;;
    -h | --help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Tham số lạ: $1" >&2; exit 1 ;;
    *) BASE_URL="$1" ;;
  esac
  shift
done
[ -n "$BASE_URL" ] || { echo "Thiếu <base_url>. Xem: bash $0 --help" >&2; exit 1; }
BASE_URL="${BASE_URL%/}"
case "$VUS" in '' | *[!0-9]*) echo "--vus phải là số nguyên" >&2; exit 1 ;; esac
command -v docker > /dev/null 2>&1 || { echo "Thiếu 'docker' (cần để chạy k6)" >&2; exit 1; }
docker info > /dev/null 2>&1 || { echo "Docker daemon không chạy" >&2; exit 1; }

if [ "$WATCH_HPA" -eq 1 ]; then
  if ! command -v kubectl > /dev/null 2>&1 || ! kubectl -n "$NAMESPACE" get hpa > /dev/null 2>&1; then
    echo "Không đọc được HPA trong namespace '$NAMESPACE' (thiếu kubectl hoặc quyền): chạy không theo dõi HPA."
    WATCH_HPA=0
  fi
fi

# k6 chạy trong container: 'localhost' của máy chủ phải đổi thành host.docker.internal
K6_TARGET="$BASE_URL"
case "$BASE_URL" in
  http://localhost* | https://localhost* | http://127.0.0.1* | https://127.0.0.1*)
    K6_TARGET="$(printf '%s' "$BASE_URL" | sed 's#//localhost#//host.docker.internal#; s#//127\.0\.0\.1#//host.docker.internal#')"
    ;;
esac

TMP="$(mktemp -d)"
HPA_LOG="$TMP/hpa.log"
: > "$HPA_LOG"
MON_PID=""
cleanup() {
  [ -n "$MON_PID" ] && kill "$MON_PID" > /dev/null 2>&1
  rm -rf "$TMP"
}
trap cleanup EXIT

# Theo dõi HPA mỗi 10 giây: ghi "giờ tên CPU% số-pod-hiện-tại số-pod-mong-muốn".
# Lấy từng trường theo TÊN (custom-columns), không đếm cột của `kubectl get hpa`: cột TARGETS có
# dấu cách ("cpu: 1%/70%") nên đếm cột sẽ lệch và đọc nhầm sang MAXPODS.
monitor() {
  while :; do
    ts="$(date +%H:%M:%S)"
    kubectl -n "$NAMESPACE" get hpa --no-headers \
      -o 'custom-columns=NAME:.metadata.name,CPU:.status.currentMetrics[0].resource.current.averageUtilization,CUR:.status.currentReplicas,DES:.status.desiredReplicas' 2> /dev/null \
      | awk -v t="$ts" '{print t, $1, $2, $3, $4}' >> "$HPA_LOG"
    sleep 10
  done
}

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="$OUT_DIR/loadtest-$STAMP.txt"

{
  echo "Load test: $BASE_URL"
  echo "k6: $K6_IMAGE | VUs: $VUS | thời gian: $DURATION | bắt đầu: $(date '+%Y-%m-%d %H:%M:%S')"
  echo
} | tee "$REPORT"

if [ "$WATCH_HPA" -eq 1 ]; then
  echo "HPA trước khi chạy tải:"
  kubectl -n "$NAMESPACE" get hpa | tee -a "$REPORT"
  echo
  monitor &
  MON_PID=$!
fi

echo "Đang tạo tải (k6)... Ctrl+C để dừng sớm."
# Kịch bản k6: duyệt danh sách topic, lấy một bộ quiz ngẫu nhiên, tải trang chủ; không nghỉ để đẩy CPU backend lên
K6_STATUS=0
docker run --rm -i \
  --add-host=host.docker.internal:host-gateway \
  -e TARGET="$K6_TARGET" -e VUS="$VUS" -e DURATION="$DURATION" \
  "$K6_IMAGE" run --quiet --no-color - <<'JS' 2>&1 | tee -a "$REPORT" || K6_STATUS=$?
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: Number(__ENV.VUS),
  duration: __ENV.DURATION,
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const topics = http.get(`${__ENV.TARGET}/api/topics`);
  check(topics, { 'topics 200': (r) => r.status === 200 });
  if (topics.status === 200) {
    const list = topics.json();
    if (Array.isArray(list) && list.length > 0) {
      const slug = list[Math.floor(Math.random() * list.length)].id;
      const quiz = http.get(`${__ENV.TARGET}/api/quiz/${slug}`);
      check(quiz, { 'quiz 200': (r) => r.status === 200 });
    }
  }
  http.get(`${__ENV.TARGET}/`);
}
JS
# Lưu ý: set -o pipefail đã bật nên `|| K6_STATUS=$?` ở trên nhận đúng mã thoát của k6
# (đừng đọc PIPESTATUS ở đây: sau phép gán nó chỉ phản ánh chính phép gán).

if [ "$WATCH_HPA" -eq 1 ]; then
  sleep 12 # chờ thêm một nhịp ghi nhận cuối
  kill "$MON_PID" > /dev/null 2>&1
  MON_PID=""
  {
    echo
    echo "=== Dòng thời gian HPA (giờ, tên, CPU% hiện tại, pod hiện tại, pod mong muốn) ==="
    cat "$HPA_LOG"
    echo
    echo "=== Tóm tắt HPA (pod hiện tại) ==="
    awk '{ if (!($2 in first)) first[$2] = $4; last[$2] = $4; if ($4 + 0 > max[$2] + 0) max[$2] = $4; if ($3 + 0 > cpu[$2] + 0) cpu[$2] = $3 }
         END { for (n in first) printf "%-10s ban đầu %s pod -> đỉnh %s pod -> cuối %s pod | CPU đỉnh %s%%\n", n, first[n], max[n], last[n], cpu[n] }' "$HPA_LOG"
  } | tee -a "$REPORT"
fi

echo
echo "Báo cáo đã lưu: $REPORT"
if [ "$K6_STATUS" -ne 0 ]; then
  echo "k6 kết thúc với mã $K6_STATUS (có ngưỡng không đạt: tỉ lệ lỗi hoặc độ trễ p95 vượt mức)."
  exit 1
fi
