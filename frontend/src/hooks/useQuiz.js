// HOOK: lấy đề quiz theo slug (gồm cả quiz_token để nộp bài sau này).
// Dùng cho QuizPage. Trả về { data, loading, error }.
//

import {useApi} from './useApi'
import {publicApi} from '../api/client'

export function useQuiz(slug) {
  return useApi(() => publicApi.getQuiz(slug), [slug])
}
