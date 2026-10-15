--
-- PostgreSQL database dump
--

\restrict 6NZrd9ctryYFkV3C7YsJwasMIMTwjXJzFGZoZreNCcQH5l6suVmOU7xlI6rx0cY

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: clinic_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_staff (
    staff_id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    "position" character varying(100) NOT NULL,
    email character varying(100),
    contact character varying(30),
    license_no character varying(50),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    recorded_by integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    archived_at timestamp without time zone
);


--
-- Name: clinic_staff_staff_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clinic_staff_staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clinic_staff_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinic_staff_staff_id_seq OWNED BY public.clinic_staff.staff_id;


--
-- Name: dental_health_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dental_health_forms (
    form_id integer NOT NULL,
    student_id integer NOT NULL,
    level character varying(50),
    section character varying(50),
    age integer,
    sex character varying(10),
    chart jsonb DEFAULT '{}'::jsonb NOT NULL,
    periodontal jsonb DEFAULT '{}'::jsonb NOT NULL,
    occlusion jsonb DEFAULT '{}'::jsonb NOT NULL,
    treatment jsonb DEFAULT '{}'::jsonb NOT NULL,
    remarks text,
    exam_date date,
    examined_by character varying(100),
    updated_by character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone
);


--
-- Name: dental_health_forms_form_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dental_health_forms_form_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dental_health_forms_form_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dental_health_forms_form_id_seq OWNED BY public.dental_health_forms.form_id;


--
-- Name: dental_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dental_records (
    dental_id integer NOT NULL,
    student_id integer,
    visit_date date NOT NULL,
    procedure_name character varying(150) NOT NULL,
    tooth character varying(50),
    dentist_name character varying(100),
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    notes text,
    recorded_by integer,
    archived_at timestamp(3) without time zone,
    archived_by integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    employee_id integer,
    CONSTRAINT dental_records_patient_check CHECK (((student_id IS NULL) <> (employee_id IS NULL)))
);


--
-- Name: dental_records_dental_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dental_records_dental_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dental_records_dental_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dental_records_dental_id_seq OWNED BY public.dental_records.dental_id;


--
-- Name: employee_health_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_health_forms (
    form_id integer NOT NULL,
    employee_id integer NOT NULL,
    sex character varying(10),
    date_of_birth date,
    birthplace character varying(150),
    nationality character varying(50),
    religion character varying(50),
    address character varying(255),
    contact_number character varying(30),
    father_name character varying(100),
    father_occupation character varying(100),
    father_contact character varying(30),
    mother_name character varying(100),
    mother_occupation character varying(100),
    mother_contact character varying(30),
    hospital_choice character varying(150),
    hospital_address character varying(255),
    hospital_contact character varying(30),
    doctor_name character varying(100),
    emergency_person character varying(100),
    emergency_contact character varying(30),
    emergency_relation character varying(50),
    emergency_address character varying(255),
    past_history jsonb DEFAULT '{}'::jsonb NOT NULL,
    past_others text,
    family_history jsonb DEFAULT '{}'::jsonb NOT NULL,
    psychological jsonb DEFAULT '{}'::jsonb NOT NULL,
    other_medical jsonb DEFAULT '{}'::jsonb NOT NULL,
    review_of_system jsonb DEFAULT '{}'::jsonb NOT NULL,
    consent_name character varying(100),
    consent_date date,
    updated_by character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone
);


--
-- Name: employee_health_forms_form_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_health_forms_form_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_health_forms_form_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_health_forms_form_id_seq OWNED BY public.employee_health_forms.form_id;


