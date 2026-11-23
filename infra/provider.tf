terraform {
  # >= 1.10 vì backend S3 dùng khoá bằng file (use_lockfile), không cần bảng DynamoDB
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
    }
  }
}

# 2 AZs suy ra từ region, đổi region không cần sửa subnet
locals {
  azs          = ["${var.aws_region}a", "${var.aws_region}b"]
  cluster_name = var.project_name
}
