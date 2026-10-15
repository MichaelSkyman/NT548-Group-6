# DB Subnet Group trải dài trên 2 AZs của Database Subnets
resource "aws_db_subnet_group" "db_group" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = module.network.private_db_subnet_ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# Security Group cho PostgreSQL (chỉ cho phép traffic từ các EKS App Subnets port 5432)
resource "aws_security_group" "db_sg" {
  name        = "${var.project_name}-db-sg"
  description = "Security group cho RDS PostgreSQL"
  vpc_id      = module.network.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = module.network.private_app_subnet_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-db-sg"
  }
}

# Khởi tạo RDS PostgreSQL Instance
resource "aws_db_instance" "postgresql" {
  identifier             = "${var.project_name}-postgres-db"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  db_name                = "devops_learning"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.db_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true

  tags = {
    Name = "${var.project_name}-postgres-db"
  }
}