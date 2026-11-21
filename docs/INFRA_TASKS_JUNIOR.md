# Việc Terraform cho thành viên Infra

> Dành cho: thành viên phụ trách infra (gọi tắt **JR**) đang học Terraform.
> Người duyệt: OWNER của nhánh `k8s-development`.
> Kế hoạch tổng của nhóm: [PLAN.md](PLAN.md).
> **Agent đọc file này: KHÔNG làm thay các task ở đây.** Chỉ giải thích hoặc review khi JR hỏi.

Có 5 task nhỏ, mỗi task khoảng 30–60 phút. Làm theo thứ tự, mỗi task một commit.

## 0. Chuẩn bị (làm một lần)

### Lấy code và tạo nhánh

```bash
git clone https://github.com/MichaelSkyman/NT548-Group-6.git   # nếu chưa có
cd NT548-Group-6
git fetch origin
git switch -c infra/jr-tasks origin/k8s-development
```

### Cách tự kiểm tra code Terraform (không cần tài khoản AWS)

**Bạn không chạy `terraform apply`.** OWNER sẽ apply trên máy Linux. Bạn chỉ cần 3 lệnh sau pass là được:

```bash
cd infra
terraform fmt -recursive          # tự căn lề cho đẹp
terraform init -backend=false     # tải provider và module, không cần AWS
terraform validate                # kiểm tra cú pháp và tham chiếu
```

Máy không có Terraform mà có Docker thì dùng lệnh sau (Git Bash, chạy ở thư mục gốc repo; hỏi OWNER phiên bản `<TF_VERSION>` để khớp với máy Linux):
```bash
docker run --rm -v "$(pwd)/infra:/w" -w /w hashicorp/terraform:<TF_VERSION> validate
```

### 3 quy tắc bắt buộc

1. **Không commit** `infra/terraform.tfvars`, mật khẩu hay email thật. Giá trị thật chỉ nằm trong `terraform.tfvars`; file này đã bị `.gitignore` chặn.
2. Chỉ sửa các file của mình: `variables.tf`, `terraform.example.tfvars`, `ecr.tf`, `database.tf`, `budget.tf`, `outputs.tf`, `README.md` trong `infra/`. Thấy cần sửa file khác thì báo OWNER.
3. Mỗi task: sửa code, `fmt`, `validate`, rồi commit với message dạng `feat(infra): <mô tả ngắn>`.

### Kiến thức tối thiểu cần có

- `resource "loại" "tên" { ... }` tạo một tài nguyên trên AWS.
- `variable` là tham số đầu vào; `output` là giá trị in ra sau khi apply để bước sau dùng.
- `var.x` lấy giá trị biến; `aws_xxx.ten.thuoc_tinh` lấy thuộc tính của một resource khác.
- Tra tài liệu: https://registry.terraform.io/providers/hashicorp/aws/latest/docs (gõ tên resource vào ô tìm kiếm).

---

## JR-1. Đổi region sang `us-east-1` (khoảng 15 phút)

**Vì sao:** `us-east-1` rẻ hơn Singapore khoảng 20–30%. Demo cũng không cần độ trễ thấp.

**Việc làm:**
1. `infra/variables.tf`: đổi `default` của `aws_region` thành `"us-east-1"`. Sửa luôn description cho có dấu: "AWS Region để deploy hạ tầng".
2. `infra/terraform.example.tfvars`: đổi `aws_region = "us-east-1"`.

**Tự kiểm tra:**
- Mở `infra/provider.tf`, đọc dòng `azs = ["${var.aws_region}a", "${var.aws_region}b"]`. Câu hỏi: sau khi đổi region, VPC sẽ dùng 2 AZ nào? (Đáp án: `us-east-1a`, `us-east-1b`.)
- `terraform validate` pass.

**Commit:** `feat(infra): switch default region to us-east-1`

---

## JR-2. Tạo kho chứa image ECR (khoảng 45 phút)

**Vì sao:** Kubernetes trên AWS cần kéo image `backend` và `frontend` từ một registry. ECR là registry của AWS. Hiện manifest đang ghi `backend:latest`; node EKS không biết lấy image đó ở đâu.

**Việc làm:** tạo file mới `infra/ecr.tf` gồm:

1. **Hai repository** `backend` và `frontend`. Dùng `for_each` để không phải viết lặp 2 lần:
   ```hcl
   resource "aws_ecr_repository" "app" {
     for_each = toset(["backend", "frontend"])

     name                 = "${var.project_name}/${each.key}"
     image_tag_mutability = "MUTABLE"
     force_delete         = true   # cho phép terraform destroy kể cả khi repo còn image

     image_scanning_configuration {
       scan_on_push = true          # AWS tự quét lỗ hổng mỗi lần push
     }
   }
   ```
2. **Lifecycle policy** chỉ giữ 10 image mới nhất để không tốn tiền lưu trữ. Bạn tự viết phần này:
   - resource: `aws_ecr_lifecycle_policy`, cũng dùng `for_each = aws_ecr_repository.app`.
   - `repository = each.value.name`
   - `policy = jsonencode({ rules = [ { rulePriority = 1, description = "...", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10 }, action = { type = "expire" } } ] })`

**Tự kiểm tra:**
- `terraform validate` pass.
- Trả lời được: vì sao cần `force_delete = true`? (Gợi ý: thử nghĩ xem chuyện gì xảy ra khi `terraform destroy` một repo còn image bên trong.)

**Commit:** `feat(infra): add ECR repositories for backend and frontend`

---

## JR-3. Tăng bảo mật cho RDS (khoảng 30 phút)

