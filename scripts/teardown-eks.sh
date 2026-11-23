#!/usr/bin/env bash
# Gỡ toàn bộ môi trường AWS để ngừng bị tính tiền. LUÔN chạy sau mỗi buổi demo/kiểm thử.
#
# THỨ TỰ QUAN TRỌNG (đảo thứ tự là lỗi kinh điển):
#   1. Xoá Ingress/app      -> controller xoá ALB và security group do nó tạo
#   2. CHỜ ALB biến mất     -> ALB không nằm trong Terraform nên terraform destroy KHÔNG xoá nó
#   3. Gỡ ALB Controller    -> gỡ trước bước 2 thì ALB thành "mồ côi", vẫn tính tiền và chặn xoá VPC
#   4. terraform destroy    -> xoá EKS, RDS, NAT, VPC, ECR...
#   5. Kiểm tra còn sót gì  -> in cảnh báo nếu còn NAT/EIP/ALB/EKS/RDS
#
# Chạy từ thư mục gốc repo:   scripts/teardown-eks.sh [--yes]
# Không xoá bucket state của infra/bootstrap (giữ lại để dùng lần sau, chi phí gần như bằng 0).
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
NAMESPACE="${NAMESPACE:-devops-app}"
RELEASE="${RELEASE:-devops-app}"
INFRA_DIR="${INFRA_DIR:-infra}"
WAIT_ALB_SECONDS="${WAIT_ALB_SECONDS:-600}"
export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"

ASSUME_YES=0
case "${1:-}" in
  --yes) ASSUME_YES=1 ;;
  -h | --help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "") ;;
  *) echo "Tham số lạ: $1" >&2; exit 1 ;;
