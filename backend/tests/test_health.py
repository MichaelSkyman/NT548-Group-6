def test_live_returns_ok(client):
    response = client.get("/api/live")
    assert response.status_code == 200
    assert response.get_json() == {"status": "alive"}


def test_health_reports_database_connected(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["database"] == "connected"


def test_live_stays_ok_when_database_is_down(client, monkeypatch):
    """Liveness không phụ thuộc DB, còn readiness (/health) thì có."""

    def broken_execute(*args, **kwargs):
        raise RuntimeError("database unavailable")

    monkeypatch.setattr("sqlalchemy.orm.Session.execute", broken_execute)

    assert client.get("/api/health").status_code == 503
    assert client.get("/api/live").status_code == 200
