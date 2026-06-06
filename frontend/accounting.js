const API_BASE = "https://holidayparks-backend.whitedune-b42d430c.swedencentral.azurecontainerapps.io";

const ENTRA_USERS_URL = `${API_BASE}/api/entra-users`;
const AUDIT_API_URL = `${API_BASE}/api/audit-logs`;

const loginScreen = document.getElementById("loginScreen");
const dashboardContent = document.getElementById("dashboardContent");
const totalEmployees = document.getElementById("totalEmployees");
const activeEmployees = document.getElementById("activeEmployees");

let entraUsers = [];

function getEmployeeForm() {
  return document.getElementById("employeeForm");
}

function getAuditLogTable() {
  return document.getElementById("auditLogTable");
}

function showLoginScreen() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginScreen) loginScreen.style.display = "flex";
  if (dashboardContent) dashboardContent.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "none";

  const welcomeText = document.getElementById("welcomeText");
  if (welcomeText) welcomeText.textContent = "Welkom, gast";
}

function showDashboard() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginScreen) loginScreen.style.display = "none";
  if (dashboardContent) dashboardContent.style.display = "block";
  if (logoutBtn) logoutBtn.style.display = "inline-block";
}

async function loadAuditLogs() {
  try {
    const response = await fetch(AUDIT_API_URL, { credentials: "include" });
    const logs = await response.json();
    renderAuditLogs(logs);
  } catch (error) {
    console.error("Fout bij ophalen audit logs:", error);
  }
}

function renderAuditLogs(logs) {
  const auditLogTable = getAuditLogTable();
  if (!auditLogTable) return;

  auditLogTable.innerHTML = "";

  if (!logs || logs.length === 0) {
    auditLogTable.innerHTML = `
      <tr>
        <td colspan="4">Audit logs zijn tijdelijk uitgeschakeld.</td>
      </tr>
    `;
    return;
  }

  logs.forEach(log => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${log.action || "-"}</td>
      <td>${log.description || "-"}</td>
      <td>${log.performed_by || "-"}</td>
      <td>${log.created_at || "-"}</td>
    `;

    auditLogTable.appendChild(row);
  });
}

function updateStats() {
  if (totalEmployees) totalEmployees.textContent = entraUsers.length;
  if (activeEmployees) {
    activeEmployees.textContent = entraUsers.filter(user => user.accountEnabled !== false).length;
  }
}

const employeeForm = getEmployeeForm();

if (employeeForm) {
  employeeForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const employeeData = {
      name: document.getElementById("employeeName").value,
      email: document.getElementById("employeeEmail").value,
      function: document.getElementById("employeeFunction").value,
      department: document.getElementById("employeeDepartment").value,
      location: document.getElementById("employeeLocation").value
    };

    try {
      const response = await fetch(ENTRA_USERS_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(employeeData)
      });

      if (response.ok) {
        const result = await response.json();

        alert(
          `Gebruiker succesvol aangemaakt.\n\n` +
          `Tijdelijk wachtwoord:\n${result.temporaryPassword}`
        );

        employeeForm.reset();
        await loadEntraUsers();
      } else {
        const errorData = await response.json();
        console.error("API error:", errorData);

        const graphMessage =
          errorData?.error?.message ||
          errorData?.message ||
          errorData?.error ||
          "Onbekende fout";

        alert(`Medewerker kon niet worden opgeslagen.\n\n${graphMessage}`);
      }
    } catch (error) {
      console.error("Fout bij opslaan medewerker:", error);
      alert("Geen verbinding met de Flask API.");
    }
  });
}

async function deactivateEntraUser(userId) {
  if (!confirm("Weet je zeker dat je deze Entra ID gebruiker wilt deactiveren?")) {
    return;
  }

  try {
    const response = await fetch(`${ENTRA_USERS_URL}/${userId}/deactivate`, {
      method: "PATCH",
      credentials: "include"
    });

    if (response.ok) {
      alert("Entra ID gebruiker is gedeactiveerd.");
      await loadEntraUsers();
      await loadAuditLogs();
    } else {
      const errorData = await response.json();
      console.error("Graph error:", errorData);
      alert("Entra ID gebruiker kon niet worden gedeactiveerd.");
    }
  } catch (error) {
    console.error("Fout bij deactiveren Entra gebruiker:", error);
    alert("Geen verbinding met de Flask API.");
  }
}

async function editEntraUser(userId, displayName, jobTitle, department, officeLocation) {
  const newDisplayName = prompt("Naam:", displayName);
  if (newDisplayName === null) return;

  const newJobTitle = prompt("Functie:", jobTitle);
  if (newJobTitle === null) return;

  const newDepartment = prompt("Afdeling:", department);
  if (newDepartment === null) return;

  const newOfficeLocation = prompt("Locatie:", officeLocation);
  if (newOfficeLocation === null) return;

  try {
    const response = await fetch(`${ENTRA_USERS_URL}/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        displayName: newDisplayName,
        jobTitle: newJobTitle,
        department: newDepartment,
        officeLocation: newOfficeLocation
      })
    });

    if (response.ok) {
      alert("Entra ID gebruiker is bijgewerkt.");
      await loadEntraUsers();
    } else {
      const errorData = await response.json();
      console.error("Graph update error:", errorData);

      const graphMessage =
        errorData?.error?.message ||
        errorData?.message ||
        errorData?.error ||
        "Onbekende fout";

      alert(`Entra ID gebruiker kon niet worden bijgewerkt.\n\n${graphMessage}`);
    }
  } catch (error) {
    console.error("Fout bij bewerken Entra gebruiker:", error);
    alert("Geen verbinding met de Flask API.");
  }
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", function() {
    window.location.href = `${API_BASE}/logout`;
  });
}

