(() => {
  "use strict";

  const STORAGE_KEY = "my-application.tasks.v0.1";
  const RESEARCH_PLANS_STORAGE_KEY = "my-application.research-plans.v0.1";
  const RESEARCH_SCHEDULES_STORAGE_KEY = "my-application.research-schedules.v0.1";
  const LOCAL_MODE_KEY = "my-application.local-mode";
  const TABLE_NAME = "tasks";
  const RESEARCH_PLANS_TABLE = "research_plans";
  const RESEARCH_SCHEDULES_TABLE = "research_schedules";
  const TASK_SELECT_FIELDS = "id, title, memo, status, due_date, priority, tags, is_research, research_plan_id, created_at, completed_at, reminder_at, reminder_enabled, updated_at";
  const LEGACY_TASK_SELECT_FIELDS = "id, title, memo, status, due_date, priority, tags, created_at, completed_at, reminder_at, reminder_enabled, updated_at";
  const PLAN_SELECT_FIELDS = "id, title, objective, status, target_date, next_action, notes, created_at, updated_at";
  const SCHEDULE_SELECT_FIELDS = "id, title, scheduled_at, kind, plan_id, notes, created_at, updated_at";
  const config = window.__MY_APP_CONFIG__ || {};
  const hasRemoteConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  const PAGE_VIEWS = new Set(["home", "todo", "research", "creation", "hobby"]);
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
    plans: [],
    schedules: [],
    view: "today",
    sidebarView: getPageViewFromLocation(),
    search: "",
    authMode: "login",
    editingTaskId: null,
    editingPlanId: null,
    editingScheduleId: null,
    researchTaskContext: false,
    researchRemoteAvailable: true,
    researchTaskSchemaAvailable: true,
    researchDataError: "",
    toastTimer: null,
  };

  const $ = (id) => document.getElementById(id);
  const elements = {
    appShell: $("appShell"),
    todoPage: $("todoPage"),
    researchPage: $("researchPage"),
    creationPage: $("creationPage"),
    hobbyPage: $("hobbyPage"),
    researchDataNotice: $("researchDataNotice"),
    researchDataNoticeText: $("researchDataNoticeText"),
    researchOpenPlanCount: $("researchOpenPlanCount"),
    researchUpcomingScheduleCount: $("researchUpcomingScheduleCount"),
    researchOpenTaskCount: $("researchOpenTaskCount"),
    researchScheduleList: $("researchScheduleList"),
    researchScheduleEmpty: $("researchScheduleEmpty"),
    researchPlanList: $("researchPlanList"),
    researchPlanEmpty: $("researchPlanEmpty"),
    researchTaskList: $("researchTaskList"),
    researchTaskEmpty: $("researchTaskEmpty"),
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
    taskResearchPlan: $("taskResearchPlan"),
    taskIsResearch: $("taskIsResearch"),
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
    addResearchPlanButton: $("addResearchPlanButton"),
    addResearchPlanInlineButton: $("addResearchPlanInlineButton"),
    addResearchScheduleButton: $("addResearchScheduleButton"),
    addResearchScheduleInlineButton: $("addResearchScheduleInlineButton"),
    addResearchTaskButton: $("addResearchTaskButton"),
    researchPlanModal: $("researchPlanModal"),
    researchPlanModalTitle: $("researchPlanModalTitle"),
    researchPlanForm: $("researchPlanForm"),
    researchPlanId: $("researchPlanId"),
    researchPlanName: $("researchPlanName"),
    researchPlanObjective: $("researchPlanObjective"),
    researchPlanStatus: $("researchPlanStatus"),
    researchPlanTargetDate: $("researchPlanTargetDate"),
    researchPlanNextAction: $("researchPlanNextAction"),
    researchPlanNotes: $("researchPlanNotes"),
    closeResearchPlanModal: $("closeResearchPlanModal"),
    cancelResearchPlanButton: $("cancelResearchPlanButton"),
    deleteResearchPlanButton: $("deleteResearchPlanButton"),
    researchScheduleModal: $("researchScheduleModal"),
    researchScheduleModalTitle: $("researchScheduleModalTitle"),
    researchScheduleForm: $("researchScheduleForm"),
    researchScheduleId: $("researchScheduleId"),
    researchScheduleName: $("researchScheduleName"),
    researchScheduleAt: $("researchScheduleAt"),
    researchScheduleKind: $("researchScheduleKind"),
    researchSchedulePlan: $("researchSchedulePlan"),
    researchScheduleNotes: $("researchScheduleNotes"),
    closeResearchScheduleModal: $("closeResearchScheduleModal"),
    cancelResearchScheduleButton: $("cancelResearchScheduleButton"),
    deleteResearchScheduleButton: $("deleteResearchScheduleButton"),
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

  const PLAN_STATUS_LABELS = {
    idea: "構想",
    active: "進行中",
    paused: "保留",
    completed: "完了",
  };

  const SCHEDULE_KIND_LABELS = {
    experiment: "実験",
    meeting: "打ち合わせ",
    deadline: "締切",
    other: "その他",
  };

  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const PLAN_STATUS_RANK = { active: 0, idea: 1, paused: 2, completed: 3 };
  const dateFormatter = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
  const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });

  function getPageViewFromLocation() {
    const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
    return PAGE_VIEWS.has(hash) ? hash : "home";
  }

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
      isResearch: Boolean(task.is_research ?? task.isResearch ?? task.research_plan_id ?? task.researchPlanId),
      researchPlanId: task.research_plan_id ?? task.researchPlanId ?? "",
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
    const payload = {
      title: task.title,
      memo: task.memo || null,
      tags: task.tags,
      is_research: Boolean(task.isResearch),
      research_plan_id: task.researchPlanId || null,
      status: task.status,
      due_date: task.dueDate || null,
      priority: task.priority,
      completed_at: task.completedAt || null,
      reminder_at: task.reminderAt ? new Date(task.reminderAt).toISOString() : null,
      reminder_enabled: Boolean(task.reminderEnabled),
      user_id: state.user.id,
    };
    if (!state.researchTaskSchemaAvailable) {
      delete payload.is_research;
      delete payload.research_plan_id;
    }
    return payload;
  }

  function normalizePlan(plan = {}) {
    return {
      id: plan.id || createId(),
      title: String(plan.title || "").trim(),
      objective: String(plan.objective ?? ""),
      status: PLAN_STATUS_LABELS[plan.status] ? plan.status : "active",
      targetDate: plan.target_date ?? plan.targetDate ?? "",
      nextAction: String(plan.next_action ?? plan.nextAction ?? ""),
      notes: String(plan.notes ?? ""),
      createdAt: plan.created_at ?? plan.createdAt ?? new Date().toISOString(),
      updatedAt: plan.updated_at ?? plan.updatedAt ?? new Date().toISOString(),
    };
  }

  function normalizeSchedule(schedule = {}) {
    return {
      id: schedule.id || createId(),
      title: String(schedule.title || "").trim(),
      scheduledAt: schedule.scheduled_at ?? schedule.scheduledAt ?? "",
      kind: SCHEDULE_KIND_LABELS[schedule.kind] ? schedule.kind : "other",
      planId: schedule.plan_id ?? schedule.planId ?? "",
      notes: String(schedule.notes ?? ""),
      createdAt: schedule.created_at ?? schedule.createdAt ?? new Date().toISOString(),
      updatedAt: schedule.updated_at ?? schedule.updatedAt ?? new Date().toISOString(),
    };
  }

  function toPlanDatabasePayload(plan) {
    return {
      title: plan.title,
      objective: plan.objective || null,
      status: plan.status,
      target_date: plan.targetDate || null,
      next_action: plan.nextAction || null,
      notes: plan.notes || null,
      user_id: state.user.id,
    };
  }

  function toScheduleDatabasePayload(schedule) {
    return {
      title: schedule.title,
      scheduled_at: schedule.scheduledAt ? new Date(schedule.scheduledAt).toISOString() : null,
      kind: schedule.kind,
      plan_id: schedule.planId || null,
      notes: schedule.notes || null,
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

  function readLocalCollection(storageKey, normalizer) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(saved) ? saved.map(normalizer).filter((item) => item.title) : [];
    } catch (error) {
      console.warn("ローカル研究データの読み込みに失敗しました", error);
      return [];
    }
  }

  function writeLocalResearchData() {
    localStorage.setItem(RESEARCH_PLANS_STORAGE_KEY, JSON.stringify(state.plans));
    localStorage.setItem(RESEARCH_SCHEDULES_STORAGE_KEY, JSON.stringify(state.schedules));
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

  function updatePageLocation(view, replace = false) {
    const url = new URL(window.location.href);
    url.hash = view === "home" ? "" : view;
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
  }

  function resetPageFilters() {
    state.view = "today";
    state.search = "";
    elements.searchInput.value = "";
  }

  function navigateToPage(view) {
    const nextPage = PAGE_VIEWS.has(view) ? view : "home";
    if (nextPage !== state.sidebarView) updatePageLocation(nextPage);
    state.sidebarView = nextPage;
    resetPageFilters();
    render();
    closeSidebar();

    if (nextPage === "todo") {
      window.setTimeout(() => document.querySelector(".workspace-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function syncPageFromLocation() {
    state.sidebarView = getPageViewFromLocation();
    resetPageFilters();
    render();
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

  function formatScheduleDateTime(value) {
    if (!value) return "日時未定";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "日時不明";
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function formatTargetDate(value) {
    return value ? formatDateOnly(value) : "目標日なし";
  }

  function getPlanById(planId) {
    return state.plans.find((plan) => plan.id === planId) || null;
  }

  function isMissingResearchColumn(error) {
    const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    return message.includes("research_plan_id") || message.includes("is_research");
  }

  function isMissingResearchTable(error) {
    const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    return message.includes("research_plans") || message.includes("research_schedules");
  }

  function researchSetupMessage() {
    return "研究データを同期するには、最新のsupabase/schema.sqlをSupabaseのSQL Editorで実行してください。";
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
    const researchPlan = getPlanById(task.researchPlanId);
    const reminder = task.reminderEnabled && task.reminderAt
      ? `<span class="task-meta-item">♧ ${escapeHtml(formatDateTime(task.reminderAt))}</span>`
      : "";
    const researchMark = task.isResearch
      ? `<span class="task-meta-item research-task-mark">⌁ 研究</span>`
      : "";
    const researchPlanMark = researchPlan
      ? `<span class="task-meta-item research-plan-mark">↳ ${escapeHtml(researchPlan.title)}</span>`
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
            ${researchMark}
            ${researchPlanMark}
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

  function renderResearchPlan(plan) {
    const planTasks = state.tasks.filter((task) => task.researchPlanId === plan.id);
    const openTaskCount = planTasks.filter((task) => task.status !== "completed").length;
    const objective = plan.objective || "目的はまだ記録されていません。";
    const nextAction = plan.nextAction || "次にやることは未設定です。";

    return `
      <article class="research-plan-item" data-plan-id="${escapeHtml(plan.id)}">
        <div class="research-item-body">
          <div class="research-item-title-row">
            <h3>${escapeHtml(plan.title)}</h3>
            <span class="status-chip research-status-${escapeHtml(plan.status)}">${escapeHtml(PLAN_STATUS_LABELS[plan.status])}</span>
          </div>
          <p class="research-item-description">${escapeHtml(objective)}</p>
          <p class="research-next-action"><span>次にやること</span>${escapeHtml(nextAction)}</p>
          <div class="research-item-meta">
            <span>${escapeHtml(formatTargetDate(plan.targetDate))}</span>
            <span>未完了タスク ${openTaskCount}件</span>
          </div>
        </div>
        <div class="research-item-actions">
          <button class="task-action" type="button" data-research-action="edit-plan">編集</button>
          <button class="task-action delete" type="button" data-research-action="delete-plan">削除</button>
        </div>
      </article>
    `;
  }

  function renderResearchSchedule(schedule) {
    const plan = getPlanById(schedule.planId);
    const notes = schedule.notes ? `<p class="research-item-description">${escapeHtml(schedule.notes)}</p>` : "";
    const planLabel = plan ? `<span class="research-linked-plan">⌁ ${escapeHtml(plan.title)}</span>` : "";
    return `
      <article class="research-schedule-item" data-schedule-id="${escapeHtml(schedule.id)}">
        <time class="research-schedule-date" datetime="${escapeHtml(schedule.scheduledAt)}">
          <strong>${escapeHtml(formatScheduleDateTime(schedule.scheduledAt))}</strong>
          <span>${escapeHtml(SCHEDULE_KIND_LABELS[schedule.kind])}</span>
        </time>
        <div class="research-item-body">
          <div class="research-item-title-row">
            <h3>${escapeHtml(schedule.title)}</h3>
            ${planLabel}
          </div>
          ${notes}
        </div>
        <div class="research-item-actions">
          <button class="task-action" type="button" data-research-action="edit-schedule">編集</button>
          <button class="task-action delete" type="button" data-research-action="delete-schedule">削除</button>
        </div>
      </article>
    `;
  }

  function renderResearch() {
    const openPlans = state.plans.filter((plan) => plan.status !== "completed");
    const now = Date.now();
    const upcomingSchedules = state.schedules.filter((schedule) => {
      const timestamp = new Date(schedule.scheduledAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= now;
    });
    const researchTasks = state.tasks
      .filter((task) => task.isResearch || task.researchPlanId)
      .sort((a, b) => {
        if (a.status === "completed" && b.status !== "completed") return 1;
        if (b.status === "completed" && a.status !== "completed") return -1;
        return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
      });
    const sortedSchedules = [...state.schedules].sort((a, b) => {
      const timeA = new Date(a.scheduledAt).getTime();
      const timeB = new Date(b.scheduledAt).getTime();
      const upcomingA = Number.isFinite(timeA) && timeA >= now;
      const upcomingB = Number.isFinite(timeB) && timeB >= now;
      if (upcomingA !== upcomingB) return upcomingA ? -1 : 1;
      if (!upcomingA && !upcomingB) {
        return (Number.isFinite(timeB) ? timeB : Number.NEGATIVE_INFINITY)
          - (Number.isFinite(timeA) ? timeA : Number.NEGATIVE_INFINITY);
      }
      return (Number.isFinite(timeA) ? timeA : Number.MAX_SAFE_INTEGER)
        - (Number.isFinite(timeB) ? timeB : Number.MAX_SAFE_INTEGER);
    });
    const sortedPlans = [...state.plans].sort((a, b) => {
      const statusDifference = (PLAN_STATUS_RANK[a.status] ?? 1) - (PLAN_STATUS_RANK[b.status] ?? 1);
      if (statusDifference !== 0) return statusDifference;
      return (a.targetDate || "9999-12-31").localeCompare(b.targetDate || "9999-12-31");
    });

    elements.researchOpenPlanCount.textContent = String(openPlans.length);
    elements.researchUpcomingScheduleCount.textContent = String(upcomingSchedules.length);
    elements.researchOpenTaskCount.textContent = String(researchTasks.filter((task) => task.status !== "completed").length);

    const noticeMessages = [];
    if (state.mode === "remote" && !state.researchRemoteAvailable) noticeMessages.push(researchSetupMessage());
    if (state.mode === "remote" && !state.researchTaskSchemaAvailable) {
      noticeMessages.push("既存タスクとの研究連携には、最新のsupabase/schema.sqlの実行が必要です。");
    }
    elements.researchDataNotice.hidden = noticeMessages.length === 0;
    elements.researchDataNoticeText.textContent = noticeMessages.join(" ");

    elements.researchScheduleList.innerHTML = sortedSchedules.map(renderResearchSchedule).join("");
    elements.researchScheduleList.hidden = sortedSchedules.length === 0;
    elements.researchScheduleEmpty.hidden = sortedSchedules.length !== 0;

    elements.researchPlanList.innerHTML = sortedPlans.map(renderResearchPlan).join("");
    elements.researchPlanList.hidden = sortedPlans.length === 0;
    elements.researchPlanEmpty.hidden = sortedPlans.length !== 0;

    elements.researchTaskList.innerHTML = researchTasks.map(renderTask).join("");
    elements.researchTaskList.hidden = researchTasks.length === 0;
    elements.researchTaskEmpty.hidden = researchTasks.length !== 0;
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

    const isTodoPage = state.sidebarView === "home" || state.sidebarView === "todo";
    elements.todoPage.hidden = !isTodoPage;
    elements.researchPage.hidden = state.sidebarView !== "research";
    elements.creationPage.hidden = state.sidebarView !== "creation";
    elements.hobbyPage.hidden = state.sidebarView !== "hobby";
    elements.appShell.dataset.page = state.sidebarView;

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
    renderResearch();

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
    const fetchTasks = (selectFields) => supabaseClient
      .from(TABLE_NAME)
      .select(selectFields)
      .order("created_at", { ascending: false });
    let result = await fetchTasks(state.researchTaskSchemaAvailable ? TASK_SELECT_FIELDS : LEGACY_TASK_SELECT_FIELDS);
    if (result.error && state.researchTaskSchemaAvailable && isMissingResearchColumn(result.error)) {
      state.researchTaskSchemaAvailable = false;
      result = await fetchTasks(LEGACY_TASK_SELECT_FIELDS);
    }
    if (result.error) throw result.error;
    state.tasks = (result.data || []).map(normalizeTask);
    setSyncStatus("同期済み", "synced");
    render();
  }

  async function loadRemoteResearchData() {
    try {
      const [plansResult, schedulesResult] = await Promise.all([
        supabaseClient
          .from(RESEARCH_PLANS_TABLE)
          .select(PLAN_SELECT_FIELDS)
          .order("updated_at", { ascending: false }),
        supabaseClient
          .from(RESEARCH_SCHEDULES_TABLE)
          .select(SCHEDULE_SELECT_FIELDS)
          .order("scheduled_at", { ascending: true }),
      ]);
      if (plansResult.error) throw plansResult.error;
      if (schedulesResult.error) throw schedulesResult.error;
      state.plans = (plansResult.data || []).map(normalizePlan);
      state.schedules = (schedulesResult.data || []).map(normalizeSchedule);
      state.researchRemoteAvailable = true;
      state.researchDataError = "";
    } catch (error) {
      if (!isMissingResearchTable(error)) throw error;
      state.plans = [];
      state.schedules = [];
      state.researchRemoteAvailable = false;
      state.researchDataError = researchSetupMessage();
    }
    render();
  }

  async function runRemoteTaskMutation(task, operation) {
    const execute = () => {
      const query = operation === "update"
        ? supabaseClient.from(TABLE_NAME).update(toDatabasePayload(task)).eq("id", task.id)
        : supabaseClient.from(TABLE_NAME).insert(toDatabasePayload(task));
      return query.select(state.researchTaskSchemaAvailable ? TASK_SELECT_FIELDS : LEGACY_TASK_SELECT_FIELDS).single();
    };
    let result = await execute();
    if (result.error && state.researchTaskSchemaAvailable && isMissingResearchColumn(result.error)) {
      state.researchTaskSchemaAvailable = false;
      if (task.isResearch || task.researchPlanId) throw new Error(researchSetupMessage());
      result = await execute();
    }
    if (result.error) throw result.error;
    return result.data;
  }

  async function handleSession(session) {
    state.user = session?.user || null;
    if (!state.user) {
      state.tasks = [];
      state.plans = [];
      state.schedules = [];
      setSyncStatus("ログイン待ち", "local");
      showAuth();
      return;
    }

    localStorage.removeItem(LOCAL_MODE_KEY);
    elements.accountInitial.textContent = (state.user.email || "M").slice(0, 1).toUpperCase();
    elements.accountEmail.textContent = state.user.email || "ログイン中";
    elements.accountButton.hidden = false;
    await Promise.all([loadRemoteTasks(), loadRemoteResearchData()]);
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
    const researchPlanId = elements.taskResearchPlan.value || "";
    const completedAt = status === "completed"
      ? existing?.completedAt || new Date().toISOString()
      : null;
    return normalizeTask({
      id: state.editingTaskId || createId(),
      title: elements.taskTitle.value.trim(),
      memo: elements.taskMemo.value.trim(),
      tags: normalizeTags(elements.taskTags.value),
      isResearch: elements.taskIsResearch.checked || Boolean(researchPlanId),
      researchPlanId,
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
        const data = await runRemoteTaskMutation(task, "update");
        const index = state.tasks.findIndex((item) => item.id === task.id);
        if (index >= 0) state.tasks[index] = normalizeTask(data);
        setSyncStatus("同期済み", "synced");
      } else {
        const data = await runRemoteTaskMutation(task, "insert");
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
        const data = await runRemoteTaskMutation(updated, "update");
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

  function updateResearchPlanSelectors() {
    [elements.taskResearchPlan, elements.researchSchedulePlan].forEach((select) => {
      const selectedId = select.value;
      select.innerHTML = "";
      const noPlanOption = document.createElement("option");
      noPlanOption.value = "";
      noPlanOption.textContent = "紐付けない";
      select.append(noPlanOption);
      [...state.plans]
        .sort((a, b) => a.title.localeCompare(b.title, "ja-JP"))
        .forEach((plan) => {
          const option = document.createElement("option");
          option.value = plan.id;
          option.textContent = plan.title;
          select.append(option);
        });
      select.value = state.plans.some((plan) => plan.id === selectedId) ? selectedId : "";
    });
  }

  function getResearchPlanFromForm() {
    const existing = state.plans.find((plan) => plan.id === state.editingPlanId);
    return normalizePlan({
      id: state.editingPlanId || createId(),
      title: elements.researchPlanName.value.trim(),
      objective: elements.researchPlanObjective.value.trim(),
      status: elements.researchPlanStatus.value,
      targetDate: elements.researchPlanTargetDate.value || "",
      nextAction: elements.researchPlanNextAction.value.trim(),
      notes: elements.researchPlanNotes.value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async function saveResearchPlan(event) {
    event.preventDefault();
    if (!elements.researchPlanForm.reportValidity()) return;
    const plan = getResearchPlanFromForm();
    const isEditing = Boolean(state.editingPlanId);
    const saveButton = elements.researchPlanForm.querySelector("button[type=submit]");
    saveButton.disabled = true;

    try {
      if (state.mode === "local") {
        const index = state.plans.findIndex((item) => item.id === plan.id);
        if (index >= 0) state.plans[index] = plan;
        else state.plans.unshift(plan);
        writeLocalResearchData();
      } else {
        if (!state.researchRemoteAvailable) throw new Error(researchSetupMessage());
        const result = isEditing
          ? await supabaseClient.from(RESEARCH_PLANS_TABLE).update(toPlanDatabasePayload(plan)).eq("id", plan.id).select(PLAN_SELECT_FIELDS).single()
          : await supabaseClient.from(RESEARCH_PLANS_TABLE).insert(toPlanDatabasePayload(plan)).select(PLAN_SELECT_FIELDS).single();
        if (result.error) throw result.error;
        const savedPlan = normalizePlan(result.data);
        if (isEditing) {
          const index = state.plans.findIndex((item) => item.id === plan.id);
          if (index >= 0) state.plans[index] = savedPlan;
        } else {
          state.plans.unshift(savedPlan);
        }
      }
      closeResearchPlanModal();
      updateResearchPlanSelectors();
      render();
      showToast(isEditing ? "研究プランを更新しました" : "研究プランを追加しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    } finally {
      saveButton.disabled = false;
    }
  }

  function openResearchPlanModal(plan = null) {
    state.editingPlanId = plan?.id || null;
    elements.researchPlanModalTitle.textContent = plan ? "研究プランを編集" : "研究プランを追加";
    elements.deleteResearchPlanButton.hidden = !plan;
    elements.researchPlanId.value = plan?.id || "";
    elements.researchPlanName.value = plan?.title || "";
    elements.researchPlanObjective.value = plan?.objective || "";
    elements.researchPlanStatus.value = plan?.status || "active";
    elements.researchPlanTargetDate.value = plan?.targetDate || "";
    elements.researchPlanNextAction.value = plan?.nextAction || "";
    elements.researchPlanNotes.value = plan?.notes || "";
    elements.researchPlanModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(() => elements.researchPlanName.focus(), 40);
  }

  function closeResearchPlanModal() {
    elements.researchPlanModal.hidden = true;
    document.body.classList.remove("modal-open");
    state.editingPlanId = null;
    elements.researchPlanForm.reset();
  }

  async function deleteResearchPlan(planId, askForConfirmation = true) {
    const plan = state.plans.find((item) => item.id === planId);
    if (!plan) return;
    if (askForConfirmation && !window.confirm(`「${plan.title}」を削除しますか？`)) return;

    try {
      if (state.mode === "local") {
        state.plans = state.plans.filter((item) => item.id !== planId);
        state.schedules = state.schedules.map((schedule) => schedule.planId === planId ? { ...schedule, planId: "" } : schedule);
        state.tasks = state.tasks.map((task) => task.researchPlanId === planId ? { ...task, researchPlanId: "" } : task);
        writeLocalResearchData();
        writeLocalTasks();
      } else {
        if (!state.researchRemoteAvailable) throw new Error(researchSetupMessage());
        const { error } = await supabaseClient.from(RESEARCH_PLANS_TABLE).delete().eq("id", planId);
        if (error) throw error;
        state.plans = state.plans.filter((item) => item.id !== planId);
        state.schedules = state.schedules.map((schedule) => schedule.planId === planId ? { ...schedule, planId: "" } : schedule);
        state.tasks = state.tasks.map((task) => task.researchPlanId === planId ? { ...task, researchPlanId: "" } : task);
      }
      closeResearchPlanModal();
      updateResearchPlanSelectors();
      render();
      showToast("研究プランを削除しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    }
  }

  function getResearchScheduleFromForm() {
    const existing = state.schedules.find((schedule) => schedule.id === state.editingScheduleId);
    const date = new Date(elements.researchScheduleAt.value);
    return normalizeSchedule({
      id: state.editingScheduleId || createId(),
      title: elements.researchScheduleName.value.trim(),
      scheduledAt: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
      kind: elements.researchScheduleKind.value,
      planId: elements.researchSchedulePlan.value || "",
      notes: elements.researchScheduleNotes.value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async function saveResearchSchedule(event) {
    event.preventDefault();
    if (!elements.researchScheduleForm.reportValidity()) return;
    const schedule = getResearchScheduleFromForm();
    const isEditing = Boolean(state.editingScheduleId);
    const saveButton = elements.researchScheduleForm.querySelector("button[type=submit]");
    saveButton.disabled = true;

    try {
      if (state.mode === "local") {
        const index = state.schedules.findIndex((item) => item.id === schedule.id);
        if (index >= 0) state.schedules[index] = schedule;
        else state.schedules.push(schedule);
        writeLocalResearchData();
      } else {
        if (!state.researchRemoteAvailable) throw new Error(researchSetupMessage());
        const result = isEditing
          ? await supabaseClient.from(RESEARCH_SCHEDULES_TABLE).update(toScheduleDatabasePayload(schedule)).eq("id", schedule.id).select(SCHEDULE_SELECT_FIELDS).single()
          : await supabaseClient.from(RESEARCH_SCHEDULES_TABLE).insert(toScheduleDatabasePayload(schedule)).select(SCHEDULE_SELECT_FIELDS).single();
        if (result.error) throw result.error;
        const savedSchedule = normalizeSchedule(result.data);
        if (isEditing) {
          const index = state.schedules.findIndex((item) => item.id === schedule.id);
          if (index >= 0) state.schedules[index] = savedSchedule;
        } else {
          state.schedules.push(savedSchedule);
        }
      }
      closeResearchScheduleModal();
      render();
      showToast(isEditing ? "予定を更新しました" : "予定を追加しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    } finally {
      saveButton.disabled = false;
    }
  }

  function openResearchScheduleModal(schedule = null) {
    state.editingScheduleId = schedule?.id || null;
    elements.researchScheduleModalTitle.textContent = schedule ? "予定を編集" : "予定を追加";
    elements.deleteResearchScheduleButton.hidden = !schedule;
    elements.researchScheduleId.value = schedule?.id || "";
    elements.researchScheduleName.value = schedule?.title || "";
    elements.researchScheduleAt.value = toDateTimeLocalValue(schedule?.scheduledAt || "");
    elements.researchScheduleKind.value = schedule?.kind || "experiment";
    updateResearchPlanSelectors();
    elements.researchSchedulePlan.value = schedule?.planId || "";
    elements.researchScheduleNotes.value = schedule?.notes || "";
    elements.researchScheduleModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(() => elements.researchScheduleName.focus(), 40);
  }

  function closeResearchScheduleModal() {
    elements.researchScheduleModal.hidden = true;
    document.body.classList.remove("modal-open");
    state.editingScheduleId = null;
    elements.researchScheduleForm.reset();
  }

  async function deleteResearchSchedule(scheduleId, askForConfirmation = true) {
    const schedule = state.schedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    if (askForConfirmation && !window.confirm(`「${schedule.title}」を削除しますか？`)) return;

    try {
      if (state.mode === "local") {
        state.schedules = state.schedules.filter((item) => item.id !== scheduleId);
        writeLocalResearchData();
      } else {
        if (!state.researchRemoteAvailable) throw new Error(researchSetupMessage());
        const { error } = await supabaseClient.from(RESEARCH_SCHEDULES_TABLE).delete().eq("id", scheduleId);
        if (error) throw error;
        state.schedules = state.schedules.filter((item) => item.id !== scheduleId);
      }
      closeResearchScheduleModal();
      render();
      showToast("予定を削除しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    }
  }

  function openTaskModal(task = null, options = {}) {
    state.editingTaskId = task?.id || null;
    state.researchTaskContext = Boolean(options.researchContext);
    elements.taskModalTitle.textContent = task ? "タスクを編集" : "タスクを追加";
    elements.deleteTaskButton.hidden = !task;
    elements.taskId.value = task?.id || "";
    elements.taskTitle.value = task?.title || "";
    elements.taskMemo.value = task?.memo || "";
    elements.taskTags.value = task?.tags?.join(", ") || "";
    updateResearchPlanSelectors();
    elements.taskResearchPlan.value = task?.researchPlanId || "";
    elements.taskIsResearch.checked = task ? Boolean(task.isResearch || task.researchPlanId) : state.researchTaskContext;
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
    state.researchTaskContext = false;
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
    if (message.includes("research_plans") || message.includes("research_schedules") || message.includes("research_plan_id") || message.includes("is_research")) return researchSetupMessage();
    if (message.includes("relation") && message.includes("does not exist")) return "Supabaseにtasksテーブルがありません。READMEのSQLを実行してください。";
    if (message.includes("Failed to fetch")) return "通信に失敗しました。接続を確認してください。";
    return message || "処理に失敗しました。";
  }

  function enterLocalMode() {
    state.mode = "local";
    state.user = null;
    state.tasks = readLocalTasks();
    state.plans = readLocalCollection(RESEARCH_PLANS_STORAGE_KEY, normalizePlan);
    state.schedules = readLocalCollection(RESEARCH_SCHEDULES_STORAGE_KEY, normalizeSchedule);
    state.researchRemoteAvailable = true;
    state.researchTaskSchemaAvailable = true;
    state.researchDataError = "";
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

  function handleTaskListClick(event) {
    const target = event.target.closest("[data-action]");
    const card = event.target.closest("[data-task-id]");
    if (!target || !card) return;
    const taskId = card.dataset.taskId;
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (target.dataset.action === "toggle") toggleTask(taskId);
    if (target.dataset.action === "edit") openTaskModal(task);
    if (target.dataset.action === "delete") deleteTask(taskId);
  }

  function handleTaskListKeydown(event) {
    const target = event.target.closest('[data-action="edit"]');
    if (target && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      const card = target.closest("[data-task-id]");
      const task = state.tasks.find((item) => item.id === card?.dataset.taskId);
      if (task) openTaskModal(task);
    }
  }

  function handleResearchPageClick(event) {
    const emptyAction = event.target.closest("[data-empty-action]")?.dataset.emptyAction;
    if (emptyAction === "plan") return openResearchPlanModal();
    if (emptyAction === "schedule") return openResearchScheduleModal();
    if (emptyAction === "task") return openTaskModal(null, { researchContext: true });

    const target = event.target.closest("[data-research-action]");
    if (!target) return;
    const action = target.dataset.researchAction;
    const planCard = target.closest("[data-plan-id]");
    const scheduleCard = target.closest("[data-schedule-id]");
    if (action === "edit-plan" && planCard) openResearchPlanModal(state.plans.find((plan) => plan.id === planCard.dataset.planId));
    if (action === "delete-plan" && planCard) deleteResearchPlan(planCard.dataset.planId);
    if (action === "edit-schedule" && scheduleCard) openResearchScheduleModal(state.schedules.find((schedule) => schedule.id === scheduleCard.dataset.scheduleId));
    if (action === "delete-schedule" && scheduleCard) deleteResearchSchedule(scheduleCard.dataset.scheduleId);
  }

  function bindEvents() {
    elements.sidebarToggle.addEventListener("click", toggleSidebar);
    elements.closeSidebar.addEventListener("click", closeSidebar);
    elements.sidebarBackdrop.addEventListener("click", closeSidebar);
    elements.sidebarNav.addEventListener("click", (event) => {
      const item = event.target.closest("[data-sidebar-view]");
      if (!item) return;
      navigateToPage(item.dataset.sidebarView);
    });
    window.addEventListener("hashchange", syncPageFromLocation);
    window.addEventListener("popstate", syncPageFromLocation);
    elements.addTaskButton.addEventListener("click", () => openTaskModal());
    elements.emptyAddButton.addEventListener("click", () => openTaskModal());
    elements.addResearchPlanButton.addEventListener("click", () => openResearchPlanModal());
    elements.addResearchPlanInlineButton.addEventListener("click", () => openResearchPlanModal());
    elements.addResearchScheduleButton.addEventListener("click", () => openResearchScheduleModal());
    elements.addResearchScheduleInlineButton.addEventListener("click", () => openResearchScheduleModal());
    elements.addResearchTaskButton.addEventListener("click", () => openTaskModal(null, { researchContext: true }));
    elements.researchPage.addEventListener("click", handleResearchPageClick);
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
    elements.researchPlanForm.addEventListener("submit", saveResearchPlan);
    elements.closeResearchPlanModal.addEventListener("click", closeResearchPlanModal);
    elements.cancelResearchPlanButton.addEventListener("click", closeResearchPlanModal);
    elements.deleteResearchPlanButton.addEventListener("click", () => deleteResearchPlan(state.editingPlanId));
    elements.researchPlanModal.addEventListener("click", (event) => {
      if (event.target === elements.researchPlanModal) closeResearchPlanModal();
    });
    elements.researchScheduleForm.addEventListener("submit", saveResearchSchedule);
    elements.closeResearchScheduleModal.addEventListener("click", closeResearchScheduleModal);
    elements.cancelResearchScheduleButton.addEventListener("click", closeResearchScheduleModal);
    elements.deleteResearchScheduleButton.addEventListener("click", () => deleteResearchSchedule(state.editingScheduleId));
    elements.researchScheduleModal.addEventListener("click", (event) => {
      if (event.target === elements.researchScheduleModal) closeResearchScheduleModal();
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
    elements.taskList.addEventListener("click", handleTaskListClick);
    elements.taskList.addEventListener("keydown", handleTaskListKeydown);
    elements.researchTaskList.addEventListener("click", handleTaskListClick);
    elements.researchTaskList.addEventListener("keydown", handleTaskListKeydown);
    document.addEventListener("click", (event) => {
      if (!elements.accountMenu.hidden && !event.target.closest(".account-menu, .account-button")) {
        elements.accountMenu.hidden = true;
      }
    });
    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);
      if (event.key === "Escape" && !elements.taskModal.hidden) closeTaskModal();
      else if (event.key === "Escape" && !elements.researchPlanModal.hidden) closeResearchPlanModal();
      else if (event.key === "Escape" && !elements.researchScheduleModal.hidden) closeResearchScheduleModal();
      else if (event.key === "Escape" && document.body.classList.contains("sidebar-open")) closeSidebar();
      if (typing || elements.authShell.hidden === false) return;
      if (!["home", "todo"].includes(state.sidebarView)) return;
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

  }

  document.addEventListener("DOMContentLoaded", boot);
})();
