import os

from app import create_app
from app.extensions import db
from app.models import Admin, Question, Topic


TOPICS = [
    {
        "name": "Docker",
        "slug": "docker",
        "description": "Learn containerization from Docker fundamentals to production practices.",
        "content": "Images, containers, networking, volumes, Dockerfiles, and Compose.",
    },
    {
        "name": "Kubernetes",
        "slug": "kubernetes",
        "description": "Learn how Kubernetes deploys and operates containerized workloads.",
        "content": "Pods, Deployments, Services, configuration, storage, and troubleshooting.",
    },
    {
        "name": "Jenkins",
        "slug": "jenkins",
        "description": "Build continuous integration and delivery pipelines with Jenkins.",
        "content": "Jenkinsfiles, agents, stages, credentials, artifacts, and delivery workflows.",
    },
]

QUESTIONS = {
    "docker": [
        ("Which command lists all Docker containers?", ["docker ps -a", "docker list", "docker containers", "docker show"], 0),
        ("Which file normally defines the steps used to build an image?", ["compose.json", "Dockerfile", "container.ini", "image.yaml"], 1),
    ],
    "kubernetes": [
        ("What is the smallest deployable unit in Kubernetes?", ["Container", "Pod", "Node", "Service"], 1),
        ("Which object provides a stable network endpoint for Pods?", ["Secret", "Service", "Job", "Namespace"], 1),
    ],
    "jenkins": [
        ("Which file commonly defines a Jenkins Pipeline?", ["Pipelinefile", "Jenkinsfile", "jenkins.yaml", "build.xml"], 1),
        ("What is a Jenkins agent used for?", ["Running build work", "Storing passwords", "Managing DNS", "Creating VPCs"], 0),
    ],
}


def seed():
    username = os.getenv("ADMIN_USERNAME", "admin").strip()
    password = os.getenv("ADMIN_PASSWORD", "admin-change-me")
    admin = db.session.scalar(db.select(Admin).where(Admin.username == username))
    if admin is None:
        admin = Admin(username=username)
        admin.set_password(password)
        db.session.add(admin)

    for topic_data in TOPICS:
        topic = db.session.scalar(db.select(Topic).where(Topic.slug == topic_data["slug"]))
        if topic is None:
            topic = Topic(**topic_data)
            db.session.add(topic)
            db.session.flush()
        for text, options, answer in QUESTIONS[topic.slug]:
            exists = db.session.scalar(
                db.select(Question.id).where(
                    Question.topic_id == topic.id, Question.question_text == text
                )
            )
            if exists is None:
                db.session.add(
                    Question(
                        topic_id=topic.id,
                        question_text=text,
                        options=options,
                        correct_answer=answer,
                    )
                )
    db.session.commit()
    print(f"Seed complete. Admin username: {username}")


if __name__ == "__main__":
    application = create_app()
    with application.app_context():
        seed()
