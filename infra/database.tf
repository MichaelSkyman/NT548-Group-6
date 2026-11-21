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

  # Ổ đĩa gp3: rẻ hơn và nhanh hơn gp2 cùng dung lượng
  storage_type = "gp3"
  # Mã hoá dữ liệu nghỉ (at-rest) bằng KMS
  storage_encrypted = true
  # Giữ backup tự động 1 ngày để có thể khôi phục
  backup_retention_period = 1
  # Chạy standby ở AZ khác nếu bật biến db_multi_az (mặc định tắt cho đỡ tốn)
  multi_az = var.db_multi_az
  # Môi trường học: cho phép terraform destroy
  deletion_protection = false
  # Tự cập nhật bản vá nhỏ của PostgreSQL
  auto_minor_version_upgrade = true
  # Không cấp IP public, chỉ truy cập được từ trong VPC
  publicly_accessible = false

  tags = {
    Name = "${var.project_name}-postgres-db"
  }
}