esac

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33mCẢNH BÁO: %s\033[0m\n' "$*" >&2; }
die() { printf '\033[1;31mLỖI: %s\033[0m\n' "$*" >&2; exit 1; }

for tool in aws terraform kubectl helm; do
  command -v "$tool" > /dev/null || die "Thiếu '$tool' trong PATH"
done
aws sts get-caller-identity > /dev/null || die "Chưa đăng nhập AWS"

CLUSTER_NAME="$(terraform -chdir="$INFRA_DIR" output -raw cluster_name 2> /dev/null || true)"
[ -n "$CLUSTER_NAME" ] || CLUSTER_NAME="nt548-group6"

echo "Sắp XOÁ môi trường AWS: cluster '$CLUSTER_NAME', region '$AWS_REGION' (EKS, RDS, NAT, VPC, ECR, ALB...)."
echo "Dữ liệu trong RDS sẽ MẤT (skip_final_snapshot = true)."
if [ "$ASSUME_YES" -ne 1 ]; then
  read -r -p "Gõ tên cluster để xác nhận: " CONFIRM
  [ "$CONFIRM" = "$CLUSTER_NAME" ] || die "Không khớp, huỷ."
fi

# Các tài nguyên do ALB Controller tạo đều gắn tag elbv2.k8s.aws/cluster=<tên cluster>
alb_arns() {
  aws resourcegroupstaggingapi get-resources \
    --tag-filters "Key=elbv2.k8s.aws/cluster,Values=$CLUSTER_NAME" \
    --resource-type-filters elasticloadbalancing:loadbalancer \
    --query 'ResourceTagMappingList[].ResourceARN' --output text
}
controller_sgs() {
  aws ec2 describe-security-groups \
    --filters "Name=tag:elbv2.k8s.aws/cluster,Values=$CLUSTER_NAME" \
    --query 'SecurityGroups[].GroupId' --output text
}

# ---------- 1. Xoá app và Ingress ----------
CLUSTER_UP=0
if aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME" > /dev/null 2>&1 \
  && kubectl get ns > /dev/null 2>&1; then
  CLUSTER_UP=1
fi

if [ "$CLUSTER_UP" -eq 1 ]; then
  log "Xoá Ingress và ứng dụng (controller sẽ xoá ALB)"
  kubectl -n "$NAMESPACE" delete ingress --all --ignore-not-found --timeout=120s || true
  helm uninstall "$RELEASE" --namespace "$NAMESPACE" --ignore-not-found || true
  # Xoá cả namespace: dọn nốt ConfigMap/Service hook mà `helm uninstall` không theo dõi
  kubectl delete namespace "$NAMESPACE" --ignore-not-found --timeout=180s || true

  # ---------- 2. Chờ ALB và security group biến mất ----------
  log "Chờ ALB và security group do controller tạo biến mất (tối đa ${WAIT_ALB_SECONDS}s)"
  waited=0
  while :; do
    left_alb="$(alb_arns)"
    left_sg="$(controller_sgs)"
    if [ -z "$left_alb" ] && [ -z "$left_sg" ]; then
      echo "ALB và security group đã được xoá."
      break
    fi
    if [ "$waited" -ge "$WAIT_ALB_SECONDS" ]; then
      die "Quá ${WAIT_ALB_SECONDS}s mà ALB/SG chưa biến mất (ALB: ${left_alb:-none}; SG: ${left_sg:-none}). Dừng lại để KHÔNG tạo tài nguyên mồ côi. Xem: kubectl -n kube-system logs deploy/aws-load-balancer-controller"
    fi
    echo "  còn ALB: ${left_alb:-không}; SG: ${left_sg:-không}; đã chờ ${waited}s..."
    sleep 10
    waited=$((waited + 10))
  done

  # ---------- 3. Gỡ controller (SAU KHI ALB đã mất) ----------
  log "Gỡ AWS Load Balancer Controller và metrics-server"
  helm uninstall aws-load-balancer-controller --namespace kube-system --ignore-not-found || true
  helm uninstall metrics-server --namespace kube-system --ignore-not-found || true
else
  warn "Không kết nối được cluster (đã xoá hoặc chưa tạo). Bỏ qua bước xoá app, chỉ kiểm tra ALB còn sót."
  left_alb="$(alb_arns)"
  [ -z "$left_alb" ] || die "Còn ALB do controller tạo nhưng cluster không truy cập được: $left_alb. Xoá tay trên Console (EC2 > Load Balancers) rồi chạy lại."
fi

# ---------- 4. terraform destroy ----------
log "terraform destroy ($INFRA_DIR), mất khoảng 10-15 phút"
if [ "$ASSUME_YES" -eq 1 ]; then
  terraform -chdir="$INFRA_DIR" destroy -auto-approve
else
  terraform -chdir="$INFRA_DIR" destroy
fi

# ---------- 5. Kiểm tra còn sót ----------
log "Kiểm tra tài nguyên còn tính tiền trong $AWS_REGION"
LEFT=0
count() { # $1 = mô tả, $2 = số lượng
  if [ "${2:-0}" -gt 0 ]; then warn "$1: còn $2"; LEFT=1; else echo "ok  $1: 0"; fi
}
count "NAT Gateway" "$(aws ec2 describe-nat-gateways --filter Name=state,Values=pending,available \
  --query 'length(NatGateways)' --output text)"
count "Elastic IP" "$(aws ec2 describe-addresses --query 'length(Addresses)' --output text)"
count "Load Balancer (ALB/NLB)" "$(aws elbv2 describe-load-balancers --query 'length(LoadBalancers)' --output text)"
count "EKS cluster" "$(aws eks list-clusters --query 'length(clusters)' --output text)"
count "RDS instance" "$(aws rds describe-db-instances --query 'length(DBInstances)' --output text)"

echo
if [ "$LEFT" -eq 0 ]; then
  echo "Sạch. Không còn tài nguyên tính tiền theo giờ trong $AWS_REGION."
else
  warn "Còn tài nguyên ở trên (có thể thuộc người khác trong cùng tài khoản). Kiểm tra trên AWS Console trước khi kết thúc."
  exit 2
fi
