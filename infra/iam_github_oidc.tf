# IAM cho GitHub Actions (CD) bằng OIDC: workflow đổi token do GitHub cấp lấy quyền AWS tạm thời,
# nên KHÔNG phải lưu AWS access key trong GitHub Secrets.
#
# Mức an toàn nằm ở "trust policy" bên dưới: chỉ workflow chạy từ đúng repo và đúng nhánh mới
# assume được role. Fork hay nhánh khác của repo đều bị từ chối.

variable "github_repo" {
  description = "Repo GitHub được phép deploy, dạng owner/name"
  type        = string
  default     = "MichaelSkyman/NT548-Group-6"
}

variable "github_branch" {
  description = "Nhánh được phép deploy"
  type        = string
  default     = "main"
}

data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS không còn kiểm tra thumbprint với provider này, nhưng provider ~> 5.0 vẫn cho khai báo.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # "sub" cho biết workflow nào đang gọi. Dùng StringEquals (khớp tuyệt đối), không dùng StringLike
    # với dấu *, để không vô tình mở cho repo/nhánh khác.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/${var.github_branch}"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${var.project_name}-github-actions"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json
}

# Quyền tối thiểu: đẩy image lên ECR và xem thông tin cluster để lấy kubeconfig.
data "aws_iam_policy_document" "github_permissions" {
  # Lấy token đăng nhập ECR, hành động này không áp dụng được theo từng repo
  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # Chỉ các repo có tên bắt đầu bằng "<project_name>/" (khớp ecr.tf: <project_name>/backend, /frontend)
  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = ["arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/${var.project_name}/*"]
  }

  statement {
    actions   = ["eks:DescribeCluster"]
    resources = [module.eks.cluster_arn]
  }
}

resource "aws_iam_role_policy" "github_actions" {
  name   = "ecr-push-and-eks-describe"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_permissions.json
}

# Quyền BÊN TRONG Kubernetes: IAM cho phép gọi API EKS nhưng không cho tạo Deployment.
# Access entry ánh xạ role này thành một user của cluster; policy Edit chỉ có hiệu lực
# trong namespace devops-app (không phải toàn cluster).
resource "aws_eks_access_entry" "github_actions" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.github_actions.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "github_actions" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.github_actions.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"

  access_scope {
    type       = "namespace"
    namespaces = ["devops-app"]
  }

  depends_on = [aws_eks_access_entry.github_actions]
}

output "github_actions_role_arn" {
  description = "ARN role cho GitHub Actions: lưu vào GitHub Secrets với tên AWS_ROLE_ARN"
  value       = aws_iam_role.github_actions.arn
}
