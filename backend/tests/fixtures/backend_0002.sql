-- Original feature-backend schema after 0002_topic_video_url.
CREATE TABLE admins (
    id serial PRIMARY KEY,
    username varchar(80) NOT NULL,
    password_hash varchar(255) NOT NULL,
    token_version integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX ix_admins_username ON admins (username);
CREATE TABLE topics (
    id serial PRIMARY KEY,
    name varchar(100) NOT NULL UNIQUE,
    slug varchar(100) NOT NULL,
    description text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    video_url varchar(500)
);
CREATE UNIQUE INDEX ix_topics_slug ON topics (slug);
CREATE TABLE questions (
    id serial PRIMARY KEY,
    topic_id integer NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    question_text text NOT NULL,
    options json NOT NULL,
    correct_answer integer NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT ck_question_answer_nonnegative CHECK (correct_answer >= 0),
    CONSTRAINT uq_question_topic_text UNIQUE (topic_id, question_text)
);
CREATE INDEX ix_questions_topic_id ON questions (topic_id);
