const API_BASE_URL = "http://localhost:5000";

const messageElement = document.getElementById("message");
const studentForm = document.getElementById("student-form");
const attendanceForm = document.getElementById("attendance-form");
const studentsTableBody = document.getElementById("students-table-body");
const attendanceTableBody = document.getElementById("attendance-table-body");

function showMessage(text, isError) {
  messageElement.textContent = text;
  messageElement.classList.toggle("error", isError);
  messageElement.hidden = false;
}

async function requestJson(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("The backend returned a response that was not valid JSON.");
    }
  }

  if (!response.ok) {
    const detail = data && (data.message || data.error);
    throw new Error(detail || `Request failed with status ${response.status}.`);
  }

  return data;
}

function getRows(payload, propertyName) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload[propertyName])) {
    return payload[propertyName];
  }

  throw new Error(`The backend response did not contain a ${propertyName} list.`);
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
  row.appendChild(cell);
}

function showEmptyRow(tableBody, columnCount, message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.className = "empty-state";
  cell.colSpan = columnCount;
  cell.textContent = message;
  row.appendChild(cell);
  tableBody.replaceChildren(row);
}

async function loadStudents() {
  const payload = await requestJson("/students");
  const students = getRows(payload, "students");
  studentsTableBody.replaceChildren();

  if (students.length === 0) {
    showEmptyRow(studentsTableBody, 3, "No students have been registered yet.");
    return;
  }

  students.forEach((student) => {
    const row = document.createElement("tr");
    addCell(row, student.student_id ?? student.id);
    addCell(row, student.name);
    addCell(row, student.reg_number);
    studentsTableBody.appendChild(row);
  });
}

async function loadAttendance() {
  const payload = await requestJson("/attendance");
  const records = getRows(payload, "attendance");
  attendanceTableBody.replaceChildren();

  if (records.length === 0) {
    showEmptyRow(attendanceTableBody, 4, "No attendance records have been recorded yet.");
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");
    addCell(row, record.attendance_id ?? record.id);
    addCell(row, record.student_id);
    addCell(row, record.status);
    addCell(row, record.recorded_at ?? record.attendance_date ?? record.date);
    attendanceTableBody.appendChild(row);
  });
}

async function runAction(action, successMessage) {
  try {
    await action();
    showMessage(successMessage, false);
  } catch (error) {
    showMessage(error.message || "Something went wrong. Please try again.", true);
  }
}

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("student-name").value.trim();
  const regNumber = document.getElementById("registration-number").value.trim();
  if (!name || !regNumber) {
    showMessage("Enter both the student's name and registration number.", true);
    return;
  }

  await runAction(async () => {
    await requestJson("/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, reg_number: regNumber })
    });
    studentForm.reset();
    try {
      await loadStudents();
    } catch (error) {
      throw new Error(`Student registered, but the student table could not be refreshed. ${error.message}`);
    }
  }, "Student registered successfully.");
});

attendanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const studentId = Number(document.getElementById("attendance-student-id").value);
  const status = document.getElementById("attendance-status").value;
  if (!Number.isInteger(studentId) || studentId < 1) {
    showMessage("Enter a valid student ID greater than zero.", true);
    return;
  }

  await runAction(async () => {
    await requestJson("/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, status })
    });
    attendanceForm.reset();
    try {
      await loadAttendance();
    } catch (error) {
      throw new Error(`Attendance recorded, but the attendance table could not be refreshed. ${error.message}`);
    }
  }, "Attendance recorded successfully.");
});

document.getElementById("load-students").addEventListener("click", () => {
  runAction(loadStudents, "Student list loaded successfully.");
});

document.getElementById("load-attendance").addEventListener("click", () => {
  runAction(loadAttendance, "Attendance records loaded successfully.");
});
