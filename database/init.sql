CREATE DATABASE IF NOT EXISTS attendance_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE attendance_db;

CREATE TABLE IF NOT EXISTS students (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  reg_number VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_reg_number (reg_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  attendance_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attendance_student_id (student_id),
  CONSTRAINT fk_attendance_student
    FOREIGN KEY (student_id) REFERENCES students (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;
