# Network: VPC Multi-AZ, Public/Private Subnets, IGW, NAT Gateway, Route Tables
module "network" {
  source = "./modules/network"

  project_name = var.project_name
  vpc_cidr     = var.vpc_cidr
  azs          = local.azs
  cluster_name = local.cluster_name
}

# Chuyển state từ network.tf cũ vào module, tránh destroy/recreate hạ tầng đã apply
moved {
  from = aws_vpc.main
  to   = module.network.aws_vpc.main
}

moved {
  from = aws_internet_gateway.igw
  to   = module.network.aws_internet_gateway.igw
}

moved {
  from = aws_subnet.public_1a
  to   = module.network.aws_subnet.public_1a
}

moved {
  from = aws_subnet.public_1b
  to   = module.network.aws_subnet.public_1b
}

moved {
  from = aws_eip.nat
  to   = module.network.aws_eip.nat
}

moved {
  from = aws_nat_gateway.nat
  to   = module.network.aws_nat_gateway.nat
}

moved {
  from = aws_subnet.private_app_1a
  to   = module.network.aws_subnet.private_app_1a
}

moved {
  from = aws_subnet.private_app_1b
  to   = module.network.aws_subnet.private_app_1b
}

moved {
  from = aws_subnet.private_db_1a
  to   = module.network.aws_subnet.private_db_1a
}

moved {
  from = aws_subnet.private_db_1b
  to   = module.network.aws_subnet.private_db_1b
}

moved {
  from = aws_route_table.public
  to   = module.network.aws_route_table.public
}

moved {
  from = aws_route_table_association.public_1a
  to   = module.network.aws_route_table_association.public_1a
}

moved {
  from = aws_route_table_association.public_1b
  to   = module.network.aws_route_table_association.public_1b
}

moved {
  from = aws_route_table.private
  to   = module.network.aws_route_table.private
}

moved {
  from = aws_route_table_association.private_app_1a
  to   = module.network.aws_route_table_association.private_app_1a
}

moved {
  from = aws_route_table_association.private_app_1b
  to   = module.network.aws_route_table_association.private_app_1b
}
