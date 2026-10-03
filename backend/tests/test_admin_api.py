def test_admin_routes_require_authentication(client):
    assert client.get("/api/admin/topics").status_code == 401
    assert client.post("/api/admin/questions", json={}).status_code == 401


def test_login_rejects_invalid_password(client):
    response = client.post(
        "/api/admin/login", json={"username": "admin", "password": "wrong"}
    )
    assert response.status_code == 401


def test_admin_can_manage_topic(client, auth_headers):
    created = client.post(
        "/api/admin/topics",
        headers=auth_headers,
        json={
            "name": "Terraform",
            "slug": "terraform",
            "description": "Infrastructure as code",
            "content": "Terraform learning content",
        },
    )
    assert created.status_code == 201
    topic_id = created.get_json()["id"]

    updated = client.put(
        f"/api/admin/topics/{topic_id}",
        headers=auth_headers,
        json={"description": "Updated"},
    )
    assert updated.status_code == 200
    assert updated.get_json()["description"] == "Updated"

    deleted = client.delete(f"/api/admin/topics/{topic_id}", headers=auth_headers)
    assert deleted.status_code == 204


def test_admin_can_create_and_filter_questions(client, auth_headers):
    created = client.post(
        "/api/admin/questions",
        headers=auth_headers,
        json={
            "topic_slug": "docker",
            "question_text": "Which command starts a container?",
            "options": ["docker run", "docker ps", "docker build", "docker pull"],
            "correct_answer": 0,
        },
    )
    assert created.status_code == 201
    assert created.get_json()["topic_slug"] == "docker"

    listed = client.get(
        "/api/admin/questions?topic_slug=docker", headers=auth_headers
    )
    assert listed.status_code == 200
    assert len(listed.get_json()) == 3


def test_bulk_create_is_atomic_on_validation_error(client, auth_headers):
    response = client.post(
        "/api/admin/questions/bulk",
        headers=auth_headers,
        json=[
            {
                "topic_slug": "docker",
                "question_text": "Valid new question?",
                "options": ["A", "B"],
                "correct_answer": 0,
            },
            {
                "topic_slug": "missing",
                "question_text": "Invalid question?",
                "options": ["A", "B"],
                "correct_answer": 0,
            },
        ],
    )
    assert response.status_code == 400
    listed = client.get("/api/admin/questions", headers=auth_headers).get_json()
    assert all(question["question_text"] != "Valid new question?" for question in listed)


def test_logout_invalidates_existing_token(client, auth_headers):
    assert client.post("/api/admin/logout", headers=auth_headers).status_code == 204
    assert client.get("/api/admin/topics", headers=auth_headers).status_code == 401


def test_dashboard_returns_content_statistics(client, auth_headers):
    response = client.get("/api/admin/dashboard", headers=auth_headers)
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total_topics"] == 1
    assert payload["total_questions"] == 2
    assert payload["questions_per_topic"][0]["question_count"] == 2