**Vì sao:** RDS hiện chưa mã hoá ổ đĩa và chưa khai báo backup. README ghi "Multi-AZ" nhưng thực tế DB chỉ chạy ở 1 AZ.

**Việc làm:**
1. Trong `infra/variables.tf` thêm biến:
   ```hcl
   variable "db_multi_az" {
     description = "Bật RDS Multi-AZ (đắt gấp đôi, mặc định tắt cho môi trường học)"
     type        = bool
     default     = false
   }
   ```
2. Trong `resource "aws_db_instance" "postgresql"` của `infra/database.tf` thêm các dòng:
   ```hcl
   storage_type               = "gp3"
   storage_encrypted          = true
   backup_retention_period    = 1
   multi_az                   = var.db_multi_az
   deletion_protection        = false  # môi trường học, cần destroy được
   auto_minor_version_upgrade = true
   publicly_accessible        = false
   ```
3. Ghi một comment ngắn phía trên mỗi dòng, giải thích dòng đó làm gì (bằng tiếng Việt, câu của bạn).

**Lưu ý:** tài khoản AWS Free plan có thể báo lỗi về backup retention khi OWNER apply. Nếu gặp, OWNER sẽ đổi về `0`. Bạn cứ để `1`.

**Tự kiểm tra:** `terraform validate` pass.

**Commit:** `feat(infra): encrypt RDS storage and configure backups`

---

## JR-4. Cảnh báo chi phí AWS Budgets (khoảng 30 phút)

**Vì sao:** EKS và NAT tính tiền theo giờ. Quên tắt một tuần là mất khoảng 40 USD. Budget sẽ gửi email báo trước.

**Việc làm:**
1. Trong `infra/variables.tf` thêm 2 biến:
   - `alert_email` (kiểu `string`, **không có default**): email nhận cảnh báo.
   - `monthly_budget_usd` (kiểu `number`, default `20`).
2. Trong `infra/terraform.example.tfvars` thêm `alert_email = "<YOUR_EMAIL>"` (giữ placeholder, **không ghi email thật**).
3. Tạo file mới `infra/budget.tf`:
   ```hcl
   resource "aws_budgets_budget" "monthly" {
     name         = "${var.project_name}-monthly"
     budget_type  = "COST"
     limit_amount = tostring(var.monthly_budget_usd)
     limit_unit   = "USD"
     time_unit    = "MONTHLY"

     notification {
       comparison_operator        = "GREATER_THAN"
       threshold                  = 25
       threshold_type             = "PERCENTAGE"
       notification_type          = "ACTUAL"
       subscriber_email_addresses = [var.alert_email]
     }

     # TODO (bạn tự viết): thêm 2 block notification nữa
     #   - ngưỡng 50%, loại ACTUAL
     #   - ngưỡng 100%, loại FORECASTED (AWS dự báo cuối tháng sẽ vượt)
   }
   ```
   Tên resource phải là `aws_budgets_budget.monthly`, vì OWNER sẽ apply riêng nó bằng `-target`.

**Tự kiểm tra:**
- `terraform validate` pass.
- Trả lời được: `ACTUAL` và `FORECASTED` khác nhau thế nào?

**Commit:** `feat(infra): add monthly AWS budget alerts`

---

## JR-5. Output và cập nhật README infra (khoảng 45 phút)

**Vì sao:** script deploy cần biết URL của ECR. Tài liệu đang ghi sai region và phiên bản.

**Việc làm:**
1. Trong `infra/outputs.tf` thêm:
   ```hcl
   output "ecr_repository_urls" {
     description = "URL các repo ECR, dùng khi docker push"
     value       = { for name, repo in aws_ecr_repository.app : name => repo.repository_url }
   }
   ```
   Thêm `description` cho **mọi** output đang có trong file.
2. Cập nhật `infra/README.md`:
   - Region `us-east-1`, AZ `us-east-1a` / `us-east-1b`.
   - Kubernetes **1.35** (OWNER sửa `eks.tf`, bạn chỉ sửa chữ trong README).
   - Sửa câu "Multi-AZ chuẩn Production": VPC trải 2 AZ, nhưng RDS mặc định Single-AZ và NAT chỉ có 1 cái (để tiết kiệm). Ghi rõ như vậy.
   - Bổ sung vào cây thư mục: `ecr.tf`, `budget.tf`.
   - Thêm mục **"Dọn dẹp sau khi demo"**: xoá app Helm, chờ ALB biến mất, rồi `terraform destroy`; kiểm tra trên Console không còn NAT Gateway, Elastic IP, Load Balancer.
   - Thêm bảng **"Biến đầu vào"** gồm tên, ý nghĩa, mặc định và có bắt buộc hay không.

**Tự kiểm tra:** `terraform validate` pass; đọc lại README trên GitHub xem hiển thị có đẹp không.

**Commit:** `docs(infra): update outputs and README for us-east-1`

---

## Nộp bài

```bash
git push -u origin infra/jr-tasks
```
Mở Pull Request **`infra/jr-tasks` → `k8s-development`** (không phải vào `main`). Trong mô tả PR, ghi:
- Đã làm task nào.
- Kết quả `terraform validate` (chụp màn hình hoặc dán output).
- Câu trả lời cho các câu hỏi "Trả lời được" ở JR-2 và JR-4.

OWNER review, có thể nhờ agent review cùng. Sửa theo góp ý, rồi OWNER merge.

## Làm xong, muốn học thêm (không bắt buộc)

Xem cùng OWNER khi họ chạy `terraform plan` và `apply` trên máy Linux. Đọc output `plan` và đếm xem có bao nhiêu resource sẽ được tạo, và resource nào do module `eks` tạo ra.
