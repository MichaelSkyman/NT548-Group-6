output "vpc_id" {
  value = module.network.vpc_id
}

output "cluster_name" {
  value = local.cluster_name
}

# Endpoint RDS (không kèm port) -> dùng cho ExternalName trong k8s/database-service.yaml
output "rds_address" {
  value = aws_db_instance.postgresql.address
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}

# Cập nhật kubeconfig sau khi apply:
#   $(terraform -chdir=infra output -raw eks_kubeconfig_command)
output "eks_kubeconfig_command" {
  value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
