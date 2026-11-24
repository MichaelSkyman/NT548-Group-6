#!/usr/bin/env bash
# Triển khai ứng dụng lên EKS (chạy trên máy Linux có quyền AWS), sau khi `terraform apply` xong.
#
# Làm gì:
#   1. Lấy thông tin từ output của Terraform (RDS, ECR, VPC, role IRSA)
#   2. Kết nối kubectl tới cluster
#   3. Build và đẩy image backend/frontend lên ECR (tag = commit SHA)
#   4. Cài AWS Load Balancer Controller và metrics-server bằng Helm
#   5. Tạo namespace, Secret app-secrets, ConfigMap rds-ca
#   6. Cài chart devops-app, rồi in địa chỉ ALB
#
#   0. (đầu) preflight.sh kiểm công cụ, đăng nhập AWS, hạ tầng đã apply
#   7. (cuối) smoke-test.sh kiểm hệ thống qua địa chỉ ALB
#
# Chạy từ thư mục gốc của repo:
#   bash scripts/deploy-eks.sh [--skip-images] [--tag TAG] [--skip-preflight] [--skip-smoke]
# Chạy lại nhiều lần an toàn (idempotent). Muốn gỡ mọi thứ: scripts/teardown-eks.sh
set -euo pipefail

# ---------- Cấu hình (ghi đè bằng biến môi trường) ----------
AWS_REGION="${AWS_REGION:-us-east-1}"
NAMESPACE="${NAMESPACE:-devops-app}"
RELEASE="${RELEASE:-devops-app}"
INFRA_DIR="${INFRA_DIR:-infra}"
SECRETS_FILE="${SECRETS_FILE:-.env.k8s.eks}"            # bị .gitignore chặn (.env.*)
ALB_CHART_VERSION="${ALB_CHART_VERSION:-3.6.3}"         # aws-load-balancer-controller
METRICS_SERVER_CHART_VERSION="${METRICS_SERVER_CHART_VERSION:-3.14.0}"
RDS_CA_URL="https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"
export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"

SKIP_IMAGES=0
SKIP_PREFLIGHT=0
SKIP_SMOKE=0
IMAGE_TAG=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-images) SKIP_IMAGES=1 ;;
    --skip-preflight) SKIP_PREFLIGHT=1 ;;
    --skip-smoke) SKIP_SMOKE=1 ;;
    --tag) IMAGE_TAG="${2:?--tag cần một giá trị}"; shift ;;
    -h | --help) usage 0 ;;
    *) echo "Tham số lạ: $1" >&2; usage 1 ;;
  esac
  shift
done

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mLỖI: %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- 0. Preflight và kiểm tra công cụ ----------
if [ "$SKIP_PREFLIGHT" -eq 0 ]; then
  log "Preflight"
  bash "$SCRIPT_DIR/preflight.sh" --stage deploy \
    || die "Preflight thất bại. Sửa các mục FAIL ở trên rồi chạy lại (hoặc --skip-preflight, không khuyến nghị)."
fi

log "Kiểm tra công cụ"
for tool in aws terraform kubectl helm docker curl python3 git; do
  command -v "$tool" > /dev/null || die "Thiếu '$tool' trong PATH"
done
[ -d "$INFRA_DIR" ] || die "Không thấy thư mục $INFRA_DIR. Hãy chạy script từ thư mục gốc của repo."
[ -f charts/devops-app/Chart.yaml ] || die "Không thấy charts/devops-app. Hãy chạy script từ thư mục gốc của repo."
aws sts get-caller-identity > /dev/null || die "Chưa đăng nhập AWS (aws sts get-caller-identity lỗi)"

[ -n "$IMAGE_TAG" ] || IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
if [ -n "$(git status --porcelain 2> /dev/null)" ]; then
  echo "Cảnh báo: working tree có thay đổi chưa commit; image được build từ code hiện tại nhưng gắn tag $IMAGE_TAG."
fi

# ---------- 1. Đọc output của Terraform ----------
log "Đọc output Terraform ($INFRA_DIR)"
tf_out() {
  terraform -chdir="$INFRA_DIR" output -raw "$1" 2> /dev/null \
    || die "Không đọc được output '$1'. Đã chạy 'terraform apply' (và init với backend.hcl) chưa?"
}
CLUSTER_NAME="$(tf_out cluster_name)"
RDS_ADDRESS="$(tf_out rds_address)"
VPC_ID="$(tf_out vpc_id)"
ALB_ROLE_ARN="$(tf_out alb_controller_role_arn)"

