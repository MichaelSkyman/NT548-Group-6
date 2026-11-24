#!/usr/bin/env bash
# Kiểm tra môi trường TRƯỚC khi chạm vào AWS, để lỗi lộ ra sớm (vài giây) thay vì giữa chừng
# một lần apply 15-20 phút. Chỉ đọc, không tạo/sửa/xoá gì.
#
# Dùng:   bash scripts/preflight.sh [--stage apply|deploy]
#   --stage apply   trước `terraform apply`: công cụ, đăng nhập AWS, terraform.tfvars, backend.hcl
#   --stage deploy  trước `deploy-eks.sh` (mặc định): công cụ, Docker, đã apply xong, cluster ACTIVE
# Thoát 0 nếu không có mục FAIL (WARN vẫn cho qua), thoát 1 nếu có FAIL.
set -uo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
INFRA_DIR="${INFRA_DIR:-infra}"
STAGE="deploy"

while [ $# -gt 0 ]; do
  case "$1" in
    --stage) STAGE="${2:?--stage cần apply hoặc deploy}"; shift ;;
    -h | --help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Tham số lạ: $1" >&2; exit 1 ;;
  esac
  shift
done
case "$STAGE" in apply | deploy) ;; *) echo "--stage phải là apply hoặc deploy" >&2; exit 1 ;; esac

FAILS=0
WARNS=0
ok() { printf '  \033[32mOK\033[0m    %s\n' "$*"; }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$*"; WARNS=$((WARNS + 1)); }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$*"; FAILS=$((FAILS + 1)); }
section() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# ver_ge A B: phiên bản A >= B (so sánh kiểu phiên bản, 1.10 > 1.9)
ver_ge() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]; }

echo "Preflight (stage=$STAGE, region=$AWS_REGION, infra=$INFRA_DIR)"

# ---------- 1. Công cụ ----------
section "1. Công cụ"
for tool in aws terraform kubectl helm docker python3 git curl; do
  if command -v "$tool" > /dev/null 2>&1; then
    ok "$tool"
  else
    fail "thiếu '$tool' trong PATH"
  fi
done

if command -v terraform > /dev/null 2>&1; then
  TF_VER="$(terraform version 2> /dev/null | sed -n 's/^Terraform v\([0-9][0-9.]*\).*/\1/p' | head -n1)"
  if [ -z "$TF_VER" ]; then
    warn "không đọc được phiên bản terraform"
  elif ver_ge "$TF_VER" "1.10"; then
    ok "terraform $TF_VER (>= 1.10, cần cho use_lockfile)"
  else
    fail "terraform $TF_VER quá cũ, cần >= 1.10"
  fi
fi

if command -v helm > /dev/null 2>&1; then
  HELM_VER="$(helm version --template '{{.Version}}' 2> /dev/null | sed 's/^v//; s/[+-].*//')"
  if [ -z "$HELM_VER" ]; then
    warn "không đọc được phiên bản helm"
  elif ver_ge "$HELM_VER" "3.14"; then
    ok "helm $HELM_VER (>= 3.14, cần cho --reset-then-reuse-values)"
  else
    fail "helm $HELM_VER quá cũ, cần >= 3.14"
  fi
fi

if command -v aws > /dev/null 2>&1; then
  AWS_VER="$(aws --version 2>&1 | head -n1)"
  case "$AWS_VER" in
    aws-cli/2.*) ok "$AWS_VER" ;;
    *) warn "khuyến nghị AWS CLI v2 (đang là: $AWS_VER)" ;;
  esac
fi

# ---------- 2. Docker ----------
if [ "$STAGE" = "deploy" ] && command -v docker > /dev/null 2>&1; then
  section "2. Docker"
  if docker info > /dev/null 2>&1; then
    ok "Docker daemon đang chạy"
  else
    fail "Docker daemon không chạy (cần để build image)"
  fi
fi

# ---------- 3. Đăng nhập AWS ----------
section "3. Đăng nhập AWS"
if command -v aws > /dev/null 2>&1; then
  if IDENTITY="$(aws sts get-caller-identity --query Account --output text 2> /dev/null)"; then
    # Chỉ in 4 số cuối của account id
    ok "đã đăng nhập (account ****${IDENTITY: -4})"
  else
    fail "chưa đăng nhập AWS hoặc token hết hạn (aws sts get-caller-identity lỗi)"
  fi
  CFG_REGION="$(aws configure get region 2> /dev/null || true)"
  if [ -n "$CFG_REGION" ] && [ "$CFG_REGION" != "$AWS_REGION" ]; then
    warn "region mặc định của AWS CLI là '$CFG_REGION' nhưng script dùng '$AWS_REGION' (đặt AWS_REGION nếu muốn đổi)"
  else
    ok "region $AWS_REGION"
  fi
fi