async function loadCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/api/user`, {
      credentials: "include"
    });

    const data = await response.json();

    if (data.authenticated) {
      document.getElementById("welcomeText").textContent = `Welkom, ${data.user.name}`;
      showDashboard();
      await loadAuditLogs();
      await loadEntraUsers();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error("Fout bij ophalen gebruiker:", error);
    showLoginScreen();
  }
}

async function loadEntraUsers() {
  try {
    const response = await fetch(ENTRA_USERS_URL, {
      credentials: "include"
    });

    const users = await response.json();

    if (!response.ok) {
      console.error("Entra users error:", users);
      return;
    }

    entraUsers = users;
    updateStats();

    const table = document.getElementById("entraUserTable");
    if (!table) return;

    function renderEntraUsers(usersToRender) {
      table.innerHTML = "";

      usersToRender.forEach(user => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${user.displayName || "-"}</td>
          <td>${user.mail || user.userPrincipalName || "-"}</td>
          <td>${user.jobTitle || "-"}</td>
          <td>${user.department || "-"}</td>
          <td>${user.officeLocation || "-"}</td>
          <td>${user.id || "-"}</td>
          <td>
            <button
              class="edit-btn"
              onclick="editEntraUser(
                '${user.id}',
                '${user.displayName || ""}',
                '${user.jobTitle || ""}',
                '${user.department || ""}',
                '${user.officeLocation || ""}'
              )">
              Bewerken
            </button>
            <button
              class="delete-btn"
              onclick="deactivateEntraUser('${user.id}')">
              Deactiveren
            </button>
          </td>
        `;

        table.appendChild(row);
      });
    }

    renderEntraUsers(entraUsers);

    const nameFilter = document.getElementById("nameFilter");
    const departmentFilter = document.getElementById("departmentFilter");
    const functionFilter = document.getElementById("functionFilter");
    const locationFilter = document.getElementById("locationFilter");

    function applyEntraFilters() {
      const nameValue = (nameFilter?.value || "").toLowerCase();
      const departmentValue = (departmentFilter?.value || "").toLowerCase();
      const functionValue = (functionFilter?.value || "").toLowerCase();
      const locationValue = (locationFilter?.value || "").toLowerCase();

      const filteredUsers = entraUsers.filter(user => {
        const matchesName = (user.displayName || "").toLowerCase().includes(nameValue);
        const matchesDepartment = (user.department || "").toLowerCase().includes(departmentValue);
        const matchesFunction = (user.jobTitle || "").toLowerCase().includes(functionValue);
        const matchesLocation = (user.officeLocation || "").toLowerCase().includes(locationValue);

        return matchesName && matchesDepartment && matchesFunction && matchesLocation;
      });

      renderEntraUsers(filteredUsers);
    }

    [nameFilter, departmentFilter, functionFilter, locationFilter].forEach(input => {
      if (input) {
        input.addEventListener("input", applyEntraFilters);
      }
    });
  } catch (error) {
    console.error("Fout bij ophalen Entra gebruikers:", error);
  }
}

showLoginScreen();

const loginBtnElement = document.getElementById("loginBtn");

if (loginBtnElement) {
  loginBtnElement.addEventListener("click", function() {
    window.location.href = `${API_BASE}/login`;
  });
}

setTimeout(loadCurrentUser, 100);
