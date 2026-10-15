# VPC chính
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Public Subnets (2 AZs cho ALB & NAT Gateway)
resource "aws_subnet" "public_1a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[0]
  availability_zone       = var.azs[0]
  map_public_ip_on_launch = true

  tags = {
    Name                                        = "${var.project_name}-public-1a"
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

resource "aws_subnet" "public_1b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[1]
  availability_zone       = var.azs[1]
  map_public_ip_on_launch = true

  tags = {
    Name                                        = "${var.project_name}-public-1b"
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

# Elastic IP & NAT Gateway cho Private Subnet
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1a.id

  tags = {
    Name = "${var.project_name}-nat"
  }
}

# Private Subnets cho EKS Worker Nodes (App Tier)
resource "aws_subnet" "private_app_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_app_subnet_cidrs[0]
  availability_zone = var.azs[0]

  tags = {
    Name                                        = "${var.project_name}-private-app-1a"
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

resource "aws_subnet" "private_app_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_app_subnet_cidrs[1]
  availability_zone = var.azs[1]

  tags = {
    Name                                        = "${var.project_name}-private-app-1b"
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

# Private Subnets cho RDS PostgreSQL (Database Tier)
resource "aws_subnet" "private_db_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_db_subnet_cidrs[0]
  availability_zone = var.azs[0]

  tags = {
    Name = "${var.project_name}-private-db-1a"
  }
}

resource "aws_subnet" "private_db_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_db_subnet_cidrs[1]
  availability_zone = var.azs[1]

  tags = {
    Name = "${var.project_name}-private-db-1b"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public_1a" {
  subnet_id      = aws_subnet.public_1a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_1b" {
  subnet_id      = aws_subnet.public_1b.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "private_app_1a" {
  subnet_id      = aws_subnet.private_app_1a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_app_1b" {
  subnet_id      = aws_subnet.private_app_1b.id
  route_table_id = aws_route_table.private.id
}
