# IAM role cho AWS Load Balancer Controller (IRSA).
#
# Vấn đề: controller chạy trong pod nhưng cần gọi API AWS để tạo ALB, target group, security group.
# IRSA (IAM Roles for Service Accounts) cho phép gắn một IAM role vào ServiceAccount của Kubernetes:
# pod nhận token từ OIDC provider của cluster (module.eks bật enable_irsa) rồi đổi lấy quyền tạm thời,
# nên không cần access key nào trong cluster.
#
# Module bên dưới đã kèm sẵn IAM policy chính thức của controller (attach_load_balancer_controller_policy),
# nên không phải tự chép file iam_policy.json.
module "alb_controller_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name = "${var.project_name}-alb-controller"

  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn = module.eks.oidc_provider_arn
      # Phải khớp đúng namespace và tên ServiceAccount mà Helm chart của controller tạo ra
      # (scripts/deploy-eks.sh cài với serviceAccount.name=aws-load-balancer-controller).
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}

output "alb_controller_role_arn" {
  description = "ARN role IRSA, gắn vào ServiceAccount aws-load-balancer-controller khi cài bằng Helm"
  value       = module.alb_controller_irsa.iam_role_arn
}
