const API_BASE = "http://localhost:5001";

const API_URL = `${API_BASE}/api/employees`;
const AUDIT_API_URL = `${API_BASE}/api/audit-logs`;

const employeeForm = document.getElementById("employeeForm");
const employeeTable = document.getElementById("employeeTable");
const auditLogTable = document.getElementById("auditLogTable");
const searchInput = document.getElementById("searchInput");

const totalEmployees = document.getElementById("totalEmployees");
const activeEmployees = document.getElementById("activeEmployees");

let employees = [];
let editingEmployeeId = null;

async function loadEmployees(){
  try{
    const response = await fetch(API_URL);
    employees = await response.json();

    renderEmployees(employees);
    populateDepartments();
    populateLocations();
    updateStats();

  }catch(error){
    console.error("Fout bij ophalen medewerkers:", error);

    employeeTable.innerHTML = `
      <tr>
        <td colspan="6">Kan medewerkers niet laden. Controleer of de Flask API draait.</td>
      </tr>
    `;
  }
}

async function loadAuditLogs(){
  try{
    const response = await fetch(AUDIT_API_URL);

    if(!response.ok){
      throw new Error("Audit API error");
    }

    const logs = await response.json();
    renderAuditLogs(logs);

  }catch(error){
    console.error("Fout bij ophalen audit logs:", error);

    auditLogTable.innerHTML = `
      <tr>
        <td colspan="4">Kan audit logs niet laden. Controleer of de Flask API draait.</td>
      </tr>
    `;
  }
}

function renderAuditLogs(logs){
  auditLogTable.innerHTML = "";

  logs.forEach(log => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${log.action}</td>
      <td>${log.description}</td>
      <td>${log.performed_by}</td>
      <td>${log.created_at}</td>
    `;

    auditLogTable.appendChild(row);
  });
}

function renderEmployees(data){
  employeeTable.innerHTML = "";

  data.forEach(employee => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${employee.name}</td>
      <td>${employee.function_name}</td>
      <td>${employee.department}</td>
      <td>${employee.location}</td>

      <td>
        <span class="${employee.status === 'Actief' ? 'active' : 'inactive'}">
          ${employee.status}
        </span>
      </td>

      <td>
        <button
          class="edit-btn"
          onclick="editEmployee(
            ${employee.id},
            '${employee.name}',
            '${employee.function_name}',
            '${employee.department}',
            '${employee.location}',
            '${employee.status}'
          )">
          Edit
        </button>

        <button
          class="deactivate-btn"
          onclick="deactivateEmployee(${employee.id})">
          Deactiveer
        </button>
      </td>
    `;

    employeeTable.appendChild(row);
  });
}

function editEmployee(id, name, functionName, department, location, status){
  editingEmployeeId = id;

  document.getElementById("employeeName").value = name;
  document.getElementById("employeeFunction").value = functionName;
  document.getElementById("employeeDepartment").value = department;
  document.getElementById("employeeLocation").value = location;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function updateStats(){
  totalEmployees.textContent = employees.length;
  activeEmployees.textContent = employees.filter(emp => emp.status === "Actief").length;
}

employeeForm.addEventListener("submit", async function(e){
  e.preventDefault();

  const employeeData = {
    name: document.getElementById("employeeName").value,
    function: document.getElementById("employeeFunction").value,
    department: document.getElementById("employeeDepartment").value,
    location: document.getElementById("employeeLocation").value
  };

  if(editingEmployeeId){
    employeeData.status = "Actief";
  }

  try{
    const response = await fetch(
      editingEmployeeId ? `${API_URL}/${editingEmployeeId}` : API_URL,
      {
        method: editingEmployeeId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(employeeData)
      }
    );

    if(response.ok){
      employeeForm.reset();
      editingEmployeeId = null;

      loadEmployees();
      loadAuditLogs();

    }else{
      const errorData = await response.json();
      console.error("API error:", errorData);
      alert("Medewerker kon niet worden opgeslagen.");
    }

  }catch(error){
    console.error("Fout bij opslaan medewerker:", error);
    alert("Geen verbinding met de Flask API.");
  }
});

async function deactivateEmployee(id){
  if(!confirm("Weet je zeker dat je deze medewerker wilt deactiveren?")){
    return;
  }

  try{
    const response = await fetch(`${API_URL}/${id}/deactivate`, {
      method: "PUT"
    });

    if(response.ok){
      loadEmployees();
      loadAuditLogs();
    }else{
      alert("Medewerker kon niet worden gedeactiveerd.");
    }

  }catch(error){
    console.error("Fout bij deactiveren medewerker:", error);
    alert("Geen verbinding met de Flask API.");
  }
}

document.getElementById("logoutBtn").addEventListener("click", function(){
  window.location.href = "http://localhost:5001/logout";
});

async function loadCurrentUser() {
  try {
    const response = await fetch(
      `${API_BASE}/api/user`,
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    if (data.authenticated) {
      document.getElementById("welcomeText").textContent =
        `Welkom, ${data.user.name}`;
    } else {
      window.location.href = "http://localhost:5001/login";
    }

  } catch (error) {
    console.error("Fout bij ophalen gebruiker:", error);
    window.location.href = "http://localhost:5001/login";
  }
}

loadCurrentUser();

loadEmployees();
loadAuditLogs();