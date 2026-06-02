const translations = {
  nl: {
    welcome: "Welkom, HR Admin",
    logout: "Uitloggen",

    title: "Fonteyn HR Portal",
    subtitle: "Centraal HR systeem voor employee lifecycle management",

    totalEmployees: "Totaal medewerkers",
    activeEmployees: "Actieve medewerkers",
    countriesLocations: "Landen / locaties",
    departments: "Afdelingen",

    addEmployeeTitle: "Nieuwe medewerker toevoegen",
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

    title: "Fonteyn HR Portal",
    subtitle: "Central HR system for employee lifecycle management",

    totalEmployees: "Total employees",
    activeEmployees: "Active employees",
    countriesLocations: "Countries / locations",
    departments: "Departments",

    addEmployeeTitle: "Add new employee",
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
  document.getElementById("welcomeText").textContent = translations[lang].welcome;
  document.getElementById("logoutBtn").textContent = translations[lang].logout;

  document.querySelector(".topbar h1").textContent = translations[lang].title;
  document.querySelector(".topbar p").textContent = translations[lang].subtitle;

  document.querySelectorAll(".stat-card p")[0].textContent = translations[lang].totalEmployees;
  document.querySelectorAll(".stat-card p")[1].textContent = translations[lang].activeEmployees;
  document.querySelectorAll(".stat-card p")[2].textContent = translations[lang].countriesLocations;
  document.querySelectorAll(".stat-card p")[3].textContent = translations[lang].departments;

  document.querySelector(".form-container h2").textContent = translations[lang].addEmployeeTitle;
  document.querySelector(".form-container .section-text").textContent = translations[lang].addEmployeeText;
  document.querySelector("button[type='submit']").textContent = translations[lang].addButton;

  document.querySelectorAll(".table-section h2")[0].textContent = translations[lang].employeeOverviewTitle;
  document.querySelectorAll(".table-section p")[0].textContent = translations[lang].employeeOverviewText;

  document.getElementById("searchInput").placeholder = translations[lang].searchPlaceholder;

  const employeeHeaders = document.querySelectorAll(".table-section table")[0].querySelectorAll("th");
  employeeHeaders[0].textContent = translations[lang].tableName;
  employeeHeaders[1].textContent = translations[lang].tableFunction;
  employeeHeaders[2].textContent = translations[lang].tableDepartment;
  employeeHeaders[3].textContent = translations[lang].tableLocation;
  employeeHeaders[4].textContent = translations[lang].tableStatus;
  employeeHeaders[5].textContent = translations[lang].tableActions;

  document.querySelectorAll(".table-section h2")[1].textContent = translations[lang].iduTitle;
  document.querySelectorAll(".table-section p")[1].textContent = translations[lang].iduText;

  document.querySelectorAll(".action-card h3")[0].textContent = translations[lang].instroomTitle;
  document.querySelectorAll(".action-card p")[0].textContent = translations[lang].instroomText;

  document.querySelectorAll(".action-card h3")[1].textContent = translations[lang].doorstroomTitle;
  document.querySelectorAll(".action-card p")[1].textContent = translations[lang].doorstroomText;

  document.querySelectorAll(".action-card h3")[2].textContent = translations[lang].uitstroomTitle;
  document.querySelectorAll(".action-card p")[2].textContent = translations[lang].uitstroomText;

  document.querySelectorAll(".table-section h2")[2].textContent = translations[lang].auditTitle;
  document.querySelectorAll(".table-section p")[2].textContent = translations[lang].auditText;

  const auditHeaders = document.querySelectorAll(".table-section table")[1].querySelectorAll("th");
  auditHeaders[0].textContent = translations[lang].auditAction;
  auditHeaders[1].textContent = translations[lang].auditDescription;
  auditHeaders[2].textContent = translations[lang].auditPerformedBy;
  auditHeaders[3].textContent = translations[lang].auditTime;
}

languageSelect.addEventListener("change", function(){
  applyLanguage(languageSelect.value);
});

applyLanguage("nl");