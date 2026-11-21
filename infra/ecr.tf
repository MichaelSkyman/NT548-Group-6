# Hai kho ECR chứa image backend và frontend (dùng for_each để không viết lặp)
resource "aws_ecr_repository" "app" {
  for_each = toset(["backend", "frontend"])

  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # cho phép terraform destroy kể cả khi repo còn image

  image_scanning_configuration {
    scan_on_push = true # AWS tự quét lỗ hổng mỗi lần push
  }
}

# Chỉ giữ 10 image mới nhất mỗi repo để đỡ tốn phí lưu trữ
resource "aws_ecr_lifecycle_policy" "app" {
  for_each = aws_ecr_repository.app

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Giữ 10 image mới nhất"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
