output "vpc_id" {
  value = aws_vpc.main.id
}

output "vpc_cidr_block" {
  value = aws_vpc.main.cidr_block
}

# Thứ tự [1a, 1b] khớp với var.azs
output "public_subnet_ids" {
  value = [aws_subnet.public_1a.id, aws_subnet.public_1b.id]
}

output "private_app_subnet_ids" {
  value = [aws_subnet.private_app_1a.id, aws_subnet.private_app_1b.id]
}

# Dùng cho ingress của db_sg (chỉ cho App Tier truy cập RDS)
output "private_app_subnet_cidrs" {
  value = [aws_subnet.private_app_1a.cidr_block, aws_subnet.private_app_1b.cidr_block]
}

# Dùng cho aws_db_subnet_group
output "private_db_subnet_ids" {
  value = [aws_subnet.private_db_1a.id, aws_subnet.private_db_1b.id]
}

output "nat_gateway_id" {
  value = aws_nat_gateway.nat.id
}

output "nat_public_ip" {
  value = aws_eip.nat.public_ip
}
