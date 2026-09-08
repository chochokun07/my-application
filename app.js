(() => {
  "use strict";

  const STORAGE_KEY = "my-application.tasks.v0.1";
  const APP_SETTINGS_STORAGE_KEY = "my-application.app-settings.v0.1";
  const REMOTE_SETTINGS_KEY = "my_application_settings";
  const RESEARCH_PLANS_STORAGE_KEY = "my-application.research-plans.v0.1";
  const RESEARCH_SCHEDULES_STORAGE_KEY = "my-application.research-schedules.v0.1";
  const LOCAL_MODE_KEY = "my-application.local-mode";
  const TABLE_NAME = "tasks";
  const RESEARCH_PLANS_TABLE = "research_plans";
  const RESEARCH_SCHEDULES_TABLE = "research_schedules";
  const TASK_SELECT_FIELDS = "id, title, memo, research_report, status, due_date, priority, tags, is_research, research_plan_id, created_at, completed_at, reminder_at, reminder_enabled, updated_at";
  const LEGACY_TASK_SELECT_FIELDS = "id, title, memo, status, due_date, priority, tags, created_at, completed_at, reminder_at, reminder_enabled, updated_at";
  const PLAN_SELECT_FIELDS = "id, title, objective, origin_facts, hypothesis, hypothesis_basis, status, target_date, next_action, notes, created_at, updated_at";
  const LEGACY_PLAN_SELECT_FIELDS = "id, title, objective, status, target_date, next_action, notes, created_at, updated_at";
  const SCHEDULE_SELECT_FIELDS = "id, title, scheduled_at, kind, plan_id, notes, created_at, updated_at";
  const config = window.__MY_APP_CONFIG__ || {};
  const hasRemoteConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  const CORE_PAGE_VIEWS = new Set(["home", "todo"]);
  const BUILTIN_ACTIVITY_IDS = new Set(["hobby", "research", "creation"]);
  const DEFAULT_APP_SETTINGS = Object.freeze({
    appName: "My application",
    brandOverline: "PERSONAL PLATFORM",
    sidebarHeading: "自分の活動を\nここに集める",
    homeTitle: "今日やること",
    homeEmptySubtitle: "今取り組むタスクはありません。",
    taskAddLabel: "タスク追加",
    taskSearchPlaceholder: "タスクを検索",
    homeNavLabel: "ホーム",
    todoNavLabel: "To Do",
    customTags: [],
    activities: [
      { id: "hobby", label: "趣味", description: "動画ごとの構想と台本を、同じプロジェクトで管理します。", icon: "✦" },
      { id: "research", label: "研究", description: "予定・プラン・タスクを、研究の流れに沿ってまとめます。", icon: "⌁" },
      { id: "creation", label: "創作", description: "創作の内容をここで整理します。", icon: "✎" },
    ],
  });
  let activeAppSettings = readAppSettings();
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
    appSettings: activeAppSettings,
    settingsDraft: null,
    taskTagDraft: [],
    sidebarView: getPageViewFromLocation(),
    search: "",
    authMode: "login",
    editingTaskId: null,
    editingPlanId: null,
    editingScheduleId: null,
    editingResearchTaskId: null,
    researchRemoteAvailable: true,
    researchTaskSchemaAvailable: true,
    researchPlanSchemaAvailable: true,
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
    researchTaskTitle: $("researchTaskTitle"),
    researchTaskDescription: $("researchTaskDescription"),
    hobbyTaskList: $("hobbyTaskList"),
    hobbyTaskEmpty: $("hobbyTaskEmpty"),
    hobbyTaskTitle: $("hobbyTaskTitle"),
    hobbyTaskDescription: $("hobbyTaskDescription"),
    creationTaskList: $("creationTaskList"),
    creationTaskEmpty: $("creationTaskEmpty"),
    creationTaskTitle: $("creationTaskTitle"),
    creationTaskDescription: $("creationTaskDescription"),
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
    activityNavList: $("activityNavList"),
    appSettingsButton: $("appSettingsButton"),
    customActivityPages: $("customActivityPages"),
    accountButton: $("accountButton"),
    accountInitial: $("accountInitial"),
    accountMenu: $("accountMenu"),
    accountEmail: $("accountEmail"),
    signOutButton: $("signOutButton"),
    dateLabel: $("dateLabel"),
    homePageTitle: $("homePageTitle"),
    todaySubtitle: $("todaySubtitle"),
    taskAddButtonLabel: $("taskAddButtonLabel"),
    homeNavLabel: $("homeNavLabel"),
    todoNavLabel: $("todoNavLabel"),
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
    taskTagPicker: $("taskTagPicker"),
    taskSelectedTags: $("taskSelectedTags"),
    taskTagInput: $("taskTagInput"),
    taskTagSuggestions: $("taskTagSuggestions"),
    taskResearchPlan: $("taskResearchPlan"),
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
    researchPageTitle: $("researchPageTitle"),
    researchPageSubtitle: $("researchPageSubtitle"),
    hobbyPageTitle: $("hobbyPageTitle"),
    hobbyPageSubtitle: $("hobbyPageSubtitle"),
    creationPageTitle: $("creationPageTitle"),
    creationPageSubtitle: $("creationPageSubtitle"),
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
    researchPlanOriginFacts: $("researchPlanOriginFacts"),
    researchPlanHypothesis: $("researchPlanHypothesis"),
    researchPlanHypothesisBasis: $("researchPlanHypothesisBasis"),
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
     researchTaskDetailModal: $("researchTaskDetailModal"),
     researchTaskDetailTitle: $("researchTaskDetailTitle"),
     researchTaskDetailForm: $("researchTaskDetailForm"),
     researchTaskDetailName: $("researchTaskDetailName"),
     researchTaskDetailMemo: $("researchTaskDetailMemo"),
     researchTaskDetailReport: $("researchTaskDetailReport"),
     researchTaskDetailStatus: $("researchTaskDetailStatus"),
     researchTaskDetailPlan: $("researchTaskDetailPlan"),
     researchTaskDetailDueDate: $("researchTaskDetailDueDate"),
     researchTaskDetailPriority: $("researchTaskDetailPriority"),
     researchTaskDetailContext: $("researchTaskDetailContext"),
     closeResearchTaskDetail: $("closeResearchTaskDetail"),
     cancelResearchTaskDetail: $("cancelResearchTaskDetail"),
     deleteResearchTaskDetail: $("deleteResearchTaskDetail"),
     completeResearchTaskDetail: $("completeResearchTaskDetail"),
    closeResearchScheduleModal: $("closeResearchScheduleModal"),
    cancelResearchScheduleButton: $("cancelResearchScheduleButton"),
    deleteResearchScheduleButton: $("deleteResearchScheduleButton"),
    appSettingsMenu: $("appSettingsMenu"),
    appSettingsForm: $("appSettingsForm"),
    settingsAppName: $("settingsAppName"),
    settingsBrandOverline: $("settingsBrandOverline"),
    settingsSidebarHeading: $("settingsSidebarHeading"),
    settingsHomeTitle: $("settingsHomeTitle"),
    settingsTaskAddLabel: $("settingsTaskAddLabel"),
    settingsTaskSearchPlaceholder: $("settingsTaskSearchPlaceholder"),
    settingsHomeNavLabel: $("settingsHomeNavLabel"),
    settingsTodoNavLabel: $("settingsTodoNavLabel"),
    settingsActivityList: $("settingsActivityList"),
    settingsTagList: $("settingsTagList"),
    newActivityName: $("newActivityName"),
    addActivityButton: $("addActivityButton"),
    newTagName: $("newTagName"),
    addTagButton: $("addTagButton"),
    resetAppSettingsButton: $("resetAppSettingsButton"),
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

  function getSettingsSource() {
    return activeAppSettings || DEFAULT_APP_SETTINGS;
  }

  function isKnownPageView(view) {
    if (CORE_PAGE_VIEWS.has(view)) return true;
    return getSettingsSource().activities.some((activity) => activity.id === view);
  }

  function getPageViewFromLocation() {
    const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
    return isKnownPageView(hash) ? hash : "home";
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

  function normalizeTagCandidate(value) {
    return String(value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 40);
  }

  function normalizeTagCandidates(value) {
    const values = Array.isArray(value) ? value : String(value ?? "").split(/[,、，]/);
    const seen = new Set();
    return values.map(normalizeTagCandidate).filter((tag) => {
      const key = tag.toLocaleLowerCase("ja-JP");
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function tagKey(value) {
    return String(value ?? "").trim().toLocaleLowerCase("ja-JP");
  }

  function hasTag(tags, label) {
    const target = tagKey(label);
    return Boolean(target && normalizeTags(tags).some((tag) => tagKey(tag) === target));
  }

  function getPageTagLabels(settings = state.appSettings || getSettingsSource()) {
    return (settings?.activities || [])
      .map((activity) => normalizeTagCandidate(activity.label))
      .filter(Boolean);
  }

  function getTagCandidates(settings = state.appSettings || getSettingsSource()) {
    const candidates = [];
    const seen = new Set();
    [...getPageTagLabels(settings), ...normalizeTagCandidates(settings?.customTags)].forEach((tag) => {
      const key = tagKey(tag);
      if (!key || seen.has(key)) return;
      seen.add(key);
      candidates.push(tag);
    });
    return candidates;
  }

  function getActivityTagLabel(activityId, settings = state.appSettings || getSettingsSource()) {
    return normalizeTagCandidate((settings?.activities || []).find((activity) => activity.id === activityId)?.label);
  }

  function taskBelongsToActivity(task, activityId) {
    const pageTag = getActivityTagLabel(activityId);
    if (!pageTag) return false;
    return hasTag(task.tags, pageTag);
  }

  function normalizeTask(task = {}) {
    const rawTags = normalizeTags(task.tags);
    const legacyResearch = Boolean(task.is_research ?? task.isResearch ?? task.research_plan_id ?? task.researchPlanId);
    const researchPageTag = getActivityTagLabel("research");
    const tags = legacyResearch && researchPageTag && !hasTag(rawTags, researchPageTag)
      ? [...rawTags, researchPageTag]
      : rawTags;
    return {
      id: task.id || createId(),
      title: String(task.title || "").trim(),
      memo: String(task.memo ?? ""),
      researchReport: String(task.research_report ?? task.researchReport ?? ""),
      tags,
      isResearch: legacyResearch,
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
      research_report: task.researchReport || null,
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
      delete payload.research_report;
    }
    return payload;
  }

  function normalizePlan(plan = {}) {
    return {
      id: plan.id || createId(),
      title: String(plan.title || "").trim(),
      objective: String(plan.objective ?? ""),
      originFacts: String(plan.origin_facts ?? plan.originFacts ?? ""),
      hypothesis: String(plan.hypothesis ?? ""),
      hypothesisBasis: String(plan.hypothesis_basis ?? plan.hypothesisBasis ?? ""),
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
      origin_facts: plan.originFacts || null,
      hypothesis: plan.hypothesis || null,
      hypothesis_basis: plan.hypothesisBasis || null,
      status: plan.status,
      target_date: plan.targetDate || null,
      next_action: plan.nextAction || null,
      notes: plan.notes || null,
      user_id: state.user.id,
    };
    if (!state.researchPlanSchemaAvailable) {
      delete payload.origin_facts;
      delete payload.hypothesis;
      delete payload.hypothesis_basis;
    }
    return payload;
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


  function cloneDefaultAppSettings() {
    return {
      ...DEFAULT_APP_SETTINGS,
      customTags: [...DEFAULT_APP_SETTINGS.customTags],
      activities: DEFAULT_APP_SETTINGS.activities.map((activity) => ({ ...activity })),
    };
  }

  function normalizeAppSettings(value = {}) {
    const source = value && typeof value === "object" ? value : {};
    const defaults = cloneDefaultAppSettings();
    const defaultActivities = new Map(defaults.activities.map((activity) => [activity.id, activity]));
    const textSetting = (key, maxLength) => {
      const candidate = String(source[key] ?? defaults[key]).trim();
      return (candidate || defaults[key]).slice(0, maxLength);
    };
    const rawActivities = Array.isArray(source.activities) ? source.activities : defaults.activities;
    const seen = new Set();
    const activities = rawActivities.map((activity) => {
      const id = String(activity?.id ?? "").trim();
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,80}$/.test(id) || seen.has(id) || CORE_PAGE_VIEWS.has(id)) return null;
      const fallback = defaultActivities.get(id);
      const label = String(activity?.label ?? activity?.name ?? fallback?.label ?? "").trim().slice(0, 40);
      if (!label) return null;
      const description = String(activity?.description ?? fallback?.description ?? "").trim().slice(0, 140);
      const icon = String(activity?.icon ?? fallback?.icon ?? "◇").trim().slice(0, 3) || "◇";
      seen.add(id);
      return {
        id,
        label,
        description,
        icon,
        builtin: BUILTIN_ACTIVITY_IDS.has(id),
      };
    }).filter(Boolean);
    return {
      appName: textSetting("appName", 60),
      brandOverline: textSetting("brandOverline", 60),
      sidebarHeading: textSetting("sidebarHeading", 100),
      homeTitle: textSetting("homeTitle", 60),
      homeEmptySubtitle: textSetting("homeEmptySubtitle", 120),
      taskAddLabel: textSetting("taskAddLabel", 40),
      taskSearchPlaceholder: textSetting("taskSearchPlaceholder", 60),
      homeNavLabel: textSetting("homeNavLabel", 30),
      todoNavLabel: textSetting("todoNavLabel", 30),
      customTags: normalizeTagCandidates(source.customTags ?? source.tagCandidates),
      activities,
    };
  }

  function readAppSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(APP_SETTINGS_STORAGE_KEY) || "null");
      return normalizeAppSettings(saved || {});
    } catch (error) {
      console.warn("アプリ設定の読み込みに失敗しました", error);
      return cloneDefaultAppSettings();
    }
  }

  function writeLocalAppSettings() {
    try {
      localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(state.appSettings));
    } catch (error) {
      console.warn("アプリ設定の保存に失敗しました", error);
    }
  }

  function getActivityById(activityId) {
    return (state.appSettings?.activities || []).find((activity) => activity.id === activityId) || null;
  }

  function applyAppSettings() {
    const settings = state.appSettings || getSettingsSource();
    document.title = settings.appName;
    document.querySelectorAll(".brand-title").forEach((element) => {
      element.textContent = settings.appName;
    });
    document.querySelectorAll(".brand-overline").forEach((element) => {
      element.textContent = settings.brandOverline;
    });
    document.querySelectorAll("[data-brand-home]").forEach((element) => {
      element.setAttribute("aria-label", settings.appName + " " + settings.homeNavLabel);
    });
    const sidebarHeading = document.querySelector(".sidebar-heading");
    if (sidebarHeading) sidebarHeading.textContent = settings.sidebarHeading;
    if (elements.homePageTitle) elements.homePageTitle.textContent = settings.homeTitle;
    if (elements.taskAddButtonLabel) elements.taskAddButtonLabel.textContent = settings.taskAddLabel;
    if (elements.searchInput) elements.searchInput.placeholder = settings.taskSearchPlaceholder;
    if (elements.homeNavLabel) elements.homeNavLabel.textContent = settings.homeNavLabel;
    if (elements.todoNavLabel) elements.todoNavLabel.textContent = settings.todoNavLabel;

    const updateActivityPage = (activityId, titleElement, subtitleElement) => {
      const activity = getActivityById(activityId);
      if (titleElement) titleElement.textContent = activity?.label || "";
      if (subtitleElement) {
        subtitleElement.textContent = activity?.description || "";
        subtitleElement.hidden = !activity?.description;
      }
    };
    updateActivityPage("research", elements.researchPageTitle, elements.researchPageSubtitle);
    updateActivityPage("hobby", elements.hobbyPageTitle, elements.hobbyPageSubtitle);
    updateActivityPage("creation", elements.creationPageTitle, elements.creationPageSubtitle);

    const updateActivityTaskText = (activityId, titleElement, descriptionElement) => {
      const label = getActivityTagLabel(activityId, settings);
      if (!label) return;
      if (titleElement) titleElement.textContent = `${label}タスク`;
      if (descriptionElement) descriptionElement.textContent = `タグに「${label}」を付けたタスクがここに表示されます。`;
      document.querySelectorAll(`[data-activity-task-add="${activityId}"]`).forEach((button) => {
        button.textContent = button.closest(".research-empty") ? `${label}タスクを追加` : `＋ ${label}タスクを追加`;
      });
    };
    updateActivityTaskText("research", elements.researchTaskTitle, elements.researchTaskDescription);
    updateActivityTaskText("hobby", elements.hobbyTaskTitle, elements.hobbyTaskDescription);
    updateActivityTaskText("creation", elements.creationTaskTitle, elements.creationTaskDescription);
  }

  function renderActivityNavigation() {
    if (!elements.activityNavList) return;
    elements.activityNavList.innerHTML = (state.appSettings?.activities || []).map((activity) => `
      <button class="sidebar-nav-item" type="button" data-sidebar-view="${escapeHtml(activity.id)}">
        <span class="sidebar-nav-icon" aria-hidden="true">${escapeHtml(activity.icon)}</span>
        <span class="sidebar-nav-label">${escapeHtml(activity.label)}</span>
      </button>
    `).join("");
  }

  function renderCustomActivityPages() {
    if (!elements.customActivityPages) return;
    elements.customActivityPages.innerHTML = (state.appSettings?.activities || [])
      .filter((activity) => !BUILTIN_ACTIVITY_IDS.has(activity.id))
      .map((activity) => {
        const titleId = "customActivityTitle-" + activity.id;
        const taskTitleId = "customActivityTaskTitle-" + activity.id;
        const taskLabel = escapeHtml(activity.label);
        return `
          <section id="customActivityPage-${escapeHtml(activity.id)}" class="page-view blank-page custom-activity-page" data-page-view="${escapeHtml(activity.id)}" hidden aria-labelledby="${escapeHtml(titleId)}">
            <div class="page-heading">
              <div>
                <p class="section-kicker">ACTIVITY</p>
                <h1 id="${escapeHtml(titleId)}">${escapeHtml(activity.label)}</h1>
                <p class="page-subtitle">${escapeHtml(activity.description || "この活動の内容をここで整理します。")}</p>
              </div>
            </div>
            <div class="blank-page-panel" aria-label="${escapeHtml(activity.label)}の内容">
              <div class="blank-page-mark" aria-hidden="true">${escapeHtml(activity.icon)}</div>
            </div>
            <section class="research-panel activity-task-panel" aria-labelledby="${escapeHtml(taskTitleId)}">
              <div class="research-panel-heading activity-tasks-heading">
                <div>
                  <p class="section-kicker">ACTIVITY TASKS</p>
                  <h2 id="${escapeHtml(taskTitleId)}">${taskLabel}タスク</h2>
                  <p>タグに「${taskLabel}」を付けたタスクがここに表示されます。</p>
                </div>
                <button class="secondary-button" type="button" data-activity-task-add="${escapeHtml(activity.id)}">＋ ${taskLabel}タスクを追加</button>
              </div>
              <div class="task-list activity-task-list" data-activity-task-list="${escapeHtml(activity.id)}"></div>
              <div class="research-empty" data-activity-task-empty="${escapeHtml(activity.id)}" hidden>
                <span class="research-empty-mark" aria-hidden="true">${escapeHtml(activity.icon)}</span>
                <p>${taskLabel}タスクはまだありません。</p>
                <button class="text-button" type="button" data-activity-task-add="${escapeHtml(activity.id)}">${taskLabel}タスクを追加</button>
              </div>
            </section>
          </section>
        `;
      }).join("");
  }

  function renderSettingsActivityList(settings = state.settingsDraft || state.appSettings || cloneDefaultAppSettings()) {
    if (!elements.settingsActivityList) return;
    const activities = settings.activities || [];
    if (!activities.length) {
      elements.settingsActivityList.innerHTML = '<p class="settings-empty">活動項目はありません。</p>';
      return;
    }
    elements.settingsActivityList.innerHTML = activities.map((activity) => `
      <div class="settings-activity-row" data-activity-id="${escapeHtml(activity.id)}">
        <span class="settings-activity-icon" aria-hidden="true">${escapeHtml(activity.icon)}</span>
        <div class="settings-activity-fields">
          <label>
            活動名
            <input data-settings-activity-title type="text" maxlength="40" value="${escapeHtml(activity.label)}" required />
          </label>
          <label>
            説明
            <input data-settings-activity-description type="text" maxlength="140" value="${escapeHtml(activity.description)}" />
          </label>
        </div>
        <div class="settings-activity-actions">
          <span class="settings-activity-badge">${activity.builtin ? "標準" : "追加"}</span>
          <button class="hobby-danger-button" type="button" data-settings-action="delete-activity" aria-label="${escapeHtml(activity.label)}を削除">削除</button>
        </div>
      </div>
    `).join("");
  }

  function renderSettingsTagList(settings = state.settingsDraft || state.appSettings || cloneDefaultAppSettings()) {
    if (!elements.settingsTagList) return;
    const pageTagKeys = new Set(getPageTagLabels(settings).map(tagKey));
    const candidates = getTagCandidates(settings);
    if (!candidates.length) {
      elements.settingsTagList.innerHTML = '<p class="settings-empty">タグ候補はありません。</p>';
      return;
    }
    elements.settingsTagList.innerHTML = candidates.map((tag) => {
      const isPageTag = pageTagKeys.has(tagKey(tag));
      return `
        <div class="settings-tag-row" data-settings-tag="${escapeHtml(tag)}">
          <span class="tag-chip">${escapeHtml(tag)}</span>
          <span class="settings-tag-badge">${isPageTag ? "ページ名" : "任意"}</span>
          ${isPageTag ? "" : `<button class="hobby-danger-button" type="button" data-settings-action="delete-tag" aria-label="${escapeHtml(tag)}をタグ候補から削除">削除</button>`}
        </div>
      `;
    }).join("");
  }

  function fillAppSettingsForm(settings = state.settingsDraft || state.appSettings) {
    const source = settings || cloneDefaultAppSettings();
    elements.settingsAppName.value = source.appName;
    elements.settingsBrandOverline.value = source.brandOverline;
    elements.settingsSidebarHeading.value = source.sidebarHeading;
    elements.settingsHomeTitle.value = source.homeTitle;
    elements.settingsTaskAddLabel.value = source.taskAddLabel;
    elements.settingsTaskSearchPlaceholder.value = source.taskSearchPlaceholder;
    elements.settingsHomeNavLabel.value = source.homeNavLabel;
    elements.settingsTodoNavLabel.value = source.todoNavLabel;
    renderSettingsActivityList(source);
    renderSettingsTagList(source);
  }

  function getAppSettingsFormValue() {
    const source = state.settingsDraft || state.appSettings;
    const activities = (source.activities || []).map((activity) => {
      const row = [...elements.settingsActivityList.querySelectorAll("[data-activity-id]")]
        .find((candidate) => candidate.dataset.activityId === activity.id);
      return {
        ...activity,
        label: row?.querySelector("[data-settings-activity-title]")?.value.trim() || activity.label,
        description: row?.querySelector("[data-settings-activity-description]")?.value.trim() ?? activity.description,
      };
    });
    return normalizeAppSettings({
      ...source,
      appName: elements.settingsAppName.value,
      brandOverline: elements.settingsBrandOverline.value,
      sidebarHeading: elements.settingsSidebarHeading.value,
      homeTitle: elements.settingsHomeTitle.value,
      taskAddLabel: elements.settingsTaskAddLabel.value,
      taskSearchPlaceholder: elements.settingsTaskSearchPlaceholder.value,
      homeNavLabel: elements.settingsHomeNavLabel.value,
      todoNavLabel: elements.settingsTodoNavLabel.value,
      customTags: source.customTags,
      activities,
    });
  }

  function setAppSettingsMenuOpen(isOpen) {
    if (!elements.appSettingsMenu) return;
    elements.appSettingsMenu.hidden = !isOpen;
    elements.appSettingsButton?.setAttribute("aria-expanded", String(isOpen));
  }

  function openAppSettings() {
    elements.accountMenu.hidden = true;
    state.settingsDraft = normalizeAppSettings(state.appSettings);
    fillAppSettingsForm(state.settingsDraft);
    setAppSettingsMenuOpen(true);
    document.body.classList.add("modal-open");
    window.setTimeout(() => {
      if (!elements.appSettingsMenu.hidden) elements.settingsAppName.focus();
    }, 40);
  }

  function closeAppSettings() {
    if (!elements.appSettingsMenu) return;
    setAppSettingsMenuOpen(false);
    state.settingsDraft = null;
    if (
      elements.taskModal.hidden &&
      elements.researchPlanModal.hidden &&
      elements.researchScheduleModal.hidden
    ) {
      document.body.classList.remove("modal-open");
    }
  }

  async function persistAppSettings(nextSettings) {
    const normalized = normalizeAppSettings(nextSettings);
    state.appSettings = normalized;
    activeAppSettings = normalized;
    writeLocalAppSettings();
    if (!isKnownPageView(state.sidebarView)) {
      state.sidebarView = "home";
      updatePageLocation("home", true);
    }
    applyAppSettings();
    render();

    if (state.mode === "remote" && state.user && supabaseClient) {
      const metadata = {
        ...(state.user.user_metadata || {}),
        [REMOTE_SETTINGS_KEY]: normalized,
      };
      const result = await supabaseClient.auth.updateUser({ data: metadata });
      if (result.error) throw result.error;
      if (result.data?.user) state.user = result.data.user;
    }
  }

  async function saveAppSettings(event) {
    event.preventDefault();
    if (!elements.appSettingsForm.reportValidity()) return;
    const saveButton = elements.appSettingsForm.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    try {
      await persistAppSettings(getAppSettingsFormValue());
      state.settingsDraft = null;
      closeAppSettings();
      showToast("設定を保存しました");
    } catch (error) {
      showToast("端末には保存しましたが、同期保存に失敗しました。", true);
    } finally {
      saveButton.disabled = false;
    }
  }

  async function resetAppSettings() {
    if (!window.confirm("表示設定と活動項目を初期状態に戻しますか？")) return;
    const nextSettings = cloneDefaultAppSettings();
    state.settingsDraft = nextSettings;
    try {
      await persistAppSettings(nextSettings);
      state.settingsDraft = normalizeAppSettings(nextSettings);
      fillAppSettingsForm(state.settingsDraft);
      showToast("初期設定に戻しました");
    } catch (error) {
      fillAppSettingsForm(state.settingsDraft);
      showToast("端末には保存しましたが、同期保存に失敗しました。", true);
    }
  }

  function addCustomActivity() {
    const name = elements.newActivityName.value.trim();
    if (!name) {
      showToast("追加する活動名を入力してください。", true);
      elements.newActivityName.focus();
      return;
    }
    const draft = state.settingsDraft || normalizeAppSettings(state.appSettings);
    draft.activities.push({
      id: "activity-" + createId(),
      label: name,
      description: "この活動の内容をここで整理します。",
      icon: "◇",
      builtin: false,
    });
    state.settingsDraft = normalizeAppSettings(draft);
    elements.newActivityName.value = "";
    renderSettingsActivityList(state.settingsDraft);
    renderSettingsTagList(state.settingsDraft);
    elements.newActivityName.focus();
  }

  function addCustomTag() {
    const name = normalizeTagCandidate(elements.newTagName.value);
    if (!name) {
      showToast("追加するタグ候補を入力してください。", true);
      elements.newTagName.focus();
      return;
    }
    const draft = state.settingsDraft || normalizeAppSettings(state.appSettings);
    if (getTagCandidates(draft).some((tag) => tagKey(tag) === tagKey(name))) {
      showToast("そのタグはすでに候補にあります。", true);
      elements.newTagName.focus();
      return;
    }
    draft.customTags = normalizeTagCandidates([...(draft.customTags || []), name]);
    state.settingsDraft = normalizeAppSettings(draft);
    elements.newTagName.value = "";
    renderSettingsTagList(state.settingsDraft);
    elements.newTagName.focus();
  }

  function handleAppSettingsClick(event) {
    const target = event.target.closest("[data-settings-action]");
    if (!target) return;
    const action = target.dataset.settingsAction;
    if (action === "close") {
      closeAppSettings();
      return;
    }
    if (action === "delete-activity") {
      const row = target.closest("[data-activity-id]");
      const activityId = row?.dataset.activityId;
      const activity = state.settingsDraft?.activities.find((item) => item.id === activityId);
      if (!activity || !window.confirm("「" + activity.label + "」を活動項目から削除しますか？")) return;
      state.settingsDraft.activities = state.settingsDraft.activities.filter((item) => item.id !== activityId);
      renderSettingsActivityList(state.settingsDraft);
      renderSettingsTagList(state.settingsDraft);
      return;
    }
    if (action === "delete-tag") {
      const row = target.closest("[data-settings-tag]");
      const tag = row?.dataset.settingsTag;
      if (!tag || !state.settingsDraft) return;
      if (!window.confirm("「" + tag + "」をタグ候補から削除しますか？")) return;
      state.settingsDraft.customTags = normalizeTagCandidates(state.settingsDraft.customTags)
        .filter((candidate) => tagKey(candidate) !== tagKey(tag));
      renderSettingsTagList(state.settingsDraft);
    }
  }

  function loadUserAppSettings(user) {
    const remoteSettings = user?.user_metadata?.[REMOTE_SETTINGS_KEY];
    const nextSettings = remoteSettings ? normalizeAppSettings(remoteSettings) : readAppSettings();
    state.appSettings = nextSettings;
    activeAppSettings = nextSettings;
    writeLocalAppSettings();
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
    const nextPage = isKnownPageView(view) ? view : "home";
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
    closeAppSettings();
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
    return message.includes("research_plan_id") || message.includes("is_research")
      || message.includes("research_report") || message.includes("origin_facts")
      || message.includes("hypothesis_basis") || message.includes("hypothesis");
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

  function renderTaskTagPicker() {
    if (!elements.taskTagPicker) return;
    const selected = normalizeTags(state.taskTagDraft);
    const selectedKeys = new Set(selected.map(tagKey));
    elements.taskTags.value = selected.join(", ");
    elements.taskSelectedTags.innerHTML = selected.map((tag) => `
      <span class="tag-picker-chip tag-chip">
        <span>${escapeHtml(tag)}</span>
        <button type="button" data-task-tag-remove="${escapeHtml(tag)}" aria-label="${escapeHtml(tag)}を外す">×</button>
      </span>
    `).join("");

    const query = tagKey(elements.taskTagInput.value);
    const suggestions = getTagCandidates().filter((tag) => !selectedKeys.has(tagKey(tag)) && (!query || tagKey(tag).includes(query)));
    elements.taskTagSuggestions.innerHTML = suggestions.length
      ? suggestions.map((tag) => `
          <button class="tag-picker-option" type="button" role="option" data-tag-candidate="${escapeHtml(tag)}">
            <span class="tag-chip">${escapeHtml(tag)}</span>
          </button>
        `).join("")
      : '<p class="tag-picker-empty">候補がありません。設定から追加できます。</p>';
    elements.taskTagSuggestions.hidden = document.activeElement !== elements.taskTagInput && !query;
  }

  function showTaskTagSuggestions() {
    renderTaskTagPicker();
    elements.taskTagSuggestions.hidden = false;
  }

  function hideTaskTagSuggestions() {
    elements.taskTagSuggestions.hidden = true;
  }

  function addTaskTag(tag) {
    const candidate = normalizeTagCandidate(tag);
    if (!candidate || state.taskTagDraft.some((item) => tagKey(item) === tagKey(candidate))) return;
    state.taskTagDraft = normalizeTags([...state.taskTagDraft, candidate]);
    elements.taskTagInput.value = "";
    renderTaskTagPicker();
    elements.taskTagInput.focus();
    elements.taskTagSuggestions.hidden = false;
  }

  function handleTaskTagPickerClick(event) {
    const removeButton = event.target.closest("[data-task-tag-remove]");
    if (removeButton) {
      const removeKey = tagKey(removeButton.dataset.taskTagRemove);
      state.taskTagDraft = state.taskTagDraft.filter((tag) => tagKey(tag) !== removeKey);
      renderTaskTagPicker();
      return;
    }
    const option = event.target.closest("[data-tag-candidate]");
    if (option) addTaskTag(option.dataset.tagCandidate);
  }

  function handleTaskTagInputKeydown(event) {
    if (event.key === "Escape") {
      hideTaskTagSuggestions();
      return;
    }
    if (event.key === "Backspace" && !elements.taskTagInput.value && state.taskTagDraft.length) {
      state.taskTagDraft = state.taskTagDraft.slice(0, -1);
      renderTaskTagPicker();
      return;
    }
    if (event.key !== "Enter" && event.key !== "," && event.key !== "、") return;
    event.preventDefault();
    const query = tagKey(elements.taskTagInput.value);
    const candidate = getTagCandidates().find((tag) => tagKey(tag) === query);
    if (candidate) {
      addTaskTag(candidate);
    } else if (query) {
      showToast("タグ候補から選択してください。", true);
    }
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
    const researchMark = taskBelongsToActivity(task, "research")
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
    const openTasks = sortActivityTasks(planTasks.filter((task) => task.status !== "completed"));
    const completedTaskCount = planTasks.filter((task) => task.status === "completed").length;
    const originQuestion = plan.objective || "解決したい疑問点はまだ記録されていません。";
    const originFacts = plan.originFacts || "確認されている事実・根拠はまだ記録されていません。";
    const hypothesis = plan.hypothesis || "仮説はまだ記録されていません。";
    const hypothesisBasis = plan.hypothesisBasis || "仮説の根拠はまだ記録されていません。";
    const taskList = openTasks.length
      ? openTasks.map((task) => ${
          <button class="research-plan-task" type="button" data-research-action="open-task" data-task-id="${escapeHtml(task.id)}">
            <span class="research-plan-task-status" aria-hidden="true"></span>
            <span class="research-plan-task-title">${escapeHtml(task.title)}</span>
            <span class="research-plan-task-arrow" aria-hidden="true">→</span>
          </button>
        }).join("")
      : '<p class="research-plan-task-empty">未完了の進捗タスクはありません。</p>';

    return ${
      <article class="research-plan-item" data-plan-id="${escapeHtml(plan.id)}">
        <div class="research-item-body">
          <div class="research-item-title-row">
            <h3>${escapeHtml(plan.title)}</h3>
            <span class="status-chip research-status-${escapeHtml(plan.status)}">${escapeHtml(PLAN_STATUS_LABELS[plan.status])}</span>
          </div>
          <div class="research-plan-sections">
            <section class="research-plan-section">
              <span class="research-plan-section-label">発端｜解決したい疑問点</span>
              <p>${escapeHtml(originQuestion)}</p>
            </section>
            <section class="research-plan-section">
              <span class="research-plan-section-label">発端｜確認されている事実・根拠</span>
              <p>${escapeHtml(originFacts)}</p>
            </section>
            <section class="research-plan-section">
              <span class="research-plan-section-label">仮説</span>
              <p>${escapeHtml(hypothesis)}</p>
            </section>
            <section class="research-plan-section">
              <span class="research-plan-section-label">仮説の根拠</span>
              <p>${escapeHtml(hypothesisBasis)}</p>
            </section>
          </div>
          <div class="research-plan-progress">
            <div class="research-plan-progress-heading">
              <div>
                <span class="research-plan-section-label">進捗タスク</span>
                <strong>${openTasks.length}件が進行中</strong>
              </div>
              <button class="small-action-button" type="button" data-research-action="add-plan-task">＋ タスク追加</button>
            </div>
            <div class="research-plan-task-list">${taskList}</div>
            <div class="research-item-meta">
              <span>${escapeHtml(formatTargetDate(plan.targetDate))}</span>
              <span>完了済み ${completedTaskCount}件</span>
            </div>
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

  function sortActivityTasks(tasks) {
    return [...tasks].sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      const dueDifference = (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
      if (dueDifference !== 0) return dueDifference;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  function getActivityTasks(activityId) {
    return sortActivityTasks(state.tasks.filter((task) => taskBelongsToActivity(task, activityId)));
  }

  function renderActivityTaskList(activityId, listElement, emptyElement) {
    if (!listElement || !emptyElement) return;
    const activity = getActivityById(activityId);
    const tasks = activity ? getActivityTasks(activityId) : [];
    const label = activity?.label || "活動";
    listElement.innerHTML = tasks.map(renderTask).join("");
    listElement.hidden = tasks.length === 0;
    emptyElement.hidden = tasks.length !== 0;
    const emptyText = emptyElement.querySelector("p");
    if (emptyText) emptyText.textContent = `${label}タスクはまだありません。`;
    emptyElement.querySelectorAll("[data-activity-task-add]").forEach((button) => {
      button.textContent = `${label}タスクを追加`;
    });
  }

  function renderActivityTasks() {
    renderActivityTaskList("research", elements.researchTaskList, elements.researchTaskEmpty);
    renderActivityTaskList("hobby", elements.hobbyTaskList, elements.hobbyTaskEmpty);
    renderActivityTaskList("creation", elements.creationTaskList, elements.creationTaskEmpty);
    document.querySelectorAll("[data-activity-task-list]").forEach((listElement) => {
      const activityId = listElement.dataset.activityTaskList;
      const emptyElement = document.querySelector(`[data-activity-task-empty="${activityId}"]`);
      renderActivityTaskList(activityId, listElement, emptyElement);
    });
  }

  function renderResearch() {
    const openPlans = state.plans.filter((plan) => plan.status !== "completed");
    const now = Date.now();
    const upcomingSchedules = state.schedules.filter((schedule) => {
      const timestamp = new Date(schedule.scheduledAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= now;
    });
    const researchTasks = getActivityTasks("research");
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
    if (state.mode === "remote" && (!state.researchTaskSchemaAvailable || !state.researchPlanSchemaAvailable)) {
      noticeMessages.push("研究プランの構造化項目・レポート保存には、最新のsupabase/schema.sqlをSupabaseのSQL Editorで実行してください。");
    }
    elements.researchDataNotice.hidden = noticeMessages.length === 0;
    elements.researchDataNoticeText.textContent = noticeMessages.join(" ");

    elements.researchScheduleList.innerHTML = sortedSchedules.map(renderResearchSchedule).join("");
    elements.researchScheduleList.hidden = sortedSchedules.length === 0;
    elements.researchScheduleEmpty.hidden = sortedSchedules.length !== 0;

    elements.researchPlanList.innerHTML = sortedPlans.map(renderResearchPlan).join("");
    elements.researchPlanList.hidden = sortedPlans.length === 0;
    elements.researchPlanEmpty.hidden = sortedPlans.length !== 0;

    renderActivityTasks();
  }

  function render() {
    if (!isKnownPageView(state.sidebarView)) {
      state.sidebarView = "home";
      updatePageLocation("home", true);
    }
    applyAppSettings();
    renderActivityNavigation();
    renderCustomActivityPages();

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
    elements.todaySubtitle.textContent = openTasks.length
      ? `${openTasks.length}件の未完了タスクがあります。`
      : state.appSettings.homeEmptySubtitle;

    const isTodoPage = state.sidebarView === "home" || state.sidebarView === "todo";
    elements.todoPage.hidden = !isTodoPage;
    elements.researchPage.hidden = state.sidebarView !== "research" || !getActivityById("research");
    elements.creationPage.hidden = state.sidebarView !== "creation" || !getActivityById("creation");
    elements.hobbyPage.hidden = state.sidebarView !== "hobby" || !getActivityById("hobby");
    elements.customActivityPages.querySelectorAll("[data-page-view]").forEach((page) => {
      page.hidden = page.dataset.pageView !== state.sidebarView;
    });
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
      let plansResult = await supabaseClient
        .from(RESEARCH_PLANS_TABLE)
        .select(state.researchPlanSchemaAvailable ? PLAN_SELECT_FIELDS : LEGACY_PLAN_SELECT_FIELDS)
        .order("updated_at", { ascending: false });
      if (plansResult.error && state.researchPlanSchemaAvailable && isMissingResearchColumn(plansResult.error)) {
        state.researchPlanSchemaAvailable = false;
        plansResult = await supabaseClient
          .from(RESEARCH_PLANS_TABLE)
          .select(LEGACY_PLAN_SELECT_FIELDS)
          .order("updated_at", { ascending: false });
      }
      const schedulesResult = await supabaseClient
        .from(RESEARCH_SCHEDULES_TABLE)
        .select(SCHEDULE_SELECT_FIELDS)
        .order("scheduled_at", { ascending: true });
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
      if (task.researchPlanId) throw new Error(researchSetupMessage());
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
      closeAppSettings();
      setSyncStatus("ログイン待ち", "local");
      showAuth();
      return;
    }

    localStorage.removeItem(LOCAL_MODE_KEY);
    loadUserAppSettings(state.user);
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
    const tags = normalizeTags(state.taskTagDraft);
    const completedAt = status === "completed"
      ? existing?.completedAt || new Date().toISOString()
      : null;
    return normalizeTask({
      id: state.editingTaskId || createId(),
      title: elements.taskTitle.value.trim(),
      memo: elements.taskMemo.value.trim(),
      researchReport: existing?.researchReport || "",
      tags,
      isResearch: hasTag(tags, getActivityTagLabel("research")) || Boolean(researchPlanId),
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
    [elements.taskResearchPlan, elements.researchSchedulePlan, elements.researchTaskDetailPlan].forEach((select) => {
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
      originFacts: elements.researchPlanOriginFacts.value.trim(),
      hypothesis: elements.researchPlanHypothesis.value.trim(),
      hypothesisBasis: elements.researchPlanHypothesisBasis.value.trim(),
      status: elements.researchPlanStatus.value,
      targetDate: elements.researchPlanTargetDate.value || "",
      nextAction: elements.researchPlanNextAction.value.trim(),
      notes: elements.researchPlanNotes.value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async function runRemotePlanMutation(plan, operation) {
    const execute = () => {
      const query = operation === "update"
        ? supabaseClient.from(RESEARCH_PLANS_TABLE).update(toPlanDatabasePayload(plan)).eq("id", plan.id)
        : supabaseClient.from(RESEARCH_PLANS_TABLE).insert(toPlanDatabasePayload(plan));
      return query.select(state.researchPlanSchemaAvailable ? PLAN_SELECT_FIELDS : LEGACY_PLAN_SELECT_FIELDS).single();
    };
    let result = await execute();
    if (result.error && state.researchPlanSchemaAvailable && isMissingResearchColumn(result.error)) {
      state.researchPlanSchemaAvailable = false;
      result = await execute();
    }
    if (result.error) throw result.error;
    return result.data;
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
        const savedPlan = normalizePlan(await runRemotePlanMutation(plan, isEditing ? "update" : "insert"));
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
    elements.researchPlanOriginFacts.value = plan?.originFacts || "";
    elements.researchPlanHypothesis.value = plan?.hypothesis || "";
    elements.researchPlanHypothesisBasis.value = plan?.hypothesisBasis || "";
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

  function openResearchTaskDetail(task = null, options = {}) {
    state.editingResearchTaskId = task?.id || null;
    const planId = task?.researchPlanId || options.researchPlanId || "";
    elements.researchTaskDetailTitle.textContent = task ? "進捗タスクを管理" : "進捗タスクを追加";
    elements.researchTaskDetailName.value = task?.title || "";
    elements.researchTaskDetailMemo.value = task?.memo || "";
    elements.researchTaskDetailReport.value = task?.researchReport || "";
    elements.researchTaskDetailStatus.value = task?.status || "todo";
    elements.researchTaskDetailDueDate.value = task?.dueDate || "";
    elements.researchTaskDetailPriority.value = task?.priority || "medium";
    const plan = getPlanById(planId);
    elements.researchTaskDetailContext.textContent = plan?.title
      ? "研究プラン「" + plan.title + "」の進捗"
      : "研究プランに紐付いていない研究タスク";
    elements.deleteResearchTaskDetail.hidden = !task;
    elements.completeResearchTaskDetail.hidden = !task || task.status === "completed";
    updateResearchPlanSelectors();
    elements.researchTaskDetailPlan.value = planId;
    elements.researchTaskDetailModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(() => elements.researchTaskDetailName.focus(), 40);
  }

  function closeResearchTaskDetail() {
    elements.researchTaskDetailModal.hidden = true;
    state.editingResearchTaskId = null;
    elements.researchTaskDetailForm.reset();
    if (elements.researchPlanModal.hidden && elements.researchScheduleModal.hidden && elements.taskModal.hidden) {
      document.body.classList.remove("modal-open");
    }
  }

  function getResearchTaskDetailFromForm() {
    const existing = state.tasks.find((task) => task.id === state.editingResearchTaskId);
    const status = elements.researchTaskDetailStatus.value;
    const completedAt = status === "completed"
      ? existing?.completedAt || new Date().toISOString()
      : null;
    const researchTag = getActivityTagLabel("research");
    return normalizeTask({
      id: state.editingResearchTaskId || createId(),
      title: elements.researchTaskDetailName.value.trim(),
      memo: elements.researchTaskDetailMemo.value.trim(),
      researchReport: elements.researchTaskDetailReport.value.trim(),
      tags: normalizeTags([...(existing?.tags || []), researchTag]),
      isResearch: true,
      researchPlanId: elements.researchTaskDetailPlan.value || "",
      status,
      dueDate: elements.researchTaskDetailDueDate.value || "",
      priority: elements.researchTaskDetailPriority.value,
      completedAt,
      reminderAt: existing?.reminderAt || "",
      reminderEnabled: Boolean(existing?.reminderEnabled),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async function saveResearchTaskDetail(event) {
    event.preventDefault();
    if (!elements.researchTaskDetailForm.reportValidity()) return;
    const task = getResearchTaskDetailFromForm();
    const isEditing = Boolean(state.editingResearchTaskId);
    const saveButton = elements.researchTaskDetailForm.querySelector("button[type=submit]");
    saveButton.disabled = true;
    try {
      if (state.mode === "local") {
        const index = state.tasks.findIndex((item) => item.id === task.id);
        if (index >= 0) state.tasks[index] = task;
        else state.tasks.unshift(task);
        writeLocalTasks();
        setSyncStatus("この端末のみ", "local");
      } else {
        const data = await runRemoteTaskMutation(task, isEditing ? "update" : "insert");
        if (isEditing) {
          state.tasks = state.tasks.map((item) => item.id === task.id ? normalizeTask(data) : item);
        } else {
          state.tasks.unshift(normalizeTask(data));
        }
        setSyncStatus("同期済み", "synced");
      }
      closeResearchTaskDetail();
      render();
      showToast(task.status === "completed" ? "進捗タスクを完了しました" : (isEditing ? "進捗タスクを更新しました" : "進捗タスクを追加しました"));
    } catch (error) {
      setSyncStatus("同期エラー", "error");
      showToast(toFriendlyError(error), true);
    } finally {
      saveButton.disabled = false;
    }
  }

  function completeResearchTaskFromDetail() {
    if (!state.editingResearchTaskId) return;
    elements.researchTaskDetailStatus.value = "completed";
    elements.researchTaskDetailForm.requestSubmit();
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
    elements.taskModalTitle.textContent = task ? "タスクを編集" : "タスクを追加";
    elements.deleteTaskButton.hidden = !task;
    elements.taskId.value = task?.id || "";
    elements.taskTitle.value = task?.title || "";
    elements.taskMemo.value = task?.memo || "";
    const contextTag = !task && options.activityId ? getActivityTagLabel(options.activityId) : "";
    state.taskTagDraft = normalizeTags(task?.tags || (contextTag ? [contextTag] : []));
    elements.taskTagInput.value = "";
    renderTaskTagPicker();
    updateResearchPlanSelectors();
    elements.taskResearchPlan.value = task?.researchPlanId || "";
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
    state.taskTagDraft = [];
    elements.taskTagInput.value = "";
    hideTaskTagSuggestions();
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
    state.appSettings = readAppSettings();
    activeAppSettings = state.appSettings;
    state.tasks = readLocalTasks();
    state.plans = readLocalCollection(RESEARCH_PLANS_STORAGE_KEY, normalizePlan);
    state.schedules = readLocalCollection(RESEARCH_SCHEDULES_STORAGE_KEY, normalizeSchedule);
    state.researchRemoteAvailable = true;
    state.researchTaskSchemaAvailable = true;
    state.researchPlanSchemaAvailable = true;
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
    if (target.dataset.action === "edit") {
      if (card.closest(".research-task-list")) openResearchTaskDetail(task);
      else openTaskModal(task);
    }
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
    if (emptyAction === "task") return openResearchTaskDetail(null, { researchPlanId: "" });

    const target = event.target.closest("[data-research-action]");
    if (!target) return;
    const action = target.dataset.researchAction;
    const planCard = target.closest("[data-plan-id]");
    const scheduleCard = target.closest("[data-schedule-id]");
    const taskId = target.dataset.taskId;
    if (action === "open-task" && taskId) {
      const task = state.tasks.find((item) => item.id === taskId);
      if (task) openResearchTaskDetail(task);
      return;
    }
    if (action === "add-plan-task" && planCard) {
      openResearchTaskDetail(null, { researchPlanId: planCard.dataset.planId });
      return;
    }
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
    elements.appSettingsButton.addEventListener("click", openAppSettings);
    elements.appSettingsForm.addEventListener("submit", saveAppSettings);
    elements.appSettingsMenu.addEventListener("click", handleAppSettingsClick);
    elements.addActivityButton.addEventListener("click", addCustomActivity);
    elements.addTagButton.addEventListener("click", addCustomTag);
    elements.resetAppSettingsButton.addEventListener("click", resetAppSettings);
    window.addEventListener("hashchange", syncPageFromLocation);
    window.addEventListener("popstate", syncPageFromLocation);
    elements.addTaskButton.addEventListener("click", () => openTaskModal());
    elements.emptyAddButton.addEventListener("click", () => openTaskModal());
    elements.addResearchPlanButton.addEventListener("click", () => openResearchPlanModal());
    elements.addResearchPlanInlineButton.addEventListener("click", () => openResearchPlanModal());
    elements.addResearchScheduleButton.addEventListener("click", () => openResearchScheduleModal());
    elements.addResearchScheduleInlineButton.addEventListener("click", () => openResearchScheduleModal());
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
    elements.taskTagPicker.addEventListener("click", handleTaskTagPickerClick);
    elements.taskTagInput.addEventListener("focus", showTaskTagSuggestions);
    elements.taskTagInput.addEventListener("input", renderTaskTagPicker);
    elements.taskTagInput.addEventListener("keydown", handleTaskTagInputKeydown);
    elements.taskTagInput.addEventListener("blur", () => window.setTimeout(hideTaskTagSuggestions, 120));
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
    elements.researchTaskDetailForm.addEventListener("submit", saveResearchTaskDetail);
    elements.closeResearchTaskDetail.addEventListener("click", closeResearchTaskDetail);
    elements.cancelResearchTaskDetail.addEventListener("click", closeResearchTaskDetail);
    elements.deleteResearchTaskDetail.addEventListener("click", () => deleteTask(state.editingResearchTaskId));
    elements.completeResearchTaskDetail.addEventListener("click", completeResearchTaskFromDetail);
    elements.researchTaskDetailModal.addEventListener("click", (event) => {
      if (event.target === elements.researchTaskDetailModal) closeResearchTaskDetail();
    });
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
    elements.appShell.addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-activity-task-add]");
      if (addButton) {
        openTaskModal(null, { activityId: addButton.dataset.activityTaskAdd });
        return;
      }
      handleTaskListClick(event);
    });
    elements.appShell.addEventListener("keydown", handleTaskListKeydown);
    document.addEventListener("click", (event) => {
      if (!elements.accountMenu.hidden && !event.target.closest(".account-menu, .account-button")) {
        elements.accountMenu.hidden = true;
      }
    });
    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);
      if (event.key === "Escape" && !elements.appSettingsMenu.hidden) closeAppSettings();
      else if (event.key === "Escape" && !elements.taskModal.hidden) closeTaskModal();
      else if (event.key === "Escape" && !elements.researchPlanModal.hidden) closeResearchPlanModal();
      else if (event.key === "Escape" && !elements.researchScheduleModal.hidden) closeResearchScheduleModal();
      else if (event.key === "Escape" && !elements.researchTaskDetailModal.hidden) closeResearchTaskDetail();
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
