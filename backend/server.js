const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const port = Number(process.env.PORT || 5000);
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root123",
  database: process.env.DB_NAME || "attendance_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Student Attendance API is running" });
});

app.post("/students", async (req, res) => {
  const { name, reg_number: regNumber } = req.body || {};
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof regNumber !== "string" ||
    !regNumber.trim() ||
    regNumber.trim().length > 50
  ) {
    return res.status(400).json({
      error: "name (1-100 characters) and reg_number (1-50 characters) are required",
    });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO students (name, reg_number) VALUES (?, ?)",
      [name.trim(), regNumber.trim()]
    );
    return res.status(201).json({
      message: "Student registered successfully",
      id: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That registration number already exists" });
    }
    console.error("Could not register student:", error);
    return res.status(500).json({ error: "Could not register student" });
  }
});

app.get("/students", async (_req, res) => {
  try {
    const [students] = await pool.execute(
      "SELECT id, name, reg_number FROM students ORDER BY id"
    );
    return res.json(students);
  } catch (error) {
    console.error("Could not retrieve students:", error);
    return res.status(500).json({ error: "Could not retrieve students" });
  }
});

app.post("/attendance", async (req, res) => {
  const { student_id: studentId, status } = req.body || {};
  if (!Number.isInteger(studentId) || studentId < 1) {
    return res.status(400).json({ error: "student_id must be a positive integer" });
  }
  if (typeof status !== "string" || !status.trim() || status.trim().length > 20) {
    return res.status(400).json({
      error: "status is required and must be at most 20 characters",
    });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO attendance (student_id, status) VALUES (?, ?)",
      [studentId, status.trim()]
    );
    return res.status(201).json({
      message: "Attendance recorded successfully",
      id: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "student_id does not match a registered student" });
    }
    console.error("Could not record attendance:", error);
    return res.status(500).json({ error: "Could not record attendance" });
  }
});

app.get("/attendance", async (_req, res) => {
  try {
    const [records] = await pool.execute(
      `SELECT a.id, a.student_id, a.status, a.attendance_date,
              s.name, s.reg_number
       FROM attendance AS a
       INNER JOIN students AS s ON s.id = a.student_id
       ORDER BY a.attendance_date DESC, a.id DESC`
    );
    return res.json(records);
  } catch (error) {
    console.error("Could not retrieve attendance:", error);
    return res.status(500).json({ error: "Could not retrieve attendance records" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Request body must contain valid JSON" });
  }
  console.error("Unexpected request error:", error);
  return res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    app.listen(port, "0.0.0.0", () => {
      console.log(`Student Attendance API listening on port ${port}`);
    });
  } catch (error) {
    console.error("Could not connect to the MySQL database:", error.message);
    await pool.end();
    process.exitCode = 1;
  }
}

startServer();
