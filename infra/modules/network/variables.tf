variable "project_name" {
  description = "Project name prefix"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Danh sách 2 Availability Zones (index 0 -> 1a, index 1 -> 1b)"
  type        = list(string)

  validation {
    condition     = length(var.azs) == 2
    error_message = "azs phải có đúng 2 phần tử."
  }
}

variable "cluster_name" {
  description = "Tên EKS cluster, dùng cho tag kubernetes.io/cluster/<name>"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "CIDR cho 2 Public Subnets (ALB & NAT Gateway)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR cho 2 Private Subnets của EKS Worker Nodes (App Tier)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "private_db_subnet_cidrs" {
  description = "CIDR cho 2 Private Subnets của RDS PostgreSQL (Database Tier)"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24"]
}
