// HOOK: lấy nội dung 1 chủ đề theo slug.
// Dùng cho TopicDetailPage. Trả về { data, loading, error }.
//

import { publicApi } from '../api/client'
import { useApi } from './useApi'
export function useTopic(slug) {
  return useApi(() => publicApi.getTopic(slug), [slug])   // slug đổi -> tải lại
}