ECR_JSON="$(terraform -chdir="$INFRA_DIR" output -json ecr_repository_urls 2> /dev/null)" \
  || die "Thiếu output 'ecr_repository_urls' (file infra/ecr.tf và outputs.tf của JR-2/JR-5 đã được merge chưa?)"
ecr_url() {
  printf '%s' "$ECR_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)[sys.argv[1]])' "$1"
}
BACKEND_REPO="$(ecr_url backend)"
FRONTEND_REPO="$(ecr_url frontend)"
ECR_REGISTRY="${BACKEND_REPO%%/*}"

VPC_CIDR="$(aws ec2 describe-vpcs --vpc-ids "$VPC_ID" --query 'Vpcs[0].CidrBlock' --output text)"
echo "cluster=$CLUSTER_NAME  vpc=$VPC_ID ($VPC_CIDR)  tag=$IMAGE_TAG"

# ---------- 2. kubectl ----------
log "Kết nối kubectl tới cluster"
aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"
kubectl get nodes

# ---------- 3. Image ----------
if [ "$SKIP_IMAGES" -eq 1 ]; then
  log "Bỏ qua build image (--skip-images); dùng tag $IMAGE_TAG đã có sẵn trên ECR"
else
  log "Build và đẩy image lên ECR"
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY"
  # Node EKS là amd64 (chart ép nodeSelector), nên build đúng nền tảng này kể cả trên máy ARM
  docker build --platform linux/amd64 -t "$BACKEND_REPO:$IMAGE_TAG" backend
  docker build --platform linux/amd64 -t "$FRONTEND_REPO:$IMAGE_TAG" frontend
  docker push "$BACKEND_REPO:$IMAGE_TAG"
  docker push "$FRONTEND_REPO:$IMAGE_TAG"
fi

# ---------- 4. Add-on cho cluster ----------
log "Cài AWS Load Balancer Controller $ALB_CHART_VERSION (tạo ALB từ Ingress)"
helm repo add eks https://aws.github.io/eks-charts > /dev/null 2>&1 || true
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ > /dev/null 2>&1 || true
helm repo update > /dev/null
# serviceAccount.name phải khớp với "kube-system:aws-load-balancer-controller" trong infra/iam_alb_controller.tf.
# Truyền region và vpcId để controller khỏi phải đọc IMDS (pod bị giới hạn truy cập metadata).
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --version "$ALB_CHART_VERSION" --namespace kube-system \
  --set clusterName="$CLUSTER_NAME" \
  --set region="$AWS_REGION" \
  --set vpcId="$VPC_ID" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn=$ALB_ROLE_ARN" \
  --wait --timeout 5m

log "Cài metrics-server $METRICS_SERVER_CHART_VERSION (cho HPA)"
helm upgrade --install metrics-server metrics-server/metrics-server \
  --version "$METRICS_SERVER_CHART_VERSION" --namespace kube-system --wait --timeout 5m

# ---------- 5. Namespace, Secret, ConfigMap rds-ca ----------
log "Tạo namespace $NAMESPACE"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

if [ ! -f "$SECRETS_FILE" ]; then
  log "Chưa có $SECRETS_FILE, tạo mới (khoá ngẫu nhiên; DB_USER/DB_PASSWORD lấy từ $INFRA_DIR/terraform.tfvars)"
  TFVARS="$INFRA_DIR/terraform.tfvars"
  [ -f "$TFVARS" ] || die "Không thấy $TFVARS để lấy DB_USER/DB_PASSWORD. Tự tạo $SECRETS_FILE gồm các dòng KEY=giá trị: DB_USER, DB_PASSWORD, SECRET_KEY, JWT_SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD."
  tfvar() { sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*\"\(.*\)\"[[:space:]]*$/\1/p" "$TFVARS" | head -n 1; }
  DB_USER_VALUE="$(tfvar db_username)"
  DB_PASSWORD_VALUE="$(tfvar db_password)"
  [ -n "$DB_USER_VALUE" ] || DB_USER_VALUE="postgres" # mặc định của biến db_username
  [ -n "$DB_PASSWORD_VALUE" ] || die "Không đọc được db_password trong $TFVARS"
  umask 077 # file chứa bí mật: chỉ chủ sở hữu đọc được
  {
    echo "DB_USER=$DB_USER_VALUE"
    echo "DB_PASSWORD=$DB_PASSWORD_VALUE"
    echo "SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
    echo "JWT_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
    echo "ADMIN_USERNAME=admin"
    echo "ADMIN_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_urlsafe(18))')"
  } > "$SECRETS_FILE"
  echo "Đã tạo $SECRETS_FILE (không in giá trị). Mật khẩu admin nằm trong file này."