--
-- Name: employee_health_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_health_records (
    record_id integer NOT NULL,
    employee_id integer NOT NULL,
    visit_date date NOT NULL,
    complaint character varying(200) NOT NULL,
    action_taken text,
    attending_staff character varying(100),
    height_cm double precision,
    weight_kg double precision,
    heart_rate integer,
    blood_pressure character varying(20),
    temperature double precision,
    recorded_by character varying(100),
    archived_at timestamp(3) without time zone,
    archived_by character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_health_records_record_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_health_records_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_health_records_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_health_records_record_id_seq OWNED BY public.employee_health_records.record_id;


--
-- Name: employee_lab_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_lab_exams (
    lab_id integer NOT NULL,
    employee_id integer NOT NULL,
    exam_date date NOT NULL,
    findings text,
    recommendations text,
    physician_signature character varying(100),
    recorded_by character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_lab_exams_lab_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_lab_exams_lab_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_lab_exams_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_lab_exams_lab_id_seq OWNED BY public.employee_lab_exams.lab_id;


--
-- Name: employee_physical_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_physical_exams (
    exam_id integer NOT NULL,
    employee_id integer NOT NULL,
    exam_date date NOT NULL,
    findings jsonb DEFAULT '{}'::jsonb NOT NULL,
    physician_signature character varying(100),
    recorded_by character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_physical_exams_exam_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_physical_exams_exam_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_physical_exams_exam_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_physical_exams_exam_id_seq OWNED BY public.employee_physical_exams.exam_id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    employee_id integer NOT NULL,
    employee_number character varying(20) NOT NULL,
    last_name character varying(50) NOT NULL,
    first_name character varying(50) NOT NULL,
    middle_name character varying(50),
    department character varying(100),
    "position" character varying(100),
    date_of_birth date,
    gender character varying(10),
    password character varying(255) NOT NULL,
    archived_at timestamp(3) without time zone,
    archived_by character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    contact_number character varying(20),
    email character varying(120)
);


--
-- Name: employees_employee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_employee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_employee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_employee_id_seq OWNED BY public.employees.employee_id;


--
-- Name: health_case_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_case_reports (
    case_id integer NOT NULL,
    case_number character varying(20) NOT NULL,
    student_id integer,
    complaint character varying(255) NOT NULL,
    report_date date NOT NULL,
    staff_name character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    recorded_by integer,
    archived_at timestamp(3) without time zone,
    archived_by integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    employee_id integer
);


--
-- Name: health_case_reports_case_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_case_reports_case_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_case_reports_case_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_case_reports_case_id_seq OWNED BY public.health_case_reports.case_id;


--
-- Name: health_declarations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_declarations (
    declaration_id integer NOT NULL,
    student_id integer NOT NULL,
    school_year character varying(20),
    grade_section character varying(100),
    residence_address character varying(255),
    emergency_name character varying(100),
    emergency_relationship character varying(50),
    emergency_numbers character varying(100),
    going_home character varying(50),
    going_home_other character varying(150),
    symptoms jsonb DEFAULT '{}'::jsonb NOT NULL,
    symptom_notes text,
    vaccination_submitted boolean DEFAULT false NOT NULL,
    medical_cert_submitted boolean DEFAULT false NOT NULL,
    medicines text,
    certified_by character varying(100),
    declaration_date date,
    updated_by character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone
);


--
-- Name: health_declarations_declaration_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_declarations_declaration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_declarations_declaration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_declarations_declaration_id_seq OWNED BY public.health_declarations.declaration_id;


--
-- Name: health_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records (
    record_id integer NOT NULL,
    student_id integer NOT NULL,
    visit_date date NOT NULL,
    complaint character varying(255) NOT NULL,
    action_taken character varying(255),
    attending_staff character varying(100),
    height_cm double precision,
    weight_kg double precision,
    heart_rate integer,
    blood_pressure character varying(10),
    temperature double precision,
    recorded_by integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    archived_at timestamp(3) without time zone,
    archived_by integer
);


--
-- Name: health_records_record_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_records_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_records_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_records_record_id_seq OWNED BY public.health_records.record_id;


--
-- Name: identity_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_verifications (
    id integer NOT NULL,
    subject_type text NOT NULL,
    subject_id integer NOT NULL,
    id_presented text NOT NULL,
    verified_by integer NOT NULL,
    verified_by_name text,
    note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: identity_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.identity_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: identity_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.identity_verifications_id_seq OWNED BY public.identity_verifications.id;


--
-- Name: login_lockouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_lockouts (
    id integer NOT NULL,
    scope text NOT NULL,
    lock_key text NOT NULL,
    fails integer DEFAULT 0 NOT NULL,
    locked_until timestamp without time zone,
    first_fail timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: login_lockouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_lockouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_lockouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_lockouts_id_seq OWNED BY public.login_lockouts.id;


--
-- Name: login_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_logs (
    log_id integer NOT NULL,
    username character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    device character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: login_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_logs_log_id_seq OWNED BY public.login_logs.log_id;


--
-- Name: password_reset_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    new_password_hash text NOT NULL,
    otp_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: password_reset_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_requests_id_seq OWNED BY public.password_reset_requests.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: portal_password_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_password_requests (
    request_id integer NOT NULL,
    student_id integer,
    note text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    handled_by character varying(100),
    handled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    employee_id integer,
    CONSTRAINT portal_password_requests_owner_check CHECK (((student_id IS NULL) <> (employee_id IS NULL)))
);


--
-- Name: portal_password_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portal_password_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portal_password_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portal_password_requests_request_id_seq OWNED BY public.portal_password_requests.request_id;


--
-- Name: record_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.record_access_logs (
    id integer NOT NULL,
    actor_id integer,
    actor_role text,
    actor_name text,
    record_type text NOT NULL,
    record_id integer,
    action text DEFAULT 'view'::text NOT NULL,
    detail text,
    ip text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: record_access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.record_access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: record_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.record_access_logs_id_seq OWNED BY public.record_access_logs.id;


--
-- Name: referral_slips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_slips (
    slip_id integer NOT NULL,
    slip_type character varying(20) DEFAULT 'teacher'::character varying NOT NULL,
    student_id integer NOT NULL,
    section character varying(50),
    teacher_name character varying(100),
    subject character varying(100),
    reason character varying(500) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    slip_date date NOT NULL,
    time_issued character varying(5) NOT NULL,
    recorded_by integer,
    archived_at timestamp(3) without time zone,
    archived_by integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: referral_slips_slip_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_slips_slip_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_slips_slip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_slips_slip_id_seq OWNED BY public.referral_slips.slip_id;


--
-- Name: student_health_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_health_forms (
    form_id integer NOT NULL,
    student_id integer NOT NULL,
    sex character varying(10),
    date_of_birth date,
    birthplace character varying(150),
    nationality character varying(50),
    religion character varying(50),
    address character varying(255),
    contact_number character varying(30),
    father_name character varying(100),
    father_occupation character varying(100),
    father_contact character varying(30),
    mother_name character varying(100),
    mother_occupation character varying(100),
    mother_contact character varying(30),
    guardian_name character varying(100),
    guardian_occupation character varying(100),
    guardian_contact character varying(30),
    hospital_choice character varying(150),
    hospital_address character varying(255),
    hospital_contact character varying(30),
    doctor_name character varying(100),
    emergency_person character varying(100),
    emergency_contact character varying(30),
    emergency_relation character varying(50),
    emergency_address character varying(255),
    past_history jsonb DEFAULT '{}'::jsonb NOT NULL,
    past_others text,
    family_history jsonb DEFAULT '{}'::jsonb NOT NULL,
    psychological jsonb DEFAULT '{}'::jsonb NOT NULL,
    other_medical jsonb DEFAULT '{}'::jsonb NOT NULL,
    review_of_system jsonb DEFAULT '{}'::jsonb NOT NULL,
    consent_name character varying(100),
    consent_relationship character varying(50),
    consent_date date,
    updated_by character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone
);


--
-- Name: student_health_forms_form_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_health_forms_form_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_health_forms_form_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_health_forms_form_id_seq OWNED BY public.student_health_forms.form_id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    student_id integer NOT NULL,
    student_number character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date_of_birth date,
    gender character varying(10),
    grade_level character varying(30),
    middle_name character varying(50),
    program character varying(100),
    archived_at timestamp(3) without time zone,
    archived_by integer,
    must_change_password boolean DEFAULT false NOT NULL,
    contact_number character varying(20),
    email character varying(120)
);


--
-- Name: students_student_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_student_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_student_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_student_id_seq OWNED BY public.students.student_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    session_minutes integer DEFAULT 60 NOT NULL,
    two_factor boolean DEFAULT false NOT NULL,
    full_name character varying(100),
    must_change_password boolean DEFAULT false NOT NULL,
    avatar text,
    avatar_url text
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: visitor_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_logs (
    visitor_id integer NOT NULL,
    visitor_name character varying(100) NOT NULL,
    purpose character varying(150) NOT NULL,
    relation character varying(50),
    visit_date date NOT NULL,
    time_in character varying(5) NOT NULL,
    time_out character varying(5),
    recorded_by integer,
    archived_at timestamp(3) without time zone,
    archived_by integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: visitor_logs_visitor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visitor_logs_visitor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visitor_logs_visitor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visitor_logs_visitor_id_seq OWNED BY public.visitor_logs.visitor_id;


--
-- Name: clinic_staff staff_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_staff ALTER COLUMN staff_id SET DEFAULT nextval('public.clinic_staff_staff_id_seq'::regclass);


--
-- Name: dental_health_forms form_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_health_forms ALTER COLUMN form_id SET DEFAULT nextval('public.dental_health_forms_form_id_seq'::regclass);


--
-- Name: dental_records dental_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_records ALTER COLUMN dental_id SET DEFAULT nextval('public.dental_records_dental_id_seq'::regclass);


--
-- Name: employee_health_forms form_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_health_forms ALTER COLUMN form_id SET DEFAULT nextval('public.employee_health_forms_form_id_seq'::regclass);


--
-- Name: employee_health_records record_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_health_records ALTER COLUMN record_id SET DEFAULT nextval('public.employee_health_records_record_id_seq'::regclass);


--
-- Name: employee_lab_exams lab_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lab_exams ALTER COLUMN lab_id SET DEFAULT nextval('public.employee_lab_exams_lab_id_seq'::regclass);


--
-- Name: employee_physical_exams exam_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_physical_exams ALTER COLUMN exam_id SET DEFAULT nextval('public.employee_physical_exams_exam_id_seq'::regclass);


--
-- Name: employees employee_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN employee_id SET DEFAULT nextval('public.employees_employee_id_seq'::regclass);


--
-- Name: health_case_reports case_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_case_reports ALTER COLUMN case_id SET DEFAULT nextval('public.health_case_reports_case_id_seq'::regclass);


--
-- Name: health_declarations declaration_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_declarations ALTER COLUMN declaration_id SET DEFAULT nextval('public.health_declarations_declaration_id_seq'::regclass);


--
-- Name: health_records record_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records ALTER COLUMN record_id SET DEFAULT nextval('public.health_records_record_id_seq'::regclass);


--
-- Name: identity_verifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_verifications ALTER COLUMN id SET DEFAULT nextval('public.identity_verifications_id_seq'::regclass);


--
-- Name: login_lockouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_lockouts ALTER COLUMN id SET DEFAULT nextval('public.login_lockouts_id_seq'::regclass);


--
-- Name: login_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN log_id SET DEFAULT nextval('public.login_logs_log_id_seq'::regclass);


--
-- Name: password_reset_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_requests ALTER COLUMN id SET DEFAULT nextval('public.password_reset_requests_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: portal_password_requests request_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_password_requests ALTER COLUMN request_id SET DEFAULT nextval('public.portal_password_requests_request_id_seq'::regclass);


--
-- Name: record_access_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access_logs ALTER COLUMN id SET DEFAULT nextval('public.record_access_logs_id_seq'::regclass);


--
-- Name: referral_slips slip_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_slips ALTER COLUMN slip_id SET DEFAULT nextval('public.referral_slips_slip_id_seq'::regclass);


--
-- Name: student_health_forms form_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_health_forms ALTER COLUMN form_id SET DEFAULT nextval('public.student_health_forms_form_id_seq'::regclass);


--
-- Name: students student_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN student_id SET DEFAULT nextval('public.students_student_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: visitor_logs visitor_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_logs ALTER COLUMN visitor_id SET DEFAULT nextval('public.visitor_logs_visitor_id_seq'::regclass);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: clinic_staff clinic_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_staff
    ADD CONSTRAINT clinic_staff_pkey PRIMARY KEY (staff_id);


--
-- Name: dental_health_forms dental_health_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_health_forms
    ADD CONSTRAINT dental_health_forms_pkey PRIMARY KEY (form_id);


--
-- Name: dental_health_forms dental_health_forms_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_health_forms
    ADD CONSTRAINT dental_health_forms_student_id_key UNIQUE (student_id);


--
-- Name: dental_records dental_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_records
    ADD CONSTRAINT dental_records_pkey PRIMARY KEY (dental_id);


--
-- Name: employee_health_forms employee_health_forms_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_health_forms
    ADD CONSTRAINT employee_health_forms_employee_id_key UNIQUE (employee_id);


--
-- Name: employee_health_forms employee_health_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_health_forms
    ADD CONSTRAINT employee_health_forms_pkey PRIMARY KEY (form_id);


--
-- Name: employee_health_records employee_health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_health_records
    ADD CONSTRAINT employee_health_records_pkey PRIMARY KEY (record_id);


--
-- Name: employee_lab_exams employee_lab_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lab_exams
    ADD CONSTRAINT employee_lab_exams_pkey PRIMARY KEY (lab_id);


--
-- Name: employee_physical_exams employee_physical_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_physical_exams
    ADD CONSTRAINT employee_physical_exams_pkey PRIMARY KEY (exam_id);


--
-- Name: employees employees_employee_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_number_key UNIQUE (employee_number);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (employee_id);


--
-- Name: health_case_reports health_case_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_case_reports
    ADD CONSTRAINT health_case_reports_pkey PRIMARY KEY (case_id);


--
-- Name: health_declarations health_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_declarations
    ADD CONSTRAINT health_declarations_pkey PRIMARY KEY (declaration_id);


--
-- Name: health_declarations health_declarations_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_declarations
    ADD CONSTRAINT health_declarations_student_id_key UNIQUE (student_id);


--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (record_id);


--
-- Name: identity_verifications identity_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_verifications
    ADD CONSTRAINT identity_verifications_pkey PRIMARY KEY (id);


--
-- Name: login_lockouts login_lockouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_lockouts
    ADD CONSTRAINT login_lockouts_pkey PRIMARY KEY (id);


--
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (log_id);


--
-- Name: password_reset_requests password_reset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: portal_password_requests portal_password_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_password_requests
    ADD CONSTRAINT portal_password_requests_pkey PRIMARY KEY (request_id);


--
-- Name: record_access_logs record_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access_logs
    ADD CONSTRAINT record_access_logs_pkey PRIMARY KEY (id);


--
-- Name: referral_slips referral_slips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_slips
    ADD CONSTRAINT referral_slips_pkey PRIMARY KEY (slip_id);


--
-- Name: student_health_forms student_health_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_health_forms
    ADD CONSTRAINT student_health_forms_pkey PRIMARY KEY (form_id);


--
-- Name: student_health_forms student_health_forms_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_health_forms
    ADD CONSTRAINT student_health_forms_student_id_key UNIQUE (student_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: visitor_logs visitor_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_logs
    ADD CONSTRAINT visitor_logs_pkey PRIMARY KEY (visitor_id);


--
-- Name: dental_records_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dental_records_student_id_idx ON public.dental_records USING btree (student_id);


--
-- Name: health_case_reports_case_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX health_case_reports_case_number_key ON public.health_case_reports USING btree (case_number);


--
-- Name: health_case_reports_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_case_reports_student_id_idx ON public.health_case_reports USING btree (student_id);


--
-- Name: health_records_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_student_id_idx ON public.health_records USING btree (student_id);


--
-- Name: idx_access_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_actor ON public.record_access_logs USING btree (actor_id);


--
-- Name: idx_access_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_created ON public.record_access_logs USING btree (created_at DESC);


--
-- Name: idx_access_logs_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_record ON public.record_access_logs USING btree (record_type, record_id);


--
-- Name: idx_emp_health_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_health_employee ON public.employee_health_records USING btree (employee_id);


--
-- Name: idx_emp_lab_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_lab_employee ON public.employee_lab_exams USING btree (employee_id);


--
-- Name: idx_emp_phys_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_phys_employee ON public.employee_physical_exams USING btree (employee_id);


--
-- Name: idx_identity_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_identity_subject ON public.identity_verifications USING btree (subject_type, subject_id);


--
-- Name: idx_lockout_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_lockout_key ON public.login_lockouts USING btree (scope, lock_key);


--
-- Name: login_logs_username_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_logs_username_idx ON public.login_logs USING btree (username);


--
-- Name: password_reset_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX password_reset_tokens_token_hash_key ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: referral_slips_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_slips_student_id_idx ON public.referral_slips USING btree (student_id);


--
-- Name: students_student_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX students_student_number_key ON public.students USING btree (student_number);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: visitor_logs_visit_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitor_logs_visit_date_idx ON public.visitor_logs USING btree (visit_date);


--
-- Name: dental_health_forms dental_health_forms_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_health_forms
    ADD CONSTRAINT dental_health_forms_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: dental_records dental_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_records
    ADD CONSTRAINT dental_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE;


--
-- Name: employee_health_forms employee_health_forms_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_health_forms
    ADD CONSTRAINT employee_health_forms_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE;


--
-- Name: employee_health_records employee_health_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_health_records
    ADD CONSTRAINT employee_health_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE;


--
-- Name: employee_lab_exams employee_lab_exams_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lab_exams
    ADD CONSTRAINT employee_lab_exams_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE;


--
-- Name: employee_physical_exams employee_physical_exams_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_physical_exams
    ADD CONSTRAINT employee_physical_exams_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE;


--
-- Name: health_declarations health_declarations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_declarations
    ADD CONSTRAINT health_declarations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: health_records health_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: portal_password_requests portal_password_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_password_requests
    ADD CONSTRAINT portal_password_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE;


--
-- Name: portal_password_requests portal_password_requests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_password_requests
    ADD CONSTRAINT portal_password_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: student_health_forms student_health_forms_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_health_forms
    ADD CONSTRAINT student_health_forms_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 6NZrd9ctryYFkV3C7YsJwasMIMTwjXJzFGZoZreNCcQH5l6suVmOU7xlI6rx0cY

