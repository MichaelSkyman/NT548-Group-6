variable "aws_region" {
  description = "AWS Region để deploy hạ tầng"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "nt548-group6"
}

variable "environment" {
  description = "Environment type (dev, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_username" {
  description = "Database administrator username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

variable "db_multi_az" {
  description = "Bật RDS Multi-AZ (đắt gấp đôi, mặc định tắt cho môi trường học)"
  type        = bool
  default     = false
}


variable "alert_email" {
  description = "Email nhận cảnh báo chi phí AWS Budgets"
  type        = string
}

variable "monthly_budget_usd" {
  description = "Ngân sách hàng tháng (USD)"
  type        = number
  default     = 20
}
