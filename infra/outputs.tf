output "vpc_id" {
  description = "ID của VPC"
  value       = module.network.vpc_id
}

output "cluster_name" {
  description = "Tên EKS cluster"
  value       = local.cluster_name
}

# Endpoint RDS (không kèm port) -> dùng cho ExternalName trong k8s/database-service.yaml
output "rds_address" {
  description = "Địa chỉ RDS PostgreSQL (không kèm port)"
  value       = aws_db_instance.postgresql.address
}

output "eks_cluster_endpoint" {
  description = "Endpoint API server của EKS"
  value       = module.eks.cluster_endpoint
}

output "eks_oidc_provider_arn" {
  description = "ARN của OIDC provider, dùng cho IRSA"
  value       = module.eks.oidc_provider_arn
}

# Cập nhật kubeconfig sau khi apply:
#   $(terraform -chdir=infra output -raw eks_kubeconfig_command)
output "eks_kubeconfig_command" {
  description = "Lệnh cập nhật kubeconfig để kubectl kết nối cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "ecr_repository_urls" {
  description = "URL các repo ECR, dùng khi docker push"
  value       = { for name, repo in aws_ecr_repository.app : name => repo.repository_url }
}
