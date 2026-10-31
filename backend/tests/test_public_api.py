def test_public_topics_are_available_without_login(client):
    response = client.get("/api/topics")
    assert response.status_code == 200
    assert response.get_json()[0]["id"] == "docker"
    assert response.get_json()[0]["video_url"] is None


def test_public_quiz_never_leaks_correct_answer(client):
    response = client.get("/api/quiz/docker")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["quiz_token"]
    assert payload["selected_questions"] == 2
    assert all("correct_answer" not in question for question in payload["questions"])


def test_quiz_can_be_submitted_using_signed_option_order(client, app):
    quiz = client.get("/api/quiz/docker").get_json()
    answers = {}
    with app.app_context():
        from app.models import Question

        for public_question in quiz["questions"]:
            question = app.extensions["sqlalchemy"].session.get(
                Question, public_question["id"]
            )
            correct_text = question.options[question.correct_answer]
            answers[str(question.id)] = public_question["options"].index(correct_text)

    response = client.post(
        "/api/quiz/submit",
        json={"quiz_token": quiz["quiz_token"], "answers": answers},
    )
    assert response.status_code == 200
    assert response.get_json()["score"] == 100.0


def test_tampered_quiz_token_is_rejected(client):
    quiz = client.get("/api/quiz/docker").get_json()
    response = client.post(
        "/api/quiz/submit",
        json={"quiz_token": quiz["quiz_token"] + "tampered", "answers": {}},
    )
    assert response.status_code == 400


def test_health_checks_database(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["database"] == "connected"
