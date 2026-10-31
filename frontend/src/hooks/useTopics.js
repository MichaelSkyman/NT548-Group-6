// HOOK: lấy danh sách chủ đề cho Guest.
// Dùng cho TopicsPage. Trả về { data, loading, error }.
import { publicApi } from '../api/client'
import { useApi } from './useApi'
  
export function useTopics() {
  return useApi(() => publicApi.getTopics(), []) // không phụ thuộc gì -> deps rỗng
}
