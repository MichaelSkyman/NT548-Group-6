// HOOK DÙNG CHUNG: gom loading / error / data cho MỌI lời gọi API.
// Các hook khác (useTopics, useTopic, useQuiz) sẽ dùng lại hook này.

import { useEffect, useState } from 'react'
export function useApi(asyncFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive=true
    async function run(){
      setLoading(true)
      setError(null)
      try {
        const result = await asyncFn()
        if (alive) setData(result)
      } catch (err) {
        if (alive) setError(err.message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading, error }
}

