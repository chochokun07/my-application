(() => {
  "use strict";

  const STORAGE_KEY = "my-application.tasks.v0.1";
  const LOCAL_MODE_KEY = "my-application.local-mode";
  const TABLE_NAME = "tasks";
  const config = window.__MY_APP_CONFIG__ || {};
  const hasRemoteConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  const supabaseClient = hasRemoteConfig && window.supabase?.createClient
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    })
    : null;

  const state = {
    mode: supabaseClient ? "remote" : "local",
    user: null,
    tasks: [],
    view: "today",
    sidebarView: "home",
    search: "",
    authMode: "login",
    editingTaskId: null,
    toastTimer: null,
  };

  const $ = (id) => document.getElementById(id);
  const elements = {
    appShell: $("appShell"),
    authShell: $("authShell"),
    setupNotice: $("setupNotice"),
    syncStatus: $("syncStatus"),
    sidebarToggle: $("sidebarToggle"),
    sidebarBackdrop: $("sidebarBackdrop"),
    appSidebar: $("appSidebar"),
    closeSidebar: $("closeSidebar"),
    sidebarNav: $("sidebarNav"),
    sidebarSyncStatus: $("sidebarSyncStatus"),
    sidebarTodoCount: $("sidebarTodoCount"),
    accountButton: $("accountButton"),
    accountInitial: $("accountInitial"),
    accountMenu: $("accountMenu"),
    accountEmail: $("accountEmail"),
    signOutButton: $("signOutButton"),
    dateLabel: $("dateLabel"),
    todaySubtitle: $("todaySubtitle"),
    taskList: $("taskList"),
    emptyState: $("emptyState"),
    emptyTitle: $("emptyTitle"),
    emptyDescription: $("emptyDescription"),
    authForm: $("authForm"),
    authEmail: $("authEmail"),
    authPassword: $("authPassword"),
    authSubmit: $("authSubmit"),
    authModeButton: $("authModeButton"),
    authMessage: $("authMessage"),
    useLocalButton: $("useLocalButton"),
    openAuthButton: $("openAuthButton"),
    taskModal: $("taskModal"),
    taskModalTitle: $("taskModalTitle"),
    taskForm: $("taskForm"),
    taskId: $("taskId"),
    taskTitle: $("taskTitle"),
    taskMemo: $("taskMemo"),
    taskDueDate: $("taskDueDate"),
    taskPriority: $("taskPriority"),
    taskStatus: $("taskStatus"),
    taskReminderAt: $("taskReminderAt"),
    taskReminderEnabled: $("taskReminderEnabled"),
    taskTags: $("taskTags"),
    deleteTaskButton: $("deleteTaskButton"),
    closeTaskModal: $("closeTaskModal"),
    cancelTaskButton: $("cancelTaskButton"),
    addTaskButton: $("addTaskButton"),
    emptyAddButton: $("emptyAddButton"),
    searchInput: $("searchInput"),
    toast: $("toast"),
    openCount: $("openCount"),
    progressCount: $("progressCount"),
    completedTodayCount: $("completedTodayCount"),
    todayTabCount: $("todayTabCount"),
    allTabCount: $("allTabCount"),
    completedTabCount: $("completedTabCount"),
  };

  const STATUS_LABELS = {
    todo: "未着手",
    in_progress: "進行中",
    on_hold: "保留",
    completed: "完了",
  };

  const PRIORITY_LABELS = {
    low: "優先度 低",
    medium: "優先度 中",
    high: "優先度 高",
  };

  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const dateFormatter = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
  const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function todayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function normalizeTags(value) {
    const values = Array.isArray(value) ? value : String(value ?? "").split(/[,、，]/);
    return [...new Set(values.map((tag) => String(tag).trim()).filter(Boolean))];
  }

  function normalizeTask(task = {}) {
    return {
      id: task.id || createId(),
      title: String(task.title || "").trim(),
      memo: String(task.memo ?? ""),
      tags: normalizeTags(task.tags),
      status: STATUS_LABELS[task.status] ? task.status : "todo",
      dueDate: task.due_date ?? task.dueDate ?? "",
      priority: PRIORITY_LABELS[task.priority] ? task.priority : "medium",
      createdAt: task.created_at ?? task.createdAt ?? new Date().toISOString(),
      completedAt: task.completed_at ?? task.completedAt ?? null,
      reminderAt: task.reminder_at ?? task.reminderAt ?? "",
      reminderEnabled: Boolean(task.reminder_enabled ?? task.reminderEnabled),
      updatedAt: task.updated_at ?? task.updatedAt ?? new Date().toISOString(),
    };
  }

  function toDatabasePayload(task) {
    return {
      title: task.title,
      memo: task.memo || null,
      tags: task.tags,
      status: task.status,
      due_date: task.dueDate || null,
      priority: task.priority,
      completed_at: task.completedAt || null,
      reminder_at: task.reminderAt ? new Date(task.reminderAt).toISOString() : null,
      reminder_enabled: Boolean(task.reminderEnabled),
      user_id: state.user.id,
    };
  }

  function readLocalTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved.map(normalizeTask).filter((task) => task.title) : [];
    } catch (error) {
      console.warn("ローカルタスクの読み込みに失敗しました", error);
      return [];
    }
  }

  function writeLocalTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  }

  function setSyncStatus(label, status) {
    elements.syncStatus.textContent = label;
    elements.syncStatus.dataset.state = status;
    elements.sidebarSyncStatus.textContent = label;
    elements.sidebarSyncStatus.dataset.state = status;
    elements.sidebarSyncStatus.parentElement.dataset.state = status;
  }

  function showToast(message, isError = false) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.toggle("is-error", isError);
    elements.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2800);
  }

  function setAuthMessage(message = "", type = "") {
    elements.authMessage.textContent = message;
    elements.authMessage.className = `form-message${type ? ` is-${type}` : ""}`;
  }


  function setSidebarOpen(isOpen) {
    const wasOpen = document.body.classList.contains("sidebar-open");
    document.body.classList.toggle("sidebar-open", isOpen);
    elements.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    elements.sidebarToggle.setAttribute("aria-label", isOpen ? "サイドバーを閉じる" : "サイドバーを開く");
    elements.appSidebar.setAttribute("aria-hidden", String(!isOpen));
    elements.sidebarBackdrop.setAttribute("aria-hidden", String(!isOpen));

    if (isOpen) {
      window.setTimeout(() => elements.closeSidebar.focus(), 40);
    } else if (wasOpen && elements.appSidebar.contains(document.activeElement)) {
      elements.sidebarToggle.focus();
    }
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen(!document.body.classList.contains("sidebar-open"));
  }

  function showApp() {
    elements.authShell.hidden = true;
    elements.appShell.hidden = false;
    elements.sidebarToggle.disabled = false;
    render();
  }

  function showAuth(message = "") {
    closeSidebar();
    elements.appShell.hidden = true;
    elements.authShell.hidden = false;
    elements.sidebarToggle.disabled = true;
    elements.accountMenu.hidden = true;
    elements.accountButton.hidden = true;
    setAuthMessage(message);
    elements.authEmail.focus();
  }

  function updateAuthMode() {
    const isSignUp = state.authMode === "signup";
    elements.authSubmit.textContent = isSignUp ? "アカウントを作成" : "ログイン";
    elements.authModeButton.textContent = isSignUp ? "ログインに戻る" : "アカウントを作成する";
    elements.authPassword.autocomplete = isSignUp ? "new-password" : "current-password";
    setAuthMessage("");
  }

  function formatDateOnly(value) {
    if (!value) return "期限なし";
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return "期限不明";
    return dateFormatter.format(new Date(year, month - 1, day));
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return dateTimeFormatter.format(date);
  }

  function isOverdue(task) {
    return Boolean(task.dueDate && task.status !== "completed" && task.dueDate < todayKey());
  }

  function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  }

  function getVisibleTasks() {
    const search = state.search.trim().toLocaleLowerCase("ja-JP");
    const filtered = state.tasks.filter((task) => {
      if (state.view === "today" && task.status === "completed") return false;
      if (state.view === "completed" && task.status !== "completed") return false;
      if (!search) return true;
      return `${task.title} ${task.memo} ${task.tags.join(" ")}`.toLocaleLowerCase("ja-JP").includes(search);
    });

    return filtered.sort((a, b) => {
      if (state.view === "completed") {
        return new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime();
      }
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      const dueA = a.dueDate || "9999-12-31";
      const dueB = b.dueDate || "9999-12-31";
      if (dueA !== dueB) return dueA.localeCompare(dueB);
      const priorityDifference = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
      if (priorityDifference !== 0) return priorityDifference;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  function renderTask(task) {
    const statusLabel = STATUS_LABELS[task.status];
    const dueClass = isOverdue(task) ? " is-overdue" : "";
    const reminder = task.reminderEnabled && task.reminderAt
      ? `<span class="task-meta-item">♧ ${escapeHtml(formatDateTime(task.reminderAt))}</span>`
      : "";
    const memo = task.memo ? `<p class="task-memo">${escapeHtml(task.memo)}</p>` : "";
    const tags = task.tags.length
      ? `<div class="task-tags" aria-label="タグ">${task.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>`
      : "";

    return `
      <article class="task-card${task.status === "completed" ? " is-completed" : ""}" data-task-id="${escapeHtml(task.id)}">
        <button class="check-button${task.status === "completed" ? " is-checked" : ""}" type="button" data-action="toggle" aria-label="${task.status === "completed" ? "未完了に戻す" : "完了にする"}">
          ${task.status === "completed" ? "✓" : ""}
        </button>
        <div class="task-main" data-action="edit" role="button" tabindex="0">
          <div class="task-title-row">
            <h3>${escapeHtml(task.title)}</h3>
            <span class="status-chip status-${escapeHtml(task.status)}">${escapeHtml(statusLabel)}</span>
          </div>
          <div class="task-meta">
            <span class="task-meta-item${dueClass}">${task.dueDate ? "◷" : "○"} ${escapeHtml(task.dueDate ? formatDateOnly(task.dueDate) : "期限なし")}</span>
            <span class="priority-chip priority-${escapeHtml(task.priority)}">${escapeHtml(PRIORITY_LABELS[task.priority])}</span>
            ${reminder}
          </div>
          ${tags}
          ${memo}
        </div>
        <div class="task-actions">
          <button class="task-action" type="button" data-action="edit">編集</button>
          <button class="task-action delete" type="button" data-action="delete">削除</button>
        </div>
      </article>
    `;
  }

  function render() {
    const openTasks = state.tasks.filter((task) => task.status !== "completed");
    const progressTasks = state.tasks.filter((task) => task.status === "in_progress");
    const completedToday = state.tasks.filter((task) => task.completedAt && task.completedAt.slice(0, 10) === todayKey());
    const visibleTasks = getVisibleTasks();

    elements.openCount.textContent = String(openTasks.length);
    elements.progressCount.textContent = String(progressTasks.length);
    elements.completedTodayCount.textContent = String(completedToday.length);
    elements.todayTabCount.textContent = String(openTasks.length);
    elements.allTabCount.textContent = String(state.tasks.length);
    elements.completedTabCount.textContent = String(state.tasks.filter((task) => task.status === "completed").length);
    elements.sidebarTodoCount.textContent = String(openTasks.length);
    elements.dateLabel.textContent = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date()).toUpperCase();
    elements.todaySubtitle.textContent = openTasks.length ? `${openTasks.length}件の未完了タスクがあります。` : "今取り組むタスクはありません。";

    document.querySelectorAll(".view-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === state.view));
    document.querySelectorAll("[data-sidebar-view]").forEach((item) => {
      const isActive = item.dataset.sidebarView === state.sidebarView;
      item.classList.toggle("is-active", isActive);
      if (isActive) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    elements.taskList.innerHTML = visibleTasks.map(renderTask).join("");
    elements.taskList.hidden = visibleTasks.length === 0;
    elements.emptyState.hidden = visibleTasks.length !== 0;

    if (state.search.trim()) {
      elements.emptyTitle.textContent = "該当するタスクがありません";
      elements.emptyDescription.textContent = "検索語を変えるか、検索をクリアしてください。";
    } else if (state.view === "completed") {
      elements.emptyTitle.textContent = "完了したタスクはありません";
      elements.emptyDescription.textContent = "完了したタスクはここで確認できます。";
    } else if (state.view === "all") {
      elements.emptyTitle.textContent = "タスクはまだありません";
      elements.emptyDescription.textContent = "思いついたことを、まずは一つだけ登録してみましょう。";
    } else {
      elements.emptyTitle.textContent = "今日のタスクはありません";
      elements.emptyDescription.textContent = "今取り組むことを登録すると、ここに表示されます。";
    }
  }

  async function loadRemoteTasks() {
    setSyncStatus("同期中", "connecting");
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select("id, title, memo, status, due_date, priority, tags, created_at, completed_at, reminder_at, reminder_enabled, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    state.tasks = (data || []).map(normalizeTask);
    setSyncStatus("同期済み", "synced");
    render();
  }

  async function handleSession(session) {
    state.user = session?.user || null;
    if (!state.user) {
      state.tasks = [];
      setSyncStatus("ログイン待ち", "local");
      showAuth();
      return;
    }

    localStorage.removeItem(LOCAL_MODE_KEY);
    elements.accountInitial.textContent = (state.user.email || "M").slice(0, 1).toUpperCase();
    elements.accountEmail.textContent = state.user.email || "ログイン中";
    elements.accountButton.hidden = false;
    await loadRemoteTasks();
    showApp();
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) {
      setAuthMessage("先にconfig.jsへSupabaseの接続情報を設定してください。", "error");
      return;
    }

    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    elements.authSubmit.disabled = true;
    setAuthMessage("処理中です…");

    try {
      const result = state.authMode === "signup"
        ? await supabaseClient.auth.signUp({ email, password })
        : await supabaseClient.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;

      if (state.authMode === "signup" && !result.data.session) {
        setAuthMessage("確認メールを送信しました。メール確認後にログインしてください。", "success");
      } else {
        setAuthMessage("ログインしました。", "success");
      }
    } catch (error) {
      setAuthMessage(toFriendlyError(error), "error");
    } finally {
      elements.authSubmit.disabled = false;
    }
  }

  function getTaskFromForm() {
    const existing = state.tasks.find((task) => task.id === state.editingTaskId);
    const status = elements.taskStatus.value;
    const completedAt = status === "completed"
      ? existing?.completedAt || new Date().toISOString()
      : null;
    return normalizeTask({
      id: state.editingTaskId || createId(),
      title: elements.taskTitle.value.trim(),
      memo: elements.taskMemo.value.trim(),
      tags: normalizeTags(elements.taskTags.value),
      dueDate: elements.taskDueDate.value || "",
      priority: elements.taskPriority.value,
      status,
      completedAt,
      reminderAt: elements.taskReminderAt.value || "",
      reminderEnabled: elements.taskReminderEnabled.checked,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async function saveTask(event) {
    event.preventDefault();
    if (!elements.taskForm.reportValidity()) return;
    const task = getTaskFromForm();
    const isEditing = Boolean(state.editingTaskId);
    const saveButton = $("saveTaskButton");
    saveButton.disabled = true;

    try {
      if (state.mode === "local") {
        const index = state.tasks.findIndex((item) => item.id === task.id);
        if (index >= 0) state.tasks[index] = task;
        else state.tasks.unshift(task);
        writeLocalTasks();
        setSyncStatus("この端末のみ", "local");
      } else if (state.editingTaskId) {
        const { data, error } = await supabaseClient
          .from(TABLE_NAME)
          .update(toDatabasePayload(task))
          .eq("id", task.id)
          .select("id, title, memo, status, due_date, priority, tags, created_at, completed_at, reminder_at, reminder_enabled, updated_at")
          .single();
        if (error) throw error;
        const index = state.tasks.findIndex((item) => item.id === task.id);
        if (index >= 0) state.tasks[index] = normalizeTask(data);
        setSyncStatus("同期済み", "synced");
      } else {
        const { data, error } = await supabaseClient
          .from(TABLE_NAME)
          .insert(toDatabasePayload(task))
          .select("id, title, memo, status, due_date, priority, tags, created_at, completed_at, reminder_at, reminder_enabled, updated_at")
          .single();
        if (error) throw error;
        state.tasks.unshift(normalizeTask(data));
        setSyncStatus("同期済み", "synced");
      }
      closeTaskModal();
      render();
      showToast(isEditing ? "タスクを更新しました" : "タスクを追加しました");
    } catch (error) {
      setSyncStatus("同期エラー", "error");
      showToast(toFriendlyError(error), true);
    } finally {
      saveButton.disabled = false;
    }
  }

  async function toggleTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const updated = normalizeTask({
      ...task,
      status: task.status === "completed" ? "todo" : "completed",
      completedAt: task.status === "completed" ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      if (state.mode === "local") {
        state.tasks = state.tasks.map((item) => item.id === taskId ? updated : item);
        writeLocalTasks();
        setSyncStatus("この端末のみ", "local");
      } else {
        const { data, error } = await supabaseClient
          .from(TABLE_NAME)
          .update(toDatabasePayload(updated))
          .eq("id", taskId)
          .select("id, title, memo, status, due_date, priority, tags, created_at, completed_at, reminder_at, reminder_enabled, updated_at")
          .single();
        if (error) throw error;
        state.tasks = state.tasks.map((item) => item.id === taskId ? normalizeTask(data) : item);
        setSyncStatus("同期済み", "synced");
      }
      render();
    } catch (error) {
      setSyncStatus("同期エラー", "error");
      showToast(toFriendlyError(error), true);
    }
  }

  async function deleteTask(taskId, askForConfirmation = true) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (askForConfirmation && !window.confirm(`「${task.title}」を削除しますか？`)) return;

    try {
      if (state.mode === "local") {
        state.tasks = state.tasks.filter((item) => item.id !== taskId);
        writeLocalTasks();
        setSyncStatus("この端末のみ", "local");
      } else {
        const { error } = await supabaseClient.from(TABLE_NAME).delete().eq("id", taskId);
        if (error) throw error;
        state.tasks = state.tasks.filter((item) => item.id !== taskId);
        setSyncStatus("同期済み", "synced");
      }
      closeTaskModal();
      render();
      showToast("タスクを削除しました");
    } catch (error) {
      setSyncStatus("同期エラー", "error");
      showToast(toFriendlyError(error), true);
    }
  }

  function openTaskModal(task = null) {
    state.editingTaskId = task?.id || null;
    elements.taskModalTitle.textContent = task ? "タスクを編集" : "タスクを追加";
    elements.deleteTaskButton.hidden = !task;
    elements.taskId.value = task?.id || "";
    elements.taskTitle.value = task?.title || "";
    elements.taskMemo.value = task?.memo || "";
    elements.taskTags.value = task?.tags?.join(", ") || "";
    elements.taskDueDate.value = task?.dueDate || "";
    elements.taskPriority.value = task?.priority || "medium";
    elements.taskStatus.value = task?.status || "todo";
    elements.taskReminderAt.value = toDateTimeLocalValue(task?.reminderAt || "");
    elements.taskReminderEnabled.checked = Boolean(task?.reminderEnabled);
    elements.taskModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(() => elements.taskTitle.focus(), 40);
  }

  function closeTaskModal() {
    elements.taskModal.hidden = true;
    document.body.classList.remove("modal-open");
    state.editingTaskId = null;
    elements.taskForm.reset();
  }

  function toDateTimeLocalValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function toFriendlyError(error) {
    const message = String(error?.message || error || "");
    if (message.includes("Invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません。";
    if (message.includes("User already registered")) return "このメールアドレスはすでに登録されています。";
    if (message.includes("relation") && message.includes("does not exist")) return "Supabaseにtasksテーブルがありません。READMEのSQLを実行してください。";
    if (message.includes("Failed to fetch")) return "通信に失敗しました。接続を確認してください。";
    return message || "処理に失敗しました。";
  }

  function enterLocalMode() {
    state.mode = "local";
    state.user = null;
    state.tasks = readLocalTasks();
    localStorage.setItem(LOCAL_MODE_KEY, "true");
    elements.accountButton.hidden = true;
    elements.openAuthButton.hidden = !supabaseClient;
    elements.setupNotice.hidden = false;
    setSyncStatus("この端末のみ", "local");
    showApp();
  }

  function enterSyncMode() {
    if (!supabaseClient) {
      showToast("config.jsにSupabaseの情報を設定してください。", true);
      return;
    }
    localStorage.removeItem(LOCAL_MODE_KEY);
    state.mode = "remote";
    elements.setupNotice.hidden = true;
    showAuth();
  }

  function bindEvents() {
    elements.sidebarToggle.addEventListener("click", toggleSidebar);
    elements.closeSidebar.addEventListener("click", closeSidebar);
    elements.sidebarBackdrop.addEventListener("click", closeSidebar);
    elements.sidebarNav.addEventListener("click", (event) => {
      const item = event.target.closest("[data-sidebar-view]");
      if (!item) return;

      state.sidebarView = item.dataset.sidebarView;
      state.view = "today";
      state.search = "";
      elements.searchInput.value = "";
      render();
      closeSidebar();

      if (state.sidebarView === "todo") {
        window.setTimeout(() => document.querySelector(".workspace-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    elements.addTaskButton.addEventListener("click", () => openTaskModal());
    elements.emptyAddButton.addEventListener("click", () => openTaskModal());
    elements.authForm.addEventListener("submit", handleAuthSubmit);
    elements.authModeButton.addEventListener("click", () => {
      state.authMode = state.authMode === "login" ? "signup" : "login";
      updateAuthMode();
    });
    elements.useLocalButton.addEventListener("click", enterLocalMode);
    elements.openAuthButton.addEventListener("click", enterSyncMode);
    elements.closeTaskModal.addEventListener("click", closeTaskModal);
    elements.cancelTaskButton.addEventListener("click", closeTaskModal);
    elements.taskForm.addEventListener("submit", saveTask);
    elements.deleteTaskButton.addEventListener("click", () => deleteTask(state.editingTaskId));
    elements.taskModal.addEventListener("click", (event) => {
      if (event.target === elements.taskModal) closeTaskModal();
    });
    elements.accountButton.addEventListener("click", () => {
      elements.accountMenu.hidden = !elements.accountMenu.hidden;
    });
    elements.signOutButton.addEventListener("click", async () => {
      elements.accountMenu.hidden = true;
      const { error } = await supabaseClient.auth.signOut();
      if (error) showToast(toFriendlyError(error), true);
    });
    elements.searchInput.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
    });
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.view = tab.dataset.view;
        render();
      });
    });
    elements.taskList.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      const card = event.target.closest("[data-task-id]");
      if (!target || !card) return;
      const taskId = card.dataset.taskId;
      const task = state.tasks.find((item) => item.id === taskId);
      if (!task) return;
      if (target.dataset.action === "toggle") toggleTask(taskId);
      if (target.dataset.action === "edit") openTaskModal(task);
      if (target.dataset.action === "delete") deleteTask(taskId);
    });
    elements.taskList.addEventListener("keydown", (event) => {
      const target = event.target.closest('[data-action="edit"]');
      if (target && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        const card = target.closest("[data-task-id]");
        const task = state.tasks.find((item) => item.id === card?.dataset.taskId);
        if (task) openTaskModal(task);
      }
    });
    document.addEventListener("click", (event) => {
      if (!elements.accountMenu.hidden && !event.target.closest(".account-menu, .account-button")) {
        elements.accountMenu.hidden = true;
      }
    });
    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);
      if (event.key === "Escape" && !elements.taskModal.hidden) closeTaskModal();
      else if (event.key === "Escape" && document.body.classList.contains("sidebar-open")) closeSidebar();
      if (typing || elements.authShell.hidden === false) return;
      if (event.key.toLowerCase() === "n") openTaskModal();
      if (event.key === "/") {
        event.preventDefault();
        elements.searchInput.focus();
      }
    });
  }

  async function boot() {
    bindEvents();
    updateAuthMode();

    if (!supabaseClient || localStorage.getItem(LOCAL_MODE_KEY) === "true") {
      enterLocalMode();
    } else {
      elements.setupNotice.hidden = true;
      setSyncStatus("接続確認中", "connecting");
      supabaseClient.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => handleSession(session).catch((error) => {
          setSyncStatus("同期エラー", "error");
          showToast(toFriendlyError(error), true);
          showAuth();
        }), 0);
      });
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        await handleSession(data.session);
      } catch (error) {
        setSyncStatus("接続エラー", "error");
        showAuth(toFriendlyError(error));
      }
    }

    if ("serviceWorker" in navigator && (window.isSecureContext || location.hostname === "localhost")) {
      navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("PWA登録に失敗しました", error));
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
