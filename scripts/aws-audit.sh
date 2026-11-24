#!/usr/bin/env bash
# Quét tài nguyên AWS còn TÍNH TIỀN trong tài khoản hiện tại. CHỈ ĐỌC: không tạo, sửa hay xoá gì.
#
# Dùng cho:
#   - L0: tìm tài nguyên cũ (đặc biệt RDS/EKS từ lần dựng trước) đang tốn tiền mà không ai nhớ
#   - sau mỗi lần teardown: xác nhận đã sạch (ngoài kiểm tra có sẵn trong teardown-eks.sh)
#
# Dùng:   bash scripts/aws-audit.sh
#   AUDIT_REGIONS="us-east-1 ap-southeast-1"   các region cần quét (mặc định: hai region trên)
#   PROJECT=nt548-group6                       tiền tố để nhận diện bucket S3 của dự án
# Thoát 0 nếu sạch; 2 nếu còn tài nguyên tính tiền; 3 nếu không kết luận được (một số truy vấn lỗi
# quyền/region mà chưa thấy gì); 1 nếu không dùng được AWS CLI.
#
# Đơn giá chỉ là ƯỚC LƯỢNG (khoảng us-east-1) để biết bậc độ lớn, không dùng để đối soát hoá đơn.
set -uo pipefail

AUDIT_REGIONS="${AUDIT_REGIONS:-ap-southeast-1 us-east-1}"
PROJECT="${PROJECT:-nt548-group6}"
RATE_EKS="0.10"    # control plane, mỗi cluster
RATE_NAT="0.045"   # mỗi NAT Gateway (chưa gồm phí dữ liệu)
RATE_EIP="0.005"   # mỗi IPv4 công khai
RATE_ALB="0.0225"  # mỗi load balancer
RATE_RDS="0.02"    # mỗi instance db.t3.micro, lớn hơn thì đắt hơn
RATE_EC2="0.021"   # mỗi node t3.small, lớn hơn thì đắt hơn
RATE_EBS_GB="0.00011" # 0,08 USD/GB/tháng chia 730 giờ

case "${1:-}" in
  -h | --help) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "") ;;
  *) echo "Tham số lạ: $1" >&2; exit 1 ;;
esac

command -v aws > /dev/null 2>&1 || { echo "Thiếu 'aws' trong PATH" >&2; exit 1; }
aws sts get-caller-identity > /dev/null 2>&1 || { echo "Chưa đăng nhập AWS (aws sts get-caller-identity lỗi)" >&2; exit 1; }

TOTAL="0"
FOUND=0
UNREACHABLE=0

# add_cost A B: cộng số thực bằng awk (bash không có số thực)
add_cost() { awk -v a="$1" -v b="$2" 'BEGIN { printf "%.4f", a + b }'; }
mul_cost() { awk -v a="$1" -v n="$2" 'BEGIN { printf "%.4f", a * n }'; }

# query REGION lệnh...: chạy aws, in kết quả dạng text; lỗi (hết quyền, region bị tắt) thì in "?".
# Hàm này chạy trong $(...) (subshell) nên KHÔNG đếm lỗi ở đây: biến đếm sẽ mất khi subshell kết thúc.
# Nơi gọi phải gọi note_unreachable để đếm ở shell chính.
query() {
  local region="$1"
  shift
  local out
  if ! out="$(aws --region "$region" "$@" --output text 2> /dev/null)"; then
    echo "?"
    return 0
  fi
  printf '%s' "$out"
}

# note_unreachable TEXT: nếu kết quả là "?" thì đếm một truy vấn lỗi (gọi ở shell chính)
note_unreachable() {
  if [ "$1" = "?" ]; then
    UNREACHABLE=$((UNREACHABLE + 1))
    return 0
  fi
  return 1
}

# count TEXT: đếm số dòng khác rỗng
count() { printf '%s\n' "$1" | grep -c . || true; }

# report REGION NHÃN ĐƠN_GIÁ TEXT: in một dòng và cộng chi phí nếu có tài nguyên
report() {
  local region="$1" label="$2" rate="$3" text="$4" n cost names
  if note_unreachable "$text"; then
    printf '  %-22s %s\n' "$label" "không truy vấn được (thiếu quyền hoặc region tắt)"
    return 0
  fi
  n="$(count "$text")"
  if [ "$n" -eq 0 ]; then
    printf '  %-22s %s\n' "$label" "0"
    return 0
  fi
  FOUND=1
  cost="$(mul_cost "$rate" "$n")"
  TOTAL="$(add_cost "$TOTAL" "$cost")"
  names="$(printf '%s\n' "$text" | tr '\t' ' ' | head -n 4 | paste -sd ';' - | cut -c1-70)"
  printf '  \033[33m%-22s %s  ~%s USD/giờ  [%s]\033[0m\n' "$label" "$n" "$cost" "$names"
  : "$region"
}

echo "Quét tài nguyên tính tiền (chỉ đọc). Region: $AUDIT_REGIONS"

