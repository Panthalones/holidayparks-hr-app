const statusFilter = document.getElementById("statusFilter");
const departmentFilter = document.getElementById("departmentFilter");
const locationFilter = document.getElementById("locationFilter");

function populateDepartments(){
  if (!departmentFilter) return;
  
  const departments = [...new Set(employees.map(emp => emp.department))];

  departmentFilter.innerHTML = '<option value="all">Alle afdelingen</option>';

  departments.forEach(department => {
    const option = document.createElement("option");
    option.value = department;
    option.textContent = department;
    departmentFilter.appendChild(option);
  });
}

function populateLocations(){
  if (!locationFilter) return;
  
  const locations = [...new Set(employees.map(emp => emp.location))];

  locationFilter.innerHTML = '<option value="all">Alle locaties</option>';

  locations.forEach(location => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    locationFilter.appendChild(option);
  });
}

function applyFilters(){
  const searchInput = document.getElementById("searchInput");
  if (!searchInput || !statusFilter || !departmentFilter || !locationFilter) return;
  
  const searchValue = searchInput.value.toLowerCase();
  const selectedStatus = statusFilter.value;
  const selectedDepartment = departmentFilter.value;
  const selectedLocation = locationFilter.value;

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchValue) ||
      employee.function_name.toLowerCase().includes(searchValue) ||
      employee.department.toLowerCase().includes(searchValue) ||
      employee.location.toLowerCase().includes(searchValue);

    const matchesStatus =
      selectedStatus === "all" || employee.status === selectedStatus;

    const matchesDepartment =
      selectedDepartment === "all" || employee.department === selectedDepartment;

    const matchesLocation =
      selectedLocation === "all" || employee.location === selectedLocation;

    return matchesSearch && matchesStatus && matchesDepartment && matchesLocation;
  });

  renderEmployees(filteredEmployees);
}

const searchInput = document.getElementById("searchInput");
if (searchInput) searchInput.addEventListener("input", applyFilters);
if (statusFilter) statusFilter.addEventListener("change", applyFilters);
if (departmentFilter) departmentFilter.addEventListener("change", applyFilters);
if (locationFilter) locationFilter.addEventListener("change", applyFilters);