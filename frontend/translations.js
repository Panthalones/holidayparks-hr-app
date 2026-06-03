const translations = {
  nl: {
    welcome: "Welkom, HR Admin",
    logout: "Uitloggen",
    loginTitle: "Login met Entra ID",
    loginText: "Je ziet eerst dit scherm voordat je toegang krijgt tot het personeelsdashboard.",
    loginButton: "Login met Entra ID",

    title: "Fonteyn HR Portal",
    subtitle: "Centraal HR systeem voor employee lifecycle management",

    totalEmployees: "Totaal medewerkers",
    activeEmployees: "Actieve medewerkers",
    countriesLocations: "Landen / locaties",
    departments: "Afdelingen",

    addEmployeeTitle: "Nieuwe medewerker toevoegen CI/CD test",
    addEmployeeText: "Gebruik dit formulier voor de instroomfase van het IDU-proces.",
    addButton: "Medewerker toevoegen",

    employeeOverviewTitle: "Medewerkers overzicht",
    employeeOverviewText: "Live data uit de MySQL database via de Flask API.",
    searchPlaceholder: "Zoek medewerker...",

    iduTitle: "IDU Proces",
    iduText: "Instroom, doorstroom en uitstroom van medewerkers.",

    instroomTitle: "Instroom",
    instroomText: "Nieuwe medewerker registreren in het HR systeem.",

    doorstroomTitle: "Doorstroom",
    doorstroomText: "Functie, afdeling of locatie van medewerker aanpassen.",

    uitstroomTitle: "Uitstroom",
    uitstroomText: "Medewerker deactiveren en historie behouden.",

    auditTitle: "Audit logs",
    auditText: "Overzicht van belangrijke HR acties binnen het systeem.",

    tableName: "Naam",
    tableFunction: "Functie",
    tableDepartment: "Afdeling",
    tableLocation: "Locatie",
    tableStatus: "Status",
    tableActions: "Acties",

    auditAction: "Actie",
    auditDescription: "Omschrijving",
    auditPerformedBy: "Uitgevoerd door",
    auditTime: "Tijdstip"
  },

  en: {
    welcome: "Welcome, HR Admin",
    logout: "Logout",
    loginTitle: "Login with Entra ID",
    loginText: "You will see this screen first before getting access to the employee dashboard.",
    loginButton: "Login with Entra ID",

    title: "Fonteyn HR Portal",
    subtitle: "Central HR system for employee lifecycle management",

    totalEmployees: "Total employees",
    activeEmployees: "Active employees",
    countriesLocations: "Countries / locations",
    departments: "Departments",

    addEmployeeTitle: "Add new employee CI/CD test",
    addEmployeeText: "Use this form for the joiner phase of the IDU process.",
    addButton: "Add employee",

    employeeOverviewTitle: "Employee overview",
    employeeOverviewText: "Live data from the MySQL database through the Flask API.",
    searchPlaceholder: "Search employee...",

    iduTitle: "IDU Process",
    iduText: "Joiner, mover and leaver process for employees.",

    instroomTitle: "Joiner",
    instroomText: "Register a new employee in the HR system.",

    doorstroomTitle: "Mover",
    doorstroomText: "Update the employee role, department or location.",

    uitstroomTitle: "Leaver",
    uitstroomText: "Deactivate employee and preserve history.",

    auditTitle: "Audit logs",
    auditText: "Overview of important HR actions inside the system.",

    tableName: "Name",
    tableFunction: "Function",
    tableDepartment: "Department",
    tableLocation: "Location",
    tableStatus: "Status",
    tableActions: "Actions",

    auditAction: "Action",
    auditDescription: "Description",
    auditPerformedBy: "Performed by",
    auditTime: "Timestamp"
  }
};

const languageSelect = document.getElementById("languageSelect");

