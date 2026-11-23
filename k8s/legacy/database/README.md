Database manifests đã hợp nhất vào thư mục `k8s/`, dùng namespace `devops-app`:

- `../database-service.yaml`: alias DNS tới RDS.
- `../configmap.yaml`: cấu hình kết nối và TLS dùng chung.
- `../secrets.yaml`: template credential; copy thành `secrets.local.yaml` trước khi điền giá trị thật.
- `../migration_job.yaml`: Job chạy `python -m database migrate` từ cùng image với backend.

Không apply lại bộ manifest `devops-learning` cũ. Xem [hướng dẫn database](../../backend/database/README.md).