fi
kubectl -n "$NAMESPACE" create secret generic app-secrets --from-env-file="$SECRETS_FILE" \
  --dry-run=client -o yaml | kubectl apply -f -

log "Tạo ConfigMap rds-ca (CA bundle của RDS cho TLS verify-full)"
CA_TMP="$(mktemp -d)"
trap 'rm -rf "$CA_TMP"' EXIT
curl -fsSL "$RDS_CA_URL" -o "$CA_TMP/global-bundle.pem"
grep -q 'BEGIN CERTIFICATE' "$CA_TMP/global-bundle.pem" || die "File tải về từ $RDS_CA_URL không phải chứng chỉ PEM"
kubectl -n "$NAMESPACE" create configmap rds-ca --from-file=global-bundle.pem="$CA_TMP/global-bundle.pem" \
  --dry-run=client -o yaml | kubectl apply -f -

# ---------- 6. Ứng dụng ----------
log "Cài chart $RELEASE (Job migrate chạy trước, Job seed chạy sau)"
# --atomic: lỗi thì tự gỡ/rollback. Các --set bên dưới được CD (cd.yml) giữ lại nhờ --reset-then-reuse-values.
helm upgrade --install "$RELEASE" charts/devops-app \
  --namespace "$NAMESPACE" \
  -f charts/devops-app/values-eks.yaml \
  --set config.DB_HOST="$RDS_ADDRESS" \
  --set database.externalName="$RDS_ADDRESS" \
  --set backend.image.repository="$BACKEND_REPO" \
  --set backend.image.tag="$IMAGE_TAG" \
  --set frontend.image.repository="$FRONTEND_REPO" \
  --set frontend.image.tag="$IMAGE_TAG" \
  --set "networkPolicy.ingressFrom[0].ipBlock.cidr=$VPC_CIDR" \
  --atomic --timeout 10m

# ---------- 7. Địa chỉ truy cập ----------
log "Chờ ALB được tạo (thường 2-3 phút)"
ALB_HOST=""
for _ in $(seq 1 40); do
  ALB_HOST="$(kubectl -n "$NAMESPACE" get ingress devops-app-ingress \
    -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2> /dev/null || true)"
  [ -n "$ALB_HOST" ] && break
  sleep 10
done

kubectl -n "$NAMESPACE" get pods,hpa,ingress
echo
if [ -n "$ALB_HOST" ]; then
  echo "Ứng dụng:  http://$ALB_HOST"
  echo "(ALB cần thêm 1-2 phút để target healthy; nếu gặp 503 thì chờ rồi thử lại)"
else
  echo "Chưa thấy địa chỉ ALB sau ~6 phút. Xem log controller:"
  echo "  kubectl -n kube-system logs deploy/aws-load-balancer-controller"
fi
echo "Admin: tài khoản 'admin', mật khẩu trong $SECRETS_FILE"

# ---------- 8. Smoke test ----------
SMOKE_FAILED=0
if [ -n "$ALB_HOST" ] && [ "$SKIP_SMOKE" -eq 0 ]; then
  log "Smoke test qua ALB (chờ tối đa 7 phút cho target healthy)"
  # Đọc thông tin admin trong subshell: không export ra môi trường của script, không in ra màn hình
  (
    ADMIN_USERNAME="$(sed -n 's/^ADMIN_USERNAME=//p' "$SECRETS_FILE" | head -n 1)"
    ADMIN_PASSWORD="$(sed -n 's/^ADMIN_PASSWORD=//p' "$SECRETS_FILE" | head -n 1)"
    export ADMIN_USERNAME ADMIN_PASSWORD
    bash "$SCRIPT_DIR/smoke-test.sh" "http://$ALB_HOST" --wait 420
  ) || SMOKE_FAILED=1
fi

echo
echo "NHẮC: cụm đang tính tiền khoảng 0,24 USD/giờ. Xong việc thì chạy scripts/teardown-eks.sh"
if [ "$SMOKE_FAILED" -eq 1 ]; then
  printf '\033[1;33mCẢNH BÁO: smoke test thất bại. Ứng dụng đã được cài nhưng chưa chạy đúng; xem kết quả phía trên.\033[0m\n' >&2
  exit 3
fi