function applyLanguage(lang){
  // Login screen
  const loginCardH2 = document.querySelector(".login-card h2");
  const loginCardP = document.querySelector(".login-card p");
  const loginBtn = document.getElementById("loginBtn");
  
  if (loginCardH2) loginCardH2.textContent = translations[lang].loginTitle;
  if (loginCardP) loginCardP.textContent = translations[lang].loginText;
  if (loginBtn) loginBtn.textContent = translations[lang].loginButton;

  // Header
  document.getElementById("welcomeText").textContent = translations[lang].welcome;
  document.getElementById("logoutBtn").textContent = translations[lang].logout;

  document.querySelector(".topbar h1").textContent = translations[lang].title;
  document.querySelector(".topbar p").textContent = translations[lang].subtitle;

  // Dashboard elements (only if visible)
  const statCards = document.querySelectorAll(".stat-card p");
  if (statCards.length >= 4) {
    statCards[0].textContent = translations[lang].totalEmployees;
    statCards[1].textContent = translations[lang].activeEmployees;
    statCards[2].textContent = translations[lang].countriesLocations;
    statCards[3].textContent = translations[lang].departments;
  }

  const formContainer = document.querySelector(".form-container");
  if (formContainer) {
    formContainer.querySelector("h2").textContent = translations[lang].addEmployeeTitle;
    formContainer.querySelector(".section-text").textContent = translations[lang].addEmployeeText;
    formContainer.querySelector("button[type='submit']").textContent = translations[lang].addButton;
  }

  const tables = document.querySelectorAll(".table-section table");
  if (tables.length >= 1) {
    const employeeHeaders = tables[0].querySelectorAll("th");
    if (employeeHeaders.length >= 6) {
      employeeHeaders[0].textContent = translations[lang].tableName;
      employeeHeaders[1].textContent = translations[lang].tableFunction;
      employeeHeaders[2].textContent = translations[lang].tableDepartment;
      employeeHeaders[3].textContent = translations[lang].tableLocation;
      employeeHeaders[4].textContent = translations[lang].tableStatus;
      employeeHeaders[5].textContent = translations[lang].tableActions;
    }
  }

  const tableSectionHeadings = document.querySelectorAll(".table-section h2");
  if (tableSectionHeadings.length >= 3) {
    tableSectionHeadings[0].textContent = translations[lang].employeeOverviewTitle;
    tableSectionHeadings[1].textContent = translations[lang].iduTitle;
    tableSectionHeadings[2].textContent = translations[lang].auditTitle;
  }

  const tableSectionParagraphs = document.querySelectorAll(".table-section p");
  if (tableSectionParagraphs.length >= 3) {
    tableSectionParagraphs[0].textContent = translations[lang].employeeOverviewText;
    tableSectionParagraphs[1].textContent = translations[lang].iduText;
    tableSectionParagraphs[2].textContent = translations[lang].auditText;
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.placeholder = translations[lang].searchPlaceholder;

  const actionCards = document.querySelectorAll(".action-card");
  if (actionCards.length >= 3) {
    actionCards[0].querySelector("h3").textContent = translations[lang].instroomTitle;
    actionCards[0].querySelector("p").textContent = translations[lang].instroomText;
    
    actionCards[1].querySelector("h3").textContent = translations[lang].doorstroomTitle;
    actionCards[1].querySelector("p").textContent = translations[lang].doorstroomText;
    
    actionCards[2].querySelector("h3").textContent = translations[lang].uitstroomTitle;
    actionCards[2].querySelector("p").textContent = translations[lang].uitstroomText;
  }

  if (tables.length >= 2) {
    const auditHeaders = tables[1].querySelectorAll("th");
    if (auditHeaders.length >= 4) {
      auditHeaders[0].textContent = translations[lang].auditAction;
      auditHeaders[1].textContent = translations[lang].auditDescription;
      auditHeaders[2].textContent = translations[lang].auditPerformedBy;
      auditHeaders[3].textContent = translations[lang].auditTime;
    }
  }
}

languageSelect.addEventListener("change", function(){
  applyLanguage(languageSelect.value);
});

applyLanguage("nl");