for region in $AUDIT_REGIONS; do
  printf '\n\033[1m== %s ==\033[0m\n' "$region"

  report "$region" "EKS cluster" "$RATE_EKS" \
    "$(query "$region" eks list-clusters --query 'clusters[]')"

  report "$region" "EC2 đang chạy" "$RATE_EC2" \
    "$(query "$region" ec2 describe-instances \
      --filters Name=instance-state-name,Values=pending,running \
      --query 'Reservations[].Instances[].[InstanceId,InstanceType]')"

  report "$region" "NAT Gateway" "$RATE_NAT" \
    "$(query "$region" ec2 describe-nat-gateways \
      --filter Name=state,Values=pending,available \
      --query 'NatGateways[].NatGatewayId')"

  report "$region" "Elastic IP" "$RATE_EIP" \
    "$(query "$region" ec2 describe-addresses --query 'Addresses[].PublicIp')"

  report "$region" "Load Balancer (v2)" "$RATE_ALB" \
    "$(query "$region" elbv2 describe-load-balancers --query 'LoadBalancers[].LoadBalancerName')"

  report "$region" "Load Balancer (classic)" "$RATE_ALB" \
    "$(query "$region" elb describe-load-balancers --query 'LoadBalancerDescriptions[].LoadBalancerName')"

  report "$region" "RDS instance" "$RATE_RDS" \
    "$(query "$region" rds describe-db-instances \
      --query 'DBInstances[].[DBInstanceIdentifier,DBInstanceClass,MultiAZ]')"

  # Volume 'available' = chưa gắn vào máy nào nhưng vẫn tính tiền lưu trữ (thường là PVC còn sót)
  vols="$(query "$region" ec2 describe-volumes --filters Name=status,Values=available \
    --query 'Volumes[].[VolumeId,Size]')"
  if note_unreachable "$vols"; then
    printf '  %-22s %s\n' "EBS chưa gắn" "không truy vấn được"
  elif [ "$(count "$vols")" -gt 0 ]; then
    FOUND=1
    gb="$(printf '%s\n' "$vols" | awk '{s += $2} END {print s + 0}')"
    cost="$(mul_cost "$RATE_EBS_GB" "$gb")"
    TOTAL="$(add_cost "$TOTAL" "$cost")"
    printf '  \033[33m%-22s %s  (%s GB)  ~%s USD/giờ\033[0m\n' "EBS chưa gắn" "$(count "$vols")" "$gb" "$cost"
  else
    printf '  %-22s %s\n' "EBS chưa gắn" "0"
  fi

  # Thông tin thêm, không tính vào tổng
  ecr="$(query "$region" ecr describe-repositories --query 'repositories[].repositoryName')"
  if ! note_unreachable "$ecr"; then
    printf '  %-22s %s (chỉ tốn phí lưu trữ)\n' "Repo ECR" "$(count "$ecr")"
  fi
  logs="$(query "$region" logs describe-log-groups --log-group-name-prefix /aws/eks/ \
    --query 'logGroups[].logGroupName')"
  if ! note_unreachable "$logs"; then
    printf '  %-22s %s (tốn phí lưu log)\n' "Log group EKS" "$(count "$logs")"
  fi
done

printf '\n\033[1m== Toàn cục ==\033[0m\n'
buckets="$(aws s3api list-buckets --query 'Buckets[].Name' --output text 2> /dev/null | tr '\t' '\n' | grep "^${PROJECT}-" || true)"
printf '  %-22s %s\n' "Bucket S3 dự án" "$(count "$buckets") ${buckets:+($(printf '%s' "$buckets" | paste -sd ' ' -))}"
echo "  (bucket state ở infra/bootstrap được giữ lại có chủ đích; chi phí gần như bằng 0)"

printf '\n'
if [ "$UNREACHABLE" -gt 0 ]; then
  printf '\033[33mCẢNH BÁO: %d truy vấn không chạy được; kết quả có thể thiếu.\033[0m\n' "$UNREACHABLE"
fi
if [ "$FOUND" -eq 0 ]; then
  if [ "$UNREACHABLE" -gt 0 ]; then
    # Không tìm thấy gì nhưng cũng chưa kiểm được hết: tuyệt đối không báo "sạch"
    printf '\033[1;33mKHÔNG THỂ KẾT LUẬN SẠCH: chưa thấy tài nguyên nào nhưng %d truy vấn lỗi. Cấp thêm quyền đọc hoặc kiểm tay trên Console.\033[0m\n' "$UNREACHABLE"
    exit 3
  fi
  printf '\033[1;32mSẠCH: không có tài nguyên tính tiền theo giờ trong các region đã quét.\033[0m\n'
  exit 0
fi
MONTH="$(mul_cost "$TOTAL" 730)"
printf '\033[1;31mCÒN TÀI NGUYÊN TÍNH TIỀN: ước lượng ~%s USD/giờ (~%s USD/tháng nếu để nguyên).\033[0m\n' "$TOTAL" "$MONTH"
echo "Xoá bằng scripts/teardown-eks.sh (nếu thuộc dự án này) hoặc thủ công trên AWS Console. Script này không tự xoá gì."
exit 2
