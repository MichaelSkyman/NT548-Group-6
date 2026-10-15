# EKS Cluster + Managed Node Group trong VPC do module network tạo
# Module v20.x tương thích AWS provider ~> 5.0 (v21 yêu cầu provider >= 6.0)
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = local.cluster_name
  cluster_version = "1.31"

  vpc_id = module.network.vpc_id
  # Control plane ENI + worker nodes đặt ở App Tier (private)
  subnet_ids = module.network.private_app_subnet_ids

  # Cho phép kubectl từ máy local qua Internet
  cluster_endpoint_public_access = true

  # User/role chạy terraform apply được quyền admin trên cluster
  enable_cluster_creator_admin_permissions = true

  # OIDC provider cho IRSA (AWS Load Balancer Controller dùng iam_policy.json)
  enable_irsa = true

  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni = {
      before_compute = true
    }
  }

  eks_managed_node_groups = {
    standard-workers = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3.small"]

      min_size     = 2
      max_size     = 3
      desired_size = 2
    }
  }

  tags = {
    Name = "${var.project_name}-eks"
  }
}
