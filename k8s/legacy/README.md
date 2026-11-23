# Manifest cũ (đã thay bằng Helm chart)

Các file ở đây là bản manifest thô trước khi chuyển sang Helm. **Không dùng để deploy.**
Nguồn chuẩn hiện tại: [`charts/devops-app/`](../../charts/devops-app/) (cách chạy: xem README gốc).

Khác biệt chính so với chart:
- Frontend ở đây nghe cổng 80 và chạy bằng root; chart dùng `nginx-unprivileged` cổng 8080.
- Liveness probe của backend ở đây dùng `/api/health`; chart dùng `/api/live`.
- Chưa có Job seed, HPA, PDB, NetworkPolicy, securityContext.

Xoá thư mục này sau khi deploy EKS thành công lần đầu.
