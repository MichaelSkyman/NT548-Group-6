from ..repositories import StatisticsRepository


class AdminService:
    @staticmethod
    def get_dashboard_summary():
        counts = StatisticsRepository.counts()
        statistics = StatisticsRepository.questions_per_topic()
        empty_topics = [item for item in statistics if item["question_count"] == 0]
        low_content_topics = [
            item for item in statistics if 0 < item["question_count"] < 5
        ]
        return {
            **counts,
            "questions_per_topic": statistics,
            "content_overview": {
                "empty_topics": empty_topics,
                "low_content_topics": low_content_topics,
            },
        }
