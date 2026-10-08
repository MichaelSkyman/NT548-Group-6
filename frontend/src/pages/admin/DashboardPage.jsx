// TRANG: Bảng điều khiển Admin
//
// Mục tiêu: gọi adminApi.getDashboard() và hiển thị số liệu tổng quan
//   -> { total_topics, total_questions, questions_per_topic:[...], content_overview }
// Đây cũng là nơi dẫn sang các màn quản lý Topic / Question (CRUD).
//
// GỢI Ý:
//   - trang này cần token hợp lệ; nếu adminApi.me() lỗi -> đẩy về /admin/login
//   - có nút Đăng xuất gọi adminApi.logout()
//
// TODO: hiện thực component.
export default function DashboardPage() {
  return <div>{/* TODO: render số liệu dashboard */}</div>
}
