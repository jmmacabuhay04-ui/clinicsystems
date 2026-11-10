   BEGIN;
   UPDATE health_records          SET complaint = 'Vital Signs' WHERE LOWER(TRIM(complaint)) = 'not specified';
   UPDATE employee_health_records SET complaint = 'Vital Signs' WHERE LOWER(TRIM(complaint)) = 'not specified';
   UPDATE health_case_reports     SET complaint = 'Vital Signs' WHERE LOWER(TRIM(complaint)) = 'not specified';
   COMMIT;