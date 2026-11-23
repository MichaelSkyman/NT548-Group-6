# Những IP được phép gọi API server của EKS (kubectl, helm, GitHub Actions).
# Mặc định mở cho mọi IP để dễ làm bài; trước khi apply nên đặt IP máy Linux, ví dụ:
#   cluster_endpoint_public_access_cidrs = ["203.0.113.10/32"]
# Lưu ý: GitHub Actions chạy từ dải IP thay đổi, nên nếu thu hẹp CIDR thì job CD (cd.yml)
# sẽ không kết nối được tới cluster.
variable "cluster_endpoint_public_access_cidrs" {
  description = "CIDR được phép truy cập API server của EKS qua Internet"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# EKS Cluster + Managed Node Group trong VPC do module network tạo
# Module v20.x tương thích AWS provider ~> 5.0 (v21 yêu cầu provider >= 6.0)
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name = local.cluster_name
  # 1.31 đã hết standard support (giá control plane gấp 6 lần, 0,60 USD/giờ).
  # 1.35 được standard support tới 2027-03-27. Kiểm lại lịch tại
  # https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
  cluster_version = "1.35"

  vpc_id = module.network.vpc_id
  # Control plane ENI + worker nodes đặt ở App Tier (private)
  subnet_ids = module.network.private_app_subnet_ids

  # Cho phép kubectl từ máy local qua Internet, giới hạn theo CIDR bên trên
  cluster_endpoint_public_access       = true
  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs

  # User/role chạy terraform apply được quyền admin trên cluster
  enable_cluster_creator_admin_permissions = true

  # OIDC provider cho IRSA (AWS Load Balancer Controller dùng iam_policy.json)
  enable_irsa = true

  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni = {
      before_compute = true
      configuration_values = jsonencode({
        # Prefix delegation: mỗi node nhận cả khối /28 (16 IP) thay vì từng IP lẻ,
        # nên t3.small chứa được nhiều pod hơn mức 11 mặc định.
        env = {
          ENABLE_PREFIX_DELEGATION = "true"
          WARM_PREFIX_TARGET       = "1"
        }
        # Bật network policy của VPC CNI để NetworkPolicy trong Helm chart thực sự có tác dụng.
        enableNetworkPolicy = "true"
      })
    }
  }

  eks_managed_node_groups = {
    standard-workers = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3.small"]

      min_size     = 2
      max_size     = 3
      desired_size = 2

      # Với launch template do module tạo, kubelet KHÔNG tự biết prefix delegation đã bật
      # và vẫn giới hạn 11 pod/node. Khai báo maxPods rõ ràng cho AL2023 (nodeadm).
      # 58 là mức đủ dùng cho 2 GB RAM của t3.small; RAM mới là giới hạn thật.
      cloudinit_pre_nodeadm = [
        {
          content_type = "application/node.eks.aws"
          content      = <<-EOT
            ---
            apiVersion: node.eks.aws/v1alpha1
            kind: NodeConfig
            spec:
              kubelet:
                config:
                  maxPods: 58
          EOT
        }
      ]
    }
  }

  tags = {
    Name = "${var.project_name}-eks"
  }
}
