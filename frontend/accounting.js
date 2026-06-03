const API_BASE = "https://holidayparks-backend.whitedune-b42d430c.swedencentral.azurecontainerapps.io"

const API_URL = `${API_BASE}/api/employees`;
const AUDIT_API_URL = `${API_BASE}/api/audit-logs`;

const loginScreen = document.getElementById("loginScreen");
const dashboardContent = document.getElementById("dashboardContent");

const totalEmployees = document.getElementById("totalEmployees");
const activeEmployees = document.getElementById("activeEmployees");

let employees = [];
let editingEmployeeId = null;

function getEmployeeForm() {
  return document.getElementById("employeeForm");
}

function getEmployeeTable() {
  return document.getElementById("employeeTable");
}

function getAuditLogTable() {
  return document.getElementById("auditLogTable");
}

function getSearchInput() {
  return document.getElementById("searchInput");
}

function showLoginScreen() {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardContent = document.getElementById("dashboardContent");
  const logoutBtn = document.getElementById("logoutBtn");
  
  if (loginScreen) {
    loginScreen.style.display = "flex";
  }
  if (dashboardContent) {
    dashboardContent.style.display = "none";
  }
  if (logoutBtn) {
    logoutBtn.style.display = "none";
  }
  document.getElementById("welcomeText").textContent = "Welkom, gast";
}

function showDashboard() {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardContent = document.getElementById("dashboardContent");
  const logoutBtn = document.getElementById("logoutBtn");
  
  if (loginScreen) {
    loginScreen.style.display = "none";
  }
  if (dashboardContent) {
    dashboardContent.style.display = "block";
  }
  if (logoutBtn) {
    logoutBtn.style.display = "inline-block";
  }
}

async function loadEmployees(){
  try{
    const response = await fetch(API_URL, { credentials: "include" });
    employees = await response.json();

    renderEmployees(employees);
    populateDepartments();
    populateLocations();
    updateStats();

  }catch(error){
    console.error("Fout bij ophalen medewerkers:", error);
    const employeeTable = getEmployeeTable();
    if (employeeTable) {
      employeeTable.innerHTML = `
        <tr>
          <td colspan="6">Kan medewerkers niet laden. Controleer of de Flask API draait.</td>
        </tr>
      `;
    }
  }
}

async function loadAuditLogs(){
  try{
    const response = await fetch(AUDIT_API_URL, { credentials: "include" });

    if(!response.ok){
      throw new Error("Audit API error");
    }

    const logs = await response.json();
    renderAuditLogs(logs);

  }catch(error){
    console.error("Fout bij ophalen audit logs:", error);
    const auditLogTable = getAuditLogTable();
    if (auditLogTable) {
      auditLogTable.innerHTML = `
        <tr>
          <td colspan="4">Kan audit logs niet laden. Controleer of de Flask API draait.</td>
        </tr>
      `;
    }
  }
}

function renderAuditLogs(logs){
  const auditLogTable = getAuditLogTable();
  if (!auditLogTable) return;
  
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
  const employeeTable = getEmployeeTable();
  if (!employeeTable) return;
  
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
          class="delete-btn"
          onclick="deleteEmployee(${employee.id})">
          Verwijder
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
  const total = document.getElementById("totalEmployees");
  const active = document.getElementById("activeEmployees");
  if (total) total.textContent = employees.length;
  if (active) active.textContent = employees.filter(emp => emp.status === "Actief").length;
}

const employeeForm = getEmployeeForm();
if (employeeForm) {
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
          credentials: "include",
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
}

async function deactivateEmployee(id){
  if(!confirm("Weet je zeker dat je deze medewerker wilt deactiveren?")){
    return;
  }

  try{
    const response = await fetch(`${API_URL}/${id}/deactivate`, {
      method: "PUT",
      credentials: "include"
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

async function deleteEmployee(id){
  if(!confirm("Weet je zeker dat je deze medewerker permanent wilt verwijderen?")){
    return;
  }

  try{
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      credentials: "include"
    });

    if(response.ok){
      loadEmployees();
      loadAuditLogs();
    }else{
      alert("Medewerker kon niet worden verwijderd.");
    }

  }catch(error){
    console.error("Fout bij verwijderen medewerker:", error);
    alert("Geen verbinding met de Flask API.");
  }
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function(){
    window.location.href = `${API_BASE}/logout`;
  });
}

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
      showDashboard();
      loadEmployees();
      loadAuditLogs();
    } else {
      console.log("Gebruiker niet geauthenticeerd");
      showLoginScreen();
    }

  } catch (error) {
    console.error("Fout bij ophalen gebruiker:", error);
    showLoginScreen();
  }
}

// Zorg ervoor dat het login-scherm zichtbaar is op het moment van laden
showLoginScreen();

// Voeg event listener toe aan login knop
const loginBtnElement = document.getElementById("loginBtn");
if (loginBtnElement) {
  loginBtnElement.addEventListener("click", function() {
    window.location.href = `${API_BASE}/login`;
  });
}

// Controleer authenticatie na een kleine vertraging om zeker te zijn dat DOM klaar is
setTimeout(loadCurrentUser, 100);