# ---------- 4. Cấu hình Terraform (stage apply) ----------
if [ "$STAGE" = "apply" ]; then
  section "4. Cấu hình Terraform"
  TFVARS="$INFRA_DIR/terraform.tfvars"
  if [ ! -f "$TFVARS" ]; then
    fail "thiếu $TFVARS (cp $INFRA_DIR/terraform.example.tfvars $TFVARS rồi điền giá trị thật)"
  else
    if grep -q '<[A-Za-z_]*>' "$TFVARS"; then
      fail "$TFVARS còn placeholder dạng <...>: $(grep -n '<[A-Za-z_]*>' "$TFVARS" | cut -d: -f1 | tr '\n' ' ' | sed 's/ $//' | sed 's/^/dòng /')"
    else
      ok "$TFVARS không còn placeholder"
    fi
    for key in db_password alert_email; do
      if grep -qE "^[[:space:]]*${key}[[:space:]]*=" "$TFVARS"; then
        ok "$key đã khai báo"
      else
        fail "$TFVARS thiếu biến $key"
      fi
    done
    PW_LEN="$(sed -n 's/^[[:space:]]*db_password[[:space:]]*=[[:space:]]*"\(.*\)"[[:space:]]*$/\1/p' "$TFVARS" | head -n1 | awk '{print length($0)}')"
    if [ -n "$PW_LEN" ] && [ "$PW_LEN" -lt 12 ]; then
      fail "db_password chỉ có $PW_LEN ký tự (cần >= 12)"
    fi
    TFVARS_REGION="$(sed -n 's/^[[:space:]]*aws_region[[:space:]]*=[[:space:]]*"\(.*\)"[[:space:]]*$/\1/p' "$TFVARS" | head -n1)"
    if [ -n "$TFVARS_REGION" ] && [ "$TFVARS_REGION" != "$AWS_REGION" ]; then
      warn "aws_region trong tfvars là '$TFVARS_REGION', khác AWS_REGION='$AWS_REGION' của script"
    fi
  fi

  BACKEND="$INFRA_DIR/backend.hcl"
  if [ ! -f "$BACKEND" ]; then
    fail "thiếu $BACKEND (cp $INFRA_DIR/backend.hcl.example $BACKEND rồi điền tên bucket)"
  elif grep -q '<STATE_BUCKET_NAME>' "$BACKEND"; then
    fail "$BACKEND còn placeholder <STATE_BUCKET_NAME> (lấy từ: terraform -chdir=$INFRA_DIR/bootstrap output -raw state_bucket)"
  else
    BUCKET="$(sed -n 's/^[[:space:]]*bucket[[:space:]]*=[[:space:]]*"\(.*\)"[[:space:]]*$/\1/p' "$BACKEND" | head -n1)"
    if [ -n "$BUCKET" ] && command -v aws > /dev/null 2>&1; then
      if aws s3api head-bucket --bucket "$BUCKET" > /dev/null 2>&1; then
        ok "bucket state '$BUCKET' truy cập được"
      else
        fail "không truy cập được bucket state '$BUCKET' (chưa apply infra/bootstrap, hoặc sai tên/quyền)"
      fi
    else
      ok "$BACKEND đã điền"
    fi
  fi
fi

# ---------- 5. Hạ tầng đã apply (stage deploy) ----------
if [ "$STAGE" = "deploy" ]; then
  section "5. Hạ tầng đã apply"
  CLUSTER="$(terraform -chdir="$INFRA_DIR" output -raw cluster_name 2> /dev/null || true)"
  if [ -z "$CLUSTER" ]; then
    fail "không đọc được output Terraform (chưa 'terraform apply', hoặc chưa init với backend.hcl)"
  else
    ok "output Terraform đọc được (cluster '$CLUSTER')"
    if command -v aws > /dev/null 2>&1; then
      STATUS="$(aws eks describe-cluster --name "$CLUSTER" --query cluster.status --output text 2> /dev/null || true)"
      if [ "$STATUS" = "ACTIVE" ]; then
        ok "EKS cluster ACTIVE"
      else
        fail "EKS cluster '$CLUSTER' chưa ACTIVE (trạng thái: ${STATUS:-không truy vấn được})"
      fi
    fi
  fi
fi

# ---------- 6. Git ----------
section "6. Git"
if command -v git > /dev/null 2>&1 && git rev-parse --git-dir > /dev/null 2>&1; then
  if [ -n "$(git status --porcelain 2> /dev/null)" ]; then
    warn "working tree có thay đổi chưa commit (image sẽ build từ code hiện tại, gắn tag theo commit gần nhất)"
  else
    ok "working tree sạch ($(git rev-parse --short HEAD))"
  fi
else
  warn "không phải thư mục git"
fi

# ---------- Kết quả ----------
echo
if [ "$FAILS" -gt 0 ]; then
  printf '\033[1;31mPREFLIGHT THẤT BẠI: %d lỗi, %d cảnh báo. Sửa các mục FAIL rồi chạy lại.\033[0m\n' "$FAILS" "$WARNS"
  exit 1
fi
printf '\033[1;32mPREFLIGHT ĐẠT: 0 lỗi, %d cảnh báo.\033[0m\n' "$WARNS"
