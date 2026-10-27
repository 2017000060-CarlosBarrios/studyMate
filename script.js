
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Guardar y recuperar información del navegador
  function readData(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      showToast("No se pudo guardar la información.");
    }
  }

  // Mensajes emergentes
  function showToast(message) {
    const container = $("#toastContainer");

    if (!container) {
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = "study-toast";
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // Evitar que el contenido escrito se interprete como HTML
  function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  // Fecha actual
  const dateElement = $("#currentDate");

  if (dateElement) {
    dateElement.innerHTML =
      '<i class="fa-regular fa-calendar"></i> ' +
      new Date().toLocaleDateString("es-GT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
  }

  // Menú lateral
  const sidebar = $("#sidebar");

  $("#menuButton")?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
  });

  // Navegación entre secciones
  $$(".nav-link, .inspiration-link").forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");

      if (href?.startsWith("#")) {
        const section = $(href);

        if (section) {
          event.preventDefault();
          section.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

          history.replaceState(null, "", href);

          $$(".nav-link").forEach(item => {
            item.classList.toggle(
              "active",
              item.getAttribute("href") === href
            );
          });
        }
      }

      sidebar?.classList.remove("open");
    });
  });

  // =========================
  // SISTEMA DE TAREAS
  // =========================

  const originalTasks = $$("#taskList .task-item").map((item, index) => ({
    id: "initial-" + index,
    title: $("h3", item)?.textContent.trim() || "Tarea",
    subject: "General",
    date: "",
    priority: item.querySelector(".priority")?.classList.contains("high")
      ? "high"
      : item.querySelector(".priority")?.classList.contains("low")
        ? "low"
        : "medium",
    completed: item.dataset.status === "completed"
  }));

  let tasks = readData("studymate_tasks", null);

  if (!Array.isArray(tasks)) {
    tasks = originalTasks;
  }

  let currentFilter = "all";

  const priorityNames = {
    high: "Alta",
    medium: "Media",
    low: "Baja"
  };

  function renderTasks() {
    const list = $("#taskList");
    if (!list) return;

    const search = ($("#globalSearch")?.value || "")
      .trim()
      .toLowerCase();

    const filtered = tasks.filter(task => {
      const matchesFilter =
        currentFilter === "all" ||
        (currentFilter === "pending" && !task.completed) ||
        (currentFilter === "completed" && task.completed);

      const matchesSearch =
        `${task.title} ${task.subject} ${task.date}`
          .toLowerCase()
          .includes(search);

      return matchesFilter && matchesSearch;
    });

    list.innerHTML = filtered.map(task => `
      <article class="task-item"
        data-status="${task.completed ? "completed" : "pending"}">

        <button class="task-check"
          type="button"
          data-action="toggle"
          data-id="${escapeHTML(task.id)}"
          aria-label="Cambiar estado de tarea">
          <i class="fa-solid fa-check"></i>
        </button>

        <div class="task-details">
          <h3>${escapeHTML(task.title)}</h3>
          <p>
            <i class="fa-solid fa-book-open"></i>
            <span>${escapeHTML(task.subject || "General")}
            ${task.date ? " · Entrega: " + escapeHTML(task.date) : ""}
            </span>
          </p>
        </div>

        <span class="priority ${escapeHTML(task.priority)}">
          ${priorityNames[task.priority] || "Media"}
        </span>

        <button type="button"
          class="task-delete"
          data-action="delete"
          data-id="${escapeHTML(task.id)}"
          aria-label="Eliminar tarea"
          title="Eliminar tarea">
          <i class="fa-solid fa-trash" aria-hidden="true"></i>
        </button>
      </article>
    `).join("");

    $("#taskEmpty")?.classList.toggle("hidden", filtered.length > 0);

    const pending = tasks.filter(task => !task.completed).length;
    const completed = tasks.filter(task => task.completed).length;

    if ($("#pendingCount")) {
      $("#pendingCount").textContent = pending;
    }

    if ($("#completedCount")) {
      $("#completedCount").textContent = completed;
    }

    const badge = $(".nav-link[href='#tareas'] .nav-badge");
    if (badge) badge.textContent = pending;

    $$("#taskFilters [data-filter]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.filter === currentFilter
      );
    });

    saveData("studymate_tasks", tasks);
    renderCalendar();
  }

  // Filtros
  $("#taskFilters")?.addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    currentFilter = button.dataset.filter;
    renderTasks();
  });

  // Completar y eliminar tareas
  $("#taskList")?.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const task = tasks.find(
      item => String(item.id) === button.dataset.id
    );

    if (!task) return;

    if (button.dataset.action === "toggle") {
      task.completed = !task.completed;

      showToast(
        task.completed
          ? "¡Tarea completada!"
          : "Tarea marcada como pendiente."
      );
    }

    if (button.dataset.action === "delete") {
      if (!confirm("¿Quieres eliminar esta tarea?")) return;

      tasks = tasks.filter(
        item => String(item.id) !== button.dataset.id
      );

      showToast("Tarea eliminada.");
    }

    saveData("studymate_tasks", tasks);
  renderTasks();
  renderCalendar();
  });

  // Ventanas emergentes
  const taskModal = $("#taskModal");
  const subjectModal = $("#subjectModal");

  function openModal(modal) {
    if (!modal) return;

    modal.classList.remove("hidden");

    const input = $("input, select, textarea", modal);
    setTimeout(() => input?.focus(), 50);
  }

  function closeModal(modal) {
    modal?.classList.add("hidden");
  }

  $("#addTaskButton")?.addEventListener("click", () => {
    openModal(taskModal);
  });

  $("#closeTaskModal")?.addEventListener("click", () => {
    closeModal(taskModal);
  });

  $("#cancelTask")?.addEventListener("click", () => {
    closeModal(taskModal);
  });

  taskModal?.addEventListener("click", event => {
    if (event.target === taskModal) closeModal(taskModal);
  });

  // Crear tareas
  $("#taskForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const title = $("#taskTitle")?.value.trim();
    if (!title) return;

    tasks.unshift({
      id: "task-" + Date.now() + "-" +
        Math.random().toString(16).slice(2),
      title,
      subject: $("#taskSubject")?.value || "General",
      date: $("#taskDate")?.value || "",
      priority: $("#taskPriority")?.value || "medium",
      completed: false
    });

    $("#taskForm").reset();
    closeModal(taskModal);

    currentFilter = "all";
    renderTasks();
    showToast("¡Nueva tarea creada!");
  });

  // =========================
  // MATERIAS
  // =========================

  const initialSubjects = [
    {
      name: "Matemáticas",
      description: "Números, lógica y resolución de problemas.",
      progress: 65,
      color: "blue"
    },
    {
      name: "Inglés",
      description: "Vocabulario, gramática y comunicación.",
      progress: 80,
      color: "purple"
    },
    {
      name: "Ciencias",
      description: "Descubre, experimenta y aprende.",
      progress: 45,
      color: "cyan"
    },
    {
      name: "Programación",
      description: "Ideas, algoritmos y creación digital.",
      progress: 55,
      color: "pink"
    }
  ];

  let subjects = readData("studymate_subjects", null);

  if (!Array.isArray(subjects)) {
    subjects = initialSubjects;
  }

  function renderSubjects() {
    const grid = $("#subjectsGrid");
    if (!grid) return;

    grid.innerHTML = subjects.map((subject, index) => `
      <article class="subject-card subject-${escapeHTML(subject.color)}">
        <div class="subject-card-top">
          <div class="subject-icon">
            <i class="fa-solid fa-book-open"></i>
          </div>
          <span class="subject-symbol">
            ${String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <h3>${escapeHTML(subject.name)}</h3>
        <p>${escapeHTML(subject.description)}</p>

        <div class="subject-progress-label">
          <span>Progreso</span>
          <strong>${subject.progress}%</strong>
        </div>

        <div class="progress-track">
          <div class="progress-fill"
            style="width:${subject.progress}%"></div>
        </div>

        <button type="button"
          data-progress="${index}">
          Actualizar progreso
        </button>
      </article>
    `).join("");

    if ($("#subjectCount")) {
      $("#subjectCount").textContent = subjects.length;
    }

    saveData("studymate_subjects", subjects);

    const select = $("#taskSubject");
    if (select) {
      const previous = select.value;
      const names = ["General", ...subjects.map(s => s.name)];

      select.innerHTML = names.map(name =>
        `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`
      ).join("");

      if (names.includes(previous)) select.value = previous;
    }
  }

  $("#addSubjectButton")?.addEventListener("click", () => {
    openModal(subjectModal);
  });

  $("#closeSubjectModal")?.addEventListener("click", () => {
    closeModal(subjectModal);
  });

  $("#cancelSubject")?.addEventListener("click", () => {
    closeModal(subjectModal);
  });

  subjectModal?.addEventListener("click", event => {
    if (event.target === subjectModal) closeModal(subjectModal);
  });

  // Crear materia
  $("#subjectForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("#subjectName")?.value.trim();
    if (!name) return;

    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      showToast("Esa materia ya existe.");
      return;
    }

    subjects.push({
      name,
      description: $("#subjectDescription")?.value.trim() ||
        "Mi nueva materia.",
      progress: Number($("#subjectProgress")?.value || 0),
      color: ["blue", "purple", "cyan", "pink"][subjects.length % 4]
    });

    $("#subjectForm").reset();
    closeModal(subjectModal);
    renderSubjects();
    showToast("¡Materia agregada!");
  });

  // Actualizar progreso de materia
  $("#subjectsGrid")?.addEventListener("click", event => {
    const button = event.target.closest("[data-progress]");
    if (!button) return;

    const subject = subjects[Number(button.dataset.progress)];
    if (!subject) return;

    const value = prompt(
      `Escribe el progreso de ${subject.name} entre 0 y 100:`,
      subject.progress
    );

    if (value === null) return;

    const progress = Number(value);

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      showToast("Usa un número entre 0 y 100.");
      return;
    }

    subject.progress = Math.round(progress);
    renderSubjects();
    showToast("Progreso actualizado.");
  });

  // =========================
  // BUSCADOR
  // =========================

  $("#globalSearch")?.addEventListener("input", () => {
    renderTasks();

    const query = $("#globalSearch").value.trim().toLowerCase();

    $$("#subjectsGrid .subject-card").forEach(card => {
      card.hidden = query !== "" &&
        !card.textContent.toLowerCase().includes(query);
    });
  });

  // =========================
  // TEMPORIZADOR POMODORO
  // =========================

  let selectedMinutes = 25;
  let remainingSeconds = 25 * 60;
  let timerInterval = null;
  let running = false;
  let sessionStart = null;
  let studySeconds = 0;

  function updateTimer() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    if ($("#timerDisplay")) {
      $("#timerDisplay").textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    if ($("#startTimer")) {
      $("#startTimer").innerHTML = running
        ? '<i class="fa-solid fa-pause"></i> Pausar'
        : '<i class="fa-solid fa-play"></i> Comenzar';
    }

    if ($("#timerSubtitle")) {
      $("#timerSubtitle").textContent = running
        ? "Sigue así, vas muy bien."
        : "Tu concentración comienza ahora";
    }
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    running = false;

    if (sessionStart !== null) {
      studySeconds += Math.max(
        0,
        Math.floor((Date.now() - sessionStart) / 1000)
      );

      sessionStart = null;

      if ($("#studyMinutes")) {
        $("#studyMinutes").textContent = Math.floor(studySeconds / 60);
      }
    }

    updateTimer();
  }

  function finishTimer() {
    stopTimer();
    remainingSeconds = 0;
    updateTimer();

    if ($("#timerSubtitle")) {
      $("#timerSubtitle").textContent = "¡Sesión completada! Buen trabajo.";
    }

    showToast("¡Terminó el tiempo!");
  }

  $$("#timerModes [data-minutes]").forEach(button => {
    button.addEventListener("click", () => {
      stopTimer();

      selectedMinutes = Number(button.dataset.minutes) || 25;
      remainingSeconds = selectedMinutes * 60;

      $$("#timerModes [data-minutes]").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      if ($("#timerLabel")) {
        $("#timerLabel").textContent =
          (button.dataset.label || "Estudio").toUpperCase();
      }

      updateTimer();
    });
  });

  $("#startTimer")?.addEventListener("click", () => {
    if (running) {
      stopTimer();
      return;
    }

    if (remainingSeconds <= 0) {
      remainingSeconds = selectedMinutes * 60;
    }

    running = true;
    sessionStart = Date.now();
    updateTimer();

    timerInterval = setInterval(() => {
      remainingSeconds--;
      updateTimer();

      if (remainingSeconds <= 0) {
        finishTimer();
      }
    }, 1000);
  });

  $("#resetTimer")?.addEventListener("click", () => {
    stopTimer();
    remainingSeconds = selectedMinutes * 60;
    updateTimer();
    showToast("Temporizador reiniciado.");
  });

  $("#skipTimer")?.addEventListener("click", () => {
    stopTimer();
    remainingSeconds = selectedMinutes * 60;
    updateTimer();
    showToast("Temporizador preparado para otra sesión.");
  });

  // =========================
  // CALENDARIO
  // =========================

  let calendarDate = new Date();

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  function renderCalendar() {
    const grid = $("#calendarGrid");
    const heading = $("#calendarMonth");

    if (!grid || !heading) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    heading.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const offset = (firstDay + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const weekdays = ["L", "M", "X", "J", "V", "S", "D"];

    let html = weekdays.map(day =>
      `<span class="calendar-weekday">${day}</span>`
    ).join("");

    for (let i = 0; i < offset; i++) {
      html += '<span class="calendar-day calendar-blank"></span>';
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateKey =
        `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      const hasTask = tasks.some(task =>
        task.date === dateKey && !task.completed
      );

      html += `
        <button type="button"
          class="calendar-day ${isToday ? "today" : ""} ${hasTask ? "has-event" : ""}"
          data-date="${dateKey}">
          ${day}
        </button>
      `;
    }

    grid.innerHTML = html;
  }

  $("#prevMonth")?.addEventListener("click", () => {
    calendarDate = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth() - 1,
      1
    );
    renderCalendar();
  });

  $("#nextMonth")?.addEventListener("click", () => {
    calendarDate = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth() + 1,
      1
    );
    renderCalendar();
  });

  $("#calendarGrid")?.addEventListener("click", event => {
    const button = event.target.closest("[data-date]");
    if (!button) return;

    const dueTasks = tasks.filter(task =>
      task.date === button.dataset.date && !task.completed
    );

    showToast(
      dueTasks.length
        ? "Entregas: " + dueTasks.map(task => task.title).join(", ")
        : "No tienes entregas registradas para este día."
    );
  });

  // =========================
  // GUARDAR NOTAS
  // =========================

  const feedbackForm = $("#feedbackForm");
  const feedbackStatus = $("#feedbackStatus");

  const notes = readData("studymate_notes", []);

  if (feedbackStatus && notes.length) {
    feedbackStatus.textContent =
      `Tienes ${notes.length} nota(s) guardada(s) en este navegador.`;
  }

  feedbackForm?.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("#studentName")?.value.trim() || "Estudiante";
    const type = $("#feedbackType")?.value || "idea";
    const message = $("#feedbackMessage")?.value.trim();

    if (!message) {
      showToast("Escribe una nota antes de guardarla.");
      $("#feedbackMessage")?.focus();
      return;
    }

    const savedNotes = readData("studymate_notes", []);

    savedNotes.push({
      name,
      type,
      message,
      date: new Date().toLocaleString("es-GT")
    });

    saveData("studymate_notes", savedNotes);

    if (feedbackStatus) {
      feedbackStatus.textContent =
        `¡Nota guardada! Tienes ${savedNotes.length} nota(s).`;
    }

    feedbackForm.reset();
    showToast("¡Tu nota se guardó correctamente!");
  });

  // Notificaciones
  $("#notificationButton")?.addEventListener("click", () => {
    const pending = tasks.filter(task => !task.completed).length;

    showToast(
      pending
        ? `Tienes ${pending} tarea(s) pendiente(s).`
        : "¡No tienes tareas pendientes!"
    );
  });

  // Cerrar ventanas con Escape
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal(taskModal);
      closeModal(subjectModal);
      sidebar?.classList.remove("open");
    }
  });

  // Iniciar la página
  renderTasks();
  renderSubjects();
  renderCalendar();
  updateTimer();
});

/* ===== FUNCIONES DE MI ESPACIO CREATIVO ===== */

(() => {
  "use strict";

  const root = document.getElementById("creativeWorkspace");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const $ = (selector) => root.querySelector(selector);

  const form = $("#creativeForm");
  const titleInput = $("#creativeTitle");
  const categoryInput = $("#creativeCategory");
  const contentInput = $("#creativeContent");
  const colorInput = $("#creativeColor");
  const searchInput = $("#creativeSearch");
  const filterInput = $("#creativeFilter");
  const notesContainer = $("#creativeNotes");
  const countLabel = $("#creativeCount");
  const statusLabel = $("#creativeStatus");
  const saveButton = $("#creativeSave");
  const cancelButton = $("#creativeCancel");
  const formTitle = $("#creativeFormTitle");

  const STORAGE_KEY = "studymate_creative_notes_v1";
  const categories = ["Idea", "Apuntes", "Proyecto", "Diario", "Personal"];
  const colors = ["purple", "blue", "green", "pink", "orange"];

  let notes = [];
  let editingId = null;

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function setStatus(message) {
    statusLabel.textContent = message;
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      return true;
    } catch (error) {
      setStatus(
        "No se pudieron guardar las notas. Revisa el almacenamiento del navegador."
      );
      console.error("Error guardando notas creativas:", error);
      return false;
    }
  }

  function loadNotes() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((note) =>
        note &&
        typeof note.id === "string" &&
        typeof note.title === "string" &&
        typeof note.content === "string" &&
        categories.includes(note.category) &&
        colors.includes(note.color)
      );
    } catch (error) {
      console.error("Error cargando notas creativas:", error);
      setStatus("No se pudieron leer las notas guardadas.");
      return [];
    }
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Fecha desconocida";

    return date.toLocaleDateString("es-GT", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function resetForm() {
    form.reset();
    editingId = null;
    colorInput.value = "purple";
    categoryInput.value = "Idea";
    formTitle.textContent = "✏️ Crear una nota";
    saveButton.textContent = "+ Guardar nota";
    cancelButton.hidden = true;
  }

  function renderNotes() {
    const search = searchInput.value.trim().toLowerCase();
    const category = filterInput.value;

    const filteredNotes = notes.filter((note) => {
      const matchesCategory =
        category === "Todas" || note.category === category;

      const searchableText =
        `${note.title} ${note.content} ${note.category}`.toLowerCase();

      return matchesCategory && searchableText.includes(search);
    });

    countLabel.textContent =
      `${notes.length} ${notes.length === 1 ? "nota" : "notas"}`;

    if (filteredNotes.length === 0) {
      const hasFilters = search !== "" || category !== "Todas";

      notesContainer.innerHTML = `
        <div class="creative-empty">
          <span>${hasFilters ? "🔎" : "💭"}</span>
          <h3>${hasFilters ? "No encontramos notas" : "Tu espacio está listo"}</h3>
          <p>${
            hasFilters
              ? "Prueba otra búsqueda o categoría."
              : "Crea tu primera nota usando el formulario."
          }</p>
        </div>
      `;
      return;
    }

    notesContainer.innerHTML = filteredNotes
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((note) => `
        <article class="creative-note creative-note-color-${note.color}">
          <div class="creative-note-top">
            <span class="creative-note-category">
              ${escapeHTML(note.category)}
            </span>
            <span class="creative-note-date">
              ${escapeHTML(formatDate(note.updatedAt))}
            </span>
          </div>

          <h3>${escapeHTML(note.title)}</h3>

          <p class="creative-note-content">${escapeHTML(note.content)}</p>

          <div class="creative-note-actions">
            <button type="button"
              class="creative-note-action"
              data-creative-action="edit"
              data-creative-id="${escapeHTML(note.id)}">
              ✏️ Editar
            </button>

            <button type="button"
              class="creative-note-action delete"
              data-creative-action="delete"
              data-creative-id="${escapeHTML(note.id)}">
              🗑️ Eliminar
            </button>
          </div>
        </article>
      `)
      .join("");
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = categoryInput.value;
    const color = colorInput.value;

    if (!title || !content) {
      setStatus("Escribe un título y el contenido de tu nota.");
      return;
    }

    if (!categories.includes(category) || !colors.includes(color)) {
      setStatus("Selecciona una categoría y un color válidos.");
      return;
    }

    const now = Date.now();

    if (editingId !== null) {
      const index = notes.findIndex((note) => note.id === editingId);

      if (index === -1) {
        setStatus("No encontramos esa nota. Intenta crearla de nuevo.");
        resetForm();
        return;
      }

      const oldNote = notes[index];

      notes[index] = {
        ...oldNote,
        title,
        content,
        category,
        color,
        updatedAt: now
      };

      if (!saveNotes()) return;

      resetForm();
      renderNotes();
      setStatus("¡Nota actualizada correctamente!");
      return;
    }

    notes.push({
      id: createId(),
      title,
      content,
      category,
      color,
      createdAt: now,
      updatedAt: now
    });

    if (!saveNotes()) {
      notes.pop();
      return;
    }

    resetForm();
    renderNotes();
    setStatus("¡Tu nota se guardó correctamente!");
  });

  notesContainer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-creative-action]");
    if (!button || !notesContainer.contains(button)) return;

    const id = button.dataset.creativeId;
    const action = button.dataset.creativeAction;
    const note = notes.find((item) => item.id === id);

    if (!note) return;

    if (action === "edit") {
      editingId = id;

      titleInput.value = note.title;
      categoryInput.value = note.category;
      contentInput.value = note.content;
      colorInput.value = note.color;

      formTitle.textContent = "✏️ Editar nota";
      saveButton.textContent = "Guardar cambios";
      cancelButton.hidden = false;

      form.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInput.focus();
      setStatus("Edita tu nota y pulsa Guardar cambios.");
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `¿Quieres eliminar la nota "${note.title}"? Esta acción no se puede deshacer.`
      );

      if (!confirmed) return;

      const previousNotes = [...notes];
      notes = notes.filter((item) => item.id !== id);

      if (!saveNotes()) {
        notes = previousNotes;
        return;
      }

      if (editingId === id) {
        resetForm();
      }

      renderNotes();
      setStatus("Nota eliminada correctamente.");
    }
  });

  cancelButton.addEventListener("click", () => {
    resetForm();
    setStatus("Edición cancelada.");
  });

  searchInput.addEventListener("input", renderNotes);
  filterInput.addEventListener("change", renderNotes);

  notes = loadNotes();
  renderNotes();
})();
