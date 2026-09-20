CREATE TABLE IF NOT EXISTS student_health_forms (
  form_id             SERIAL PRIMARY KEY,
  student_id          INTEGER NOT NULL UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,

  sex                 VARCHAR(10),
  date_of_birth       DATE,
  birthplace          VARCHAR(150),
  nationality         VARCHAR(50),
  religion            VARCHAR(50),
  address             VARCHAR(255),
  contact_number      VARCHAR(30),

  father_name         VARCHAR(100),
  father_occupation   VARCHAR(100),
  father_contact      VARCHAR(30),
  mother_name         VARCHAR(100),
  mother_occupation   VARCHAR(100),
  mother_contact      VARCHAR(30),
  guardian_name       VARCHAR(100),
  guardian_occupation VARCHAR(100),
  guardian_contact    VARCHAR(30),

  hospital_choice     VARCHAR(150),
  hospital_address    VARCHAR(255),
  hospital_contact    VARCHAR(30),
  doctor_name         VARCHAR(100),

  emergency_person    VARCHAR(100),
  emergency_contact   VARCHAR(30),
  emergency_relation  VARCHAR(50),
  emergency_address   VARCHAR(255),

  past_history        JSONB NOT NULL DEFAULT '{}'::jsonb,
  past_others         TEXT,
  family_history      JSONB NOT NULL DEFAULT '{}'::jsonb,
  psychological       JSONB NOT NULL DEFAULT '{}'::jsonb,
  other_medical       JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_of_system    JSONB NOT NULL DEFAULT '{}'::jsonb,

  consent_name         VARCHAR(100),
  consent_relationship VARCHAR(50),
  consent_date         DATE,

  updated_by          VARCHAR(100),
  created_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP(3)
);