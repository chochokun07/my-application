(() => {
  "use strict";

  const STORAGE_KEY = "my-application.tasks.v0.1";
  const NOTIFIED_REMINDERS_STORAGE_KEY = "my-application.notified-reminders.v0.1";
  const WORK_EVENTS_STORAGE_KEY = "my-application.work-events.v0.1";
  const WORK_WARNING_ACK_STORAGE_KEY = "my-application.work-warning-ack.v0.1";
  const WORK_WARNING_NOTIFICATION_STORAGE_KEY = "my-application.work-warning-notifications.v0.1";
  const REMINDER_CHECK_INTERVAL_MS = 15000;
  const WORK_CONTINUOUS_WARNING_MS = 2 * 60 * 60 * 1000;
  const WORK_LONG_CONTINUOUS_WARNING_MS = 4 * 60 * 60 * 1000;
  const APP_SETTINGS_STORAGE_KEY = "my-application.app-settings.v0.1";
  const REMOTE_SETTINGS_KEY = "my_application_settings";
  const RESEARCH_PLANS_STORAGE_KEY = "my-application.research-plans.v0.1";
  const RESEARCH_SCHEDULES_STORAGE_KEY = "my-application.research-schedules.v0.1";
  const RESEARCH_SCHEDULE_HORIZON_STORAGE_KEY = "my-application.research-schedule-horizon.v0.1";
  const NOTES_STORAGE_KEY = "my-application.notes.v0.1";
  const LOCAL_MODE_KEY = "my-application.local-mode";
  const TABLE_NAME = "tasks";
  const WORK_EVENTS_TABLE = "work_events";
  const RESEARCH_PLANS_TABLE = "research_plans";
  const RESEARCH_SCHEDULES_TABLE = "research_schedules";
  const NOTES_TABLE = "notes";
  const TASK_SELECT_FIELDS = "id, title, memo, research_report, status, due_date, priority, tags, is_research, research_plan_id, created_at, completed_at, reminder_at, reminder_enabled, updated_at";
  const LEGACY_TASK_SELECT_FIELDS = "id, title, memo, status, due_date, priority, tags, created_at, completed_at, reminder_at, reminder_enabled, updated_at";
  const PLAN_SELECT_FIELDS = "id, title, objective, origin_facts, hypothesis, hypothesis_basis, status, target_date, next_action, notes, created_at, updated_at";
  const LEGACY_PLAN_SELECT_FIELDS = "id, title, objective, status, target_date, next_action, notes, created_at, updated_at";
  const SCHEDULE_SELECT_FIELDS = "id, title, scheduled_at, kind, plan_id, notes, created_at, updated_at";
  const NOTE_SELECT_FIELDS = "id, title, body, activity_id, tags, created_at, updated_at";
  const WORK_EVENT_SELECT_FIELDS = "id, user_id, event_type, occurred_at, created_at, activity_id, metadata";
  const WORK_EVENT_TYPES = new Set(["start", "break_start", "break_end", "end"]);
  const config = window.__MY_APP_CONFIG__ || {};
  const hasRemoteConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  const CORE_PAGE_VIEWS = new Set(["home", "todo", "notes"]);
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
    notes: [],
    notesRemoteAvailable: true,
    notesDataError: "",
    notesFilter: "all",
    notesSearch: "",
    workEvents: [],
    workRemoteAvailable: true,
    workEventsLoaded: false,
    workTickTimer: null,
    workActionInFlight: false,
    workRecordSaveInFlight: false,
    workEventsLoadSequence: 0,
    workEventsRevision: 0,
    workLogDate: todayKey(),
    workRecordEditorDate: null,
    workRecordEditorFocusSessionId: null,
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
    editingNoteId: null,
    editingPlanId: null,
    editingScheduleId: null,
    editingResearchTaskId: null,
    researchPlanDetailId: null,
    researchRemoteAvailable: true,
    researchTaskSchemaAvailable: true,
    researchPlanSchemaAvailable: true,
    researchDataError: "",
    toastTimer: null,
    notificationTimer: null,
    notificationWarningAt: 0,
  };

  window.__VECTORY_APP_CONTEXT__ = {
    getSupabaseClient: () => supabaseClient,
    getUser: () => state.user,
    getMode: () => state.mode,
  };

  const $ = (id) => document.getElementById(id);
  const elements = {
    appShell: $("appShell"),
    todoPage: $("todoPage"),
    notesPage: $("notesPage"),
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
    workTimerPanel: $("workTimerPanel"),
    workLogModal: $("workLogModal"),
    openWorkLogButton: $("openWorkLogButton"),
    workLogWeekLabel: $("workLogWeekLabel"),
    workLogDayTotal: $("workLogDayTotal"),
    workLogWeekTotal: $("workLogWeekTotal"),
    workLogSelectedDateLabel: $("workLogSelectedDateLabel"),
    workLogCalendar: $("workLogCalendar"),
    workLogEvents: $("workLogEvents"),
    workLogPreviousButton: $("workLogPreviousButton"),
    workLogTodayButton: $("workLogTodayButton"),
    workLogNextButton: $("workLogNextButton"),
    workLogRefreshButton: $("workLogRefreshButton"),
    workLogCategorySummary: $("workLogCategorySummary"),
    closeWorkLogModal: $("closeWorkLogModal"),
    closeWorkLogModalButton: $("closeWorkLogModalButton"),
    workTimerSyncStatus: $("workTimerSyncStatus"),
    workTimerStateLabel: $("workTimerStateLabel"),
    workTimerElapsed: $("workTimerElapsed"),
    workTimerDetail: $("workTimerDetail"),
    workTimerContext: $("workTimerContext"),
    workEditContextButton: $("workEditContextButton"),
    workContextModal: $("workContextModal"),
    workContextForm: $("workContextForm"),
    workContextTask: $("workContextTask"),
    workContextCategory: $("workContextCategory"),
    workContextMemo: $("workContextMemo"),
    closeWorkContextModal: $("closeWorkContextModal"),
    cancelWorkContextButton: $("cancelWorkContextButton"),
    workStartButton: $("workStartButton"),
    workBreakButton: $("workBreakButton"),
    workResumeButton: $("workResumeButton"),
    workEndButton: $("workEndButton"),
    workTimerWarning: $("workTimerWarning"),
    workTimerWarningTitle: $("workTimerWarningTitle"),
    workTimerWarningText: $("workTimerWarningText"),
    workCorrectEndButton: $("workCorrectEndButton"),
    workContinueButton: $("workContinueButton"),
    workAcknowledgeButton: $("workAcknowledgeButton"),
    homePageTitle: $("homePageTitle"),
    todaySubtitle: $("todaySubtitle"),
    taskAddButtonLabel: $("taskAddButtonLabel"),
    homeNavLabel: $("homeNavLabel"),
    todoNavLabel: $("todoNavLabel"),
    taskList: $("taskList"),
    emptyState: $("emptyState"),
    emptyTitle: $("emptyTitle"),
    emptyDescription: $("emptyDescription"),
    notesFilterList: $("notesFilterList"),
    notesSearch: $("notesSearch"),
    notesDataNotice: $("notesDataNotice"),
    notesList: $("notesList"),
    notesEmpty: $("notesEmpty"),
    sidebarNoteCount: $("sidebarNoteCount"),
    authForm: $("authForm"),
    authEmail: $("authEmail"),
    authPassword: $("authPassword"),
    authSubmit: $("authSubmit"),
    authModeButton: $("authModeButton"),
    authMessage: $("authMessage"),
    useLocalButton: $("useLocalButton"),
    openAuthButton: $("openAuthButton"),
    taskModal: $("taskModal"),
    noteModal: $("noteModal"),
    noteModalTitle: $("noteModalTitle"),
    noteForm: $("noteForm"),
    noteId: $("noteId"),
    noteTitle: $("noteTitle"),
    noteActivity: $("noteActivity"),
    noteBody: $("noteBody"),
    deleteNoteButton: $("deleteNoteButton"),
    closeNoteModal: $("closeNoteModal"),
    cancelNoteButton: $("cancelNoteButton"),
    saveNoteButton: $("saveNoteButton"),
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
    researchScheduleHorizon: $("researchScheduleHorizon"),
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
     researchPlanDetailModal: $("researchPlanDetailModal"),
    researchPlanDetailTitle: $("researchPlanDetailTitle"),
    researchPlanDetailBody: $("researchPlanDetailBody"),
    researchPlanDetailTaskList: $("researchPlanDetailTaskList"),
    closeResearchPlanDetail: $("closeResearchPlanDetail"),
    closeResearchPlanDetailButton: $("closeResearchPlanDetailButton"),
    addResearchPlanDetailTask: $("addResearchPlanDetailTask"),
    editResearchPlanFromDetail: $("editResearchPlanFromDetail"),
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
    workCorrectionModal: $("workCorrectionModal"),
    workCorrectionForm: $("workCorrectionForm"),
    workCorrectionAt: $("workCorrectionAt"),
    closeWorkCorrectionModal: $("closeWorkCorrectionModal"),
    cancelWorkCorrectionButton: $("cancelWorkCorrectionButton"),
    workRecordEditorModal: $("workRecordEditorModal"),
    workRecordEditorTitle: $("workRecordEditorTitle"),
    workRecordEditorSummary: $("workRecordEditorSummary"),
    workRecordEditorSessions: $("workRecordEditorSessions"),
    closeWorkRecordEditor: $("closeWorkRecordEditor"),
    closeWorkRecordEditorButton: $("closeWorkRecordEditorButton"),
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


  function normalizeNote(note = {}) {
    return {
      id: note.id || createId(),
      title: String(note.title || "").trim().slice(0, 120),
      body: String(note.body ?? "").slice(0, 30000),
      activityId: String(note.activity_id ?? note.activityId ?? "").trim(),
      tags: normalizeTags(note.tags),
      createdAt: note.created_at ?? note.createdAt ?? new Date().toISOString(),
      updatedAt: note.updated_at ?? note.updatedAt ?? new Date().toISOString(),
    };
  }

  function toNoteDatabasePayload(note) {
    return {
      title: note.title,
      body: note.body || "",
      activity_id: note.activityId || null,
      tags: note.tags,
      updated_at: note.updatedAt,
      user_id: state.user.id,
    };
  }

  function toPlanDatabasePayload(plan) {
    const payload = {
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


  function readLocalNotes() {
    try {
      const saved = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved.map(normalizeNote).filter((note) => note.title) : [];
    } catch (error) {
      console.warn("ローカルノートの読み込みに失敗しました", error);
      return [];
    }
  }

  function writeLocalNotes() {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(state.notes));
  }

  function getWorkStorageScope() {
    return state.user?.id || "local";
  }

  function getWorkEventsStorageKey() {
    return `${WORK_EVENTS_STORAGE_KEY}.${getWorkStorageScope()}`;
  }

  function getWorkWarningStorageKey(baseKey) {
    return `${baseKey}.${getWorkStorageScope()}`;
  }

  function normalizeWorkEvent(event = {}) {
    const eventType = String(event.event_type ?? event.eventType ?? "").trim();
    if (!WORK_EVENT_TYPES.has(eventType)) return null;
    const occurredDate = new Date(event.occurred_at ?? event.occurredAt ?? "");
    if (Number.isNaN(occurredDate.getTime())) return null;
    const createdDate = new Date(event.created_at ?? event.createdAt ?? occurredDate.toISOString());
    return {
      id: String(event.id || createId()),
      eventType,
      occurredAt: occurredDate.toISOString(),
      createdAt: Number.isNaN(createdDate.getTime()) ? new Date().toISOString() : createdDate.toISOString(),
      activityId: String(event.activity_id ?? event.activityId ?? "").trim() || null,
      metadata: event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? { ...event.metadata }
        : {},
    };
  }

  function normalizeWorkContext(context = {}) {
    const source = context && typeof context === "object" ? context : {};
    const taskId = String(source.taskId ?? source.task_id ?? "").trim();
    const taskTitle = String(source.taskTitle ?? source.task_title ?? "").trim().slice(0, 120);
    const category = String(source.category ?? source.genre ?? "").trim().slice(0, 80);
    const memo = String(source.memo ?? source.note ?? source.workMemo ?? "").trim().slice(0, 2000);
    const activityId = String(source.activityId ?? source.activity_id ?? "").trim();
    return {
      taskId: taskId || null,
      taskTitle: taskTitle || null,
      category: category || null,
      memo: memo || null,
      activityId: activityId || null,
    };
  }

  function getWorkContextFromEvent(event) {
    const metadata = event?.metadata || {};
    return normalizeWorkContext({
      taskId: metadata.taskId ?? metadata.task_id,
      taskTitle: metadata.taskTitle ?? metadata.task_title,
      category: metadata.category ?? metadata.genre,
      memo: metadata.memo ?? metadata.note ?? metadata.workMemo,
      activityId: event?.activityId ?? metadata.activityId ?? metadata.activity_id,
    });
  }

  function hasWorkContext(context) {
    return Boolean(context?.taskId || context?.taskTitle || context?.category || context?.memo);
  }

  function workContextsMatch(left, right) {
    const first = normalizeWorkContext(left);
    const second = normalizeWorkContext(right);
    return ["taskId", "taskTitle", "category", "memo", "activityId"]
      .every((key) => first[key] === second[key]);
  }

  function getWorkContextMetadata(context, source = "button") {
    const normalized = normalizeWorkContext(context);
    const metadata = { source };
    if (normalized.taskId) metadata.taskId = normalized.taskId;
    if (normalized.taskTitle) metadata.taskTitle = normalized.taskTitle;
    if (normalized.category) metadata.category = normalized.category;
    if (normalized.memo) metadata.memo = normalized.memo;
    return metadata;
  }

  function getWorkCategoryCandidates(task = null) {
    const candidates = getTagCandidates();
    normalizeTags(task?.tags).forEach((tag) => {
      if (!candidates.some((candidate) => tagKey(candidate) === tagKey(tag))) candidates.push(tag);
    });
    return candidates;
  }

  function getDefaultWorkCategory(task) {
    if (!task) return "";
    const activity = (state.appSettings?.activities || []).find((item) => taskBelongsToActivity(task, item.id));
    return activity ? getActivityTagLabel(activity.id) : normalizeTags(task.tags)[0] || "";
  }

  function getWorkActivityId(task, category) {
    const activity = (state.appSettings?.activities || []).find((item) => {
      const belongsToTask = task ? taskBelongsToActivity(task, item.id) : false;
      return belongsToTask || tagKey(getActivityTagLabel(item.id)) === tagKey(category);
    });
    return activity?.id || null;
  }

  function sortWorkEvents(events) {
    return events.filter(Boolean).sort((a, b) => {
      const occurredDifference = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      if (occurredDifference !== 0) return occurredDifference;
      const createdDifference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdDifference !== 0) return createdDifference;
      return a.id.localeCompare(b.id);
    });
  }

  function readLocalWorkEvents() {
    try {
      const saved = JSON.parse(localStorage.getItem(getWorkEventsStorageKey()) || "[]");
      return Array.isArray(saved) ? sortWorkEvents(saved.map(normalizeWorkEvent)) : [];
    } catch (error) {
      console.warn("ローカル作業記録の読み込みに失敗しました", error);
      return [];
    }
  }

  function writeLocalWorkEvents() {
    try {
      localStorage.setItem(getWorkEventsStorageKey(), JSON.stringify(sortWorkEvents(state.workEvents)));
    } catch (error) {
      console.warn("ローカル作業記録の保存に失敗しました", error);
    }
  }

  function upsertWorkEvent(event) {
    const normalized = normalizeWorkEvent(event);
    if (!normalized) return null;
    state.workEvents = sortWorkEvents([...state.workEvents.filter((item) => item.id !== normalized.id), normalized]);
    state.workEventsRevision += 1;
    return normalized;
  }

  function toWorkDatabasePayload(event) {
    return {
      user_id: state.user.id,
      event_type: event.eventType,
      occurred_at: event.occurredAt,
      activity_id: event.activityId || null,
      metadata: event.metadata || {},
    };
  }

  function setWorkSyncStatus(label, status) {
    if (!elements.workTimerSyncStatus) return;
    elements.workTimerSyncStatus.textContent = label;
    elements.workTimerSyncStatus.dataset.state = status;
  }

  function syncWorkStatusLabel() {
    if (state.mode === "local") {
      setWorkSyncStatus("この端末のみ", "local");
    } else if (!state.workRemoteAvailable) {
      setWorkSyncStatus("この端末に保存", "warning");
    } else {
      setWorkSyncStatus("Supabase同期", "synced");
    }
  }

  function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function calculateWorkDuration(events, now = Date.now()) {
    let workingStartedAt = null;
    let total = 0;
    sortWorkEvents(events).forEach((event) => {
      const timestamp = new Date(event.occurredAt).getTime();
      if (!Number.isFinite(timestamp)) return;
      if (event.eventType === "start") {
        if (workingStartedAt === null) workingStartedAt = timestamp;
      } else if (event.eventType === "break_start") {
        if (workingStartedAt !== null) total += Math.max(0, timestamp - workingStartedAt);
        workingStartedAt = null;
      } else if (event.eventType === "break_end") {
        workingStartedAt = timestamp;
      } else if (event.eventType === "end") {
        if (workingStartedAt !== null) total += Math.max(0, timestamp - workingStartedAt);
        workingStartedAt = null;
      }
    });
    if (workingStartedAt !== null) total += Math.max(0, now - workingStartedAt);
    return total;
  }

  function getWorkSnapshot(now = Date.now()) {
    const events = sortWorkEvents([...state.workEvents]);
    const lastEvent = events.length ? events[events.length - 1] : null;
    let lastEndIndex = -1;
    events.forEach((event, index) => {
      if (event.eventType === "end") lastEndIndex = index;
    });
    const sessionEvents = events.slice(lastEndIndex + 1);
    const sessionStartEvent = sessionEvents.find((event) => event.eventType === "start") || null;
    const segmentStartEvent = [...sessionEvents].reverse().find((event) => ["start", "break_start", "break_end"].includes(event.eventType)) || null;
    const sessionLastEvent = sessionEvents.length ? sessionEvents[sessionEvents.length - 1] : null;
    const status = sessionLastEvent?.eventType === "start" || sessionLastEvent?.eventType === "break_end"
      ? "working"
      : sessionLastEvent?.eventType === "break_start"
        ? "break"
        : "idle";
    const sessionStartAt = sessionStartEvent?.occurredAt || null;
    const segmentStartAt = status === "idle" ? null : segmentStartEvent?.occurredAt || null;
    const segmentStartMs = segmentStartAt ? new Date(segmentStartAt).getTime() : NaN;
    return {
      events,
      lastEvent,
      sessionStartEvent,
      sessionEvents,
      status,
      sessionStartAt,
      segmentStartAt,
      elapsedMs: Number.isFinite(segmentStartMs) ? Math.max(0, now - segmentStartMs) : 0,
      sessionLastEvent,
      totalWorkMs: calculateWorkDuration(sessionEvents, now),
    };
  }

  function getWorkWarningSnapshot(now = Date.now()) {
    const snapshot = getWorkSnapshot(now);
    if (snapshot.status === "idle" || !snapshot.sessionStartAt || !snapshot.segmentStartAt) return null;
    const sessionStartMs = new Date(snapshot.sessionStartAt).getTime();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    let warning = null;

    if (sessionStartMs < todayStart.getTime()) {
      const stateLabel = snapshot.status === "break" ? "休憩" : "作業";
      warning = {
        kind: snapshot.status === "break" ? "overnight_break" : "overnight_work",
        title: snapshot.status === "break" ? "休憩状態を確認してください" : "前日から作業中です",
        text: `${formatDateTime(snapshot.sessionStartAt)}から${stateLabel}中のままです。終了時刻を修正するか、そのまま継続してください。`,
        needsCorrection: true,
      };
    } else if (snapshot.status === "working" && snapshot.elapsedMs >= WORK_LONG_CONTINUOUS_WARNING_MS) {
      warning = {
        kind: "long_work",
        title: "非常に長い連続作業です",
        text: `${formatDuration(snapshot.elapsedMs)}連続で作業中です。現在も作業中か確認してください。`,
        needsCorrection: false,
      };
    } else if (snapshot.status === "working" && snapshot.elapsedMs >= WORK_CONTINUOUS_WARNING_MS) {
      warning = {
        kind: "continuous_work",
        title: "連続作業を確認してください",
        text: `${formatDuration(snapshot.elapsedMs)}連続で作業中です。現在も作業中ですか？`,
        needsCorrection: false,
      };
    }
    if (!warning) return null;
    return {
      ...warning,
      key: `${warning.kind}:${snapshot.sessionStartAt}:${snapshot.segmentStartAt}`,
      snapshot,
    };
  }

  function readWorkWarningKeys(storageKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(getWorkWarningStorageKey(storageKey)) || "[]");
      return new Set(Array.isArray(saved) ? saved.filter((value) => typeof value === "string") : []);
    } catch (_) {
      return new Set();
    }
  }

  function writeWorkWarningKeys(storageKey, keys) {
    try {
      localStorage.setItem(getWorkWarningStorageKey(storageKey), JSON.stringify([...keys].slice(-100)));
    } catch (_) {
      // 警告済み状態を保存できなくても、作業記録の保存は継続する。
    }
  }

  function isWorkWarningAcknowledged(warning) {
    return Boolean(warning && readWorkWarningKeys(WORK_WARNING_ACK_STORAGE_KEY).has(warning.key));
  }

  function acknowledgeWorkWarning(warning) {
    if (!warning) return;
    const keys = readWorkWarningKeys(WORK_WARNING_ACK_STORAGE_KEY);
    keys.add(warning.key);
    writeWorkWarningKeys(WORK_WARNING_ACK_STORAGE_KEY, keys);
    renderWorkTimer();
  }

  function showWorkWarningNotification(warning) {
    const NotificationApi = window.Notification;
    if (!NotificationApi || NotificationApi.permission !== "granted") return false;
    try {
      const notification = new NotificationApi("作業時間の確認", {
        body: warning.text,
        icon: "./assets/icon-192.png",
        tag: "work-warning-" + warning.key,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (state.sidebarView !== "home" && state.sidebarView !== "todo") navigateToPage("home");
      };
      return true;
    } catch (error) {
      console.warn("作業時間の警告通知の表示に失敗しました", error);
      return false;
    }
  }

  function checkWorkWarnings() {
    if (!state.workEventsLoaded) return;
    const warning = getWorkWarningSnapshot();
    if (!warning || isWorkWarningAcknowledged(warning)) return;
    const notifiedKeys = readWorkWarningKeys(WORK_WARNING_NOTIFICATION_STORAGE_KEY);
    if (notifiedKeys.has(warning.key)) return;
    if (showWorkWarningNotification(warning)) {
      notifiedKeys.add(warning.key);
      writeWorkWarningKeys(WORK_WARNING_NOTIFICATION_STORAGE_KEY, notifiedKeys);
    }
  }

  function renderWorkTimer() {
    if (!elements.workTimerPanel) return;
    const snapshot = getWorkSnapshot();
    const stateLabels = { idle: "未作業", working: "● 作業中", break: "休憩中" };
    const stateLabel = stateLabels[snapshot.status] || stateLabels.idle;
    elements.workTimerStateLabel.textContent = stateLabel;
    elements.workTimerStateLabel.dataset.state = snapshot.status;
    elements.workTimerElapsed.textContent = snapshot.status === "idle" ? "00:00:00" : formatDuration(snapshot.elapsedMs);
    elements.workTimerDetail.textContent = snapshot.status === "idle"
      ? snapshot.lastEvent?.eventType === "end"
        ? "最終終了 " + formatDateTime(snapshot.lastEvent.occurredAt)
        : "記録はまだありません。"
      : "開始 " + formatDateTime(snapshot.sessionStartAt) + " · 今回の実作業 " + formatDuration(snapshot.totalWorkMs);

    const context = getWorkContextFromEvent(snapshot.sessionStartEvent);
    const contextParts = [];
    if (context.taskTitle) contextParts.push("タスク: " + context.taskTitle);
    if (context.category) contextParts.push("ジャンル: " + context.category);
    if (!contextParts.length && context.memo) contextParts.push("作業メモを記録済み");
    elements.workTimerContext.hidden = contextParts.length === 0;
    elements.workTimerContext.textContent = contextParts.join(" · ");
    if (elements.workEditContextButton) {
      elements.workEditContextButton.hidden = snapshot.status === "idle" || !snapshot.sessionStartEvent;
      elements.workEditContextButton.textContent = hasWorkContext(context) ? "内容を編集" : "内容を追加";
    }

    elements.workTimerPanel.dataset.state = snapshot.status;
    elements.workStartButton.hidden = snapshot.status !== "idle";
    elements.workBreakButton.hidden = snapshot.status !== "working";
    elements.workResumeButton.hidden = snapshot.status !== "break";
    elements.workEndButton.hidden = snapshot.status === "idle";
    [elements.workStartButton, elements.workBreakButton, elements.workResumeButton, elements.workEndButton]
      .forEach((button) => { if (button) button.disabled = state.workActionInFlight; });
    syncWorkStatusLabel();

    const warning = getWorkWarningSnapshot();
    const showWarning = Boolean(warning && !isWorkWarningAcknowledged(warning));
    elements.workTimerWarning.hidden = !showWarning;
    if (showWarning) {
      elements.workTimerWarningTitle.textContent = warning.title;
      elements.workTimerWarningText.textContent = warning.text;
      elements.workCorrectEndButton.hidden = !warning.needsCorrection;
      elements.workContinueButton.hidden = !warning.needsCorrection;
      elements.workAcknowledgeButton.hidden = warning.needsCorrection;
    }
  }



  const WORK_EVENT_LABELS = {
    start: "作業開始",
    break_start: "休憩開始",
    break_end: "作業再開",
    end: "作業終了",
  };

  function getWorkDateKey(value) {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function parseWorkDateKey(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function getWorkWeekStart(value) {
    const date = parseWorkDateKey(value);
    const dayFromMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dayFromMonday);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function formatWorkWeekLabel(start) {
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 6);
    const formatter = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" });
    const yearFormatter = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
    if (start.getFullYear() === end.getFullYear()) return formatter.format(start) + " — " + formatter.format(end);
    return yearFormatter.format(start) + " — " + yearFormatter.format(end);
  }

  function formatWorkLogLongDate(value) {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).format(value);
  }

  function formatWorkClock(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ja-JP", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function formatWorkDurationShort(milliseconds) {
    const totalMinutes = Math.round(Math.max(0, Number(milliseconds || 0)) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours) return hours + "h" + (minutes ? String(minutes).padStart(2, "0") + "m" : "");
    return minutes + "m";
  }

  function buildWorkSegments(events, now = Date.now()) {
    let workingStartedAt = null;
    let workingContext = null;
    let breakStartedAt = null;
    let breakContext = null;
    const segments = [];
    const addSegment = (kind, start, end, context = {}) => {
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
      segments.push({ kind, start, end, context: normalizeWorkContext(context) });
    };

    sortWorkEvents(events).forEach((event) => {
      const timestamp = new Date(event.occurredAt).getTime();
      if (!Number.isFinite(timestamp)) return;
      const eventContext = getWorkContextFromEvent(event);
      const hasEventContext = hasWorkContext(eventContext);

      if (event.eventType === "start") {
        if (workingStartedAt === null && breakStartedAt === null) {
          workingStartedAt = timestamp;
          workingContext = eventContext;
        }
      } else if (event.eventType === "break_start") {
        if (workingStartedAt !== null) addSegment("work", workingStartedAt, timestamp, workingContext);
        const nextContext = hasEventContext ? eventContext : (workingContext || breakContext || {});
        workingStartedAt = null;
        workingContext = null;
        if (breakStartedAt === null) {
          breakStartedAt = timestamp;
          breakContext = nextContext;
        }
      } else if (event.eventType === "break_end") {
        if (breakStartedAt !== null) addSegment("break", breakStartedAt, timestamp, breakContext);
        const nextContext = hasEventContext ? eventContext : (breakContext || workingContext || {});
        breakStartedAt = null;
        breakContext = null;
        workingStartedAt = timestamp;
        workingContext = nextContext;
      } else if (event.eventType === "end") {
        const endContext = hasEventContext ? eventContext : (workingContext || breakContext || {});
        if (workingStartedAt !== null) addSegment("work", workingStartedAt, timestamp, workingContext || endContext);
        if (breakStartedAt !== null) addSegment("break", breakStartedAt, timestamp, breakContext || endContext);
        workingStartedAt = null;
        workingContext = null;
        breakStartedAt = null;
        breakContext = null;
      }
    });

    if (workingStartedAt !== null) addSegment("work", workingStartedAt, now, workingContext);
    if (breakStartedAt !== null) addSegment("break", breakStartedAt, now, breakContext);
    return segments;
  }


  function buildWorkSessions(events, now = Date.now()) {
    const sessions = [];
    let current = null;
    const pushCurrent = () => {
      if (!current || !current.events.length) return;
      const contextEvent = current.events.find((event) => hasWorkContext(getWorkContextFromEvent(event)));
      const startEvent = current.startEvent || current.events[0];
      const endEvent = current.events.find((event) => event.eventType === "end") || null;
      const segments = buildWorkSegments(current.events, now);
      sessions.push({
        id: String(startEvent?.id || current.events[0].id),
        startEvent,
        endEvent,
        events: [...current.events],
        segments,
        context: getWorkContextFromEvent(contextEvent || startEvent),
      });
      current = null;
    };

    sortWorkEvents(events).forEach((event) => {
      if (event.eventType === "start") {
        pushCurrent();
        current = { startEvent: event, events: [event] };
        return;
      }
      if (!current) current = { startEvent: null, events: [] };
      current.events.push(event);
      if (event.eventType === "end") pushCurrent();
    });
    pushCurrent();
    return sessions;
  }

  function getWorkSessionsForDate(dateKey, now = Date.now()) {
    const day = parseWorkDateKey(dateKey);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return buildWorkSessions(state.workEvents, now).filter((session) => {
      const hasEventOnDay = session.events.some((event) => {
        const timestamp = new Date(event.occurredAt).getTime();
        return Number.isFinite(timestamp) && timestamp >= dayStart && timestamp < dayEnd;
      });
      const hasSegmentOnDay = session.segments.some((segment) => segment.end > dayStart && segment.start < dayEnd);
      return hasEventOnDay || hasSegmentOnDay;
    });
  }

  function getWorkSessionStatusLabel(session) {
    const lastEvent = session.events[session.events.length - 1];
    if (lastEvent?.eventType === "end") return "終了済み";
    if (lastEvent?.eventType === "break_start") return "休憩中";
    return "作業中";
  }

  function clipWorkSegmentsToDay(segments, day) {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return segments.map((segment) => ({
      ...segment,
      start: Math.max(segment.start, dayStart),
      end: Math.min(segment.end, dayEnd),
    })).filter((segment) => segment.end > segment.start);
  }

  function getWorkRangeDuration(segments, rangeStart, rangeEnd, kind = "work") {
    return segments.filter((segment) => segment.kind === kind).reduce((total, segment) => {
      const start = Math.max(segment.start, rangeStart);
      const end = Math.min(segment.end, rangeEnd);
      return total + (end > start ? end - start : 0);
    }, 0);
  }

  function getWorkEventAnomalyMap(events) {
    const anomalies = new Map();
    let currentState = "idle";
    sortWorkEvents(events).forEach((event) => {
      let message = "";
      if (event.eventType === "start") {
        if (currentState !== "idle") message = "作業中に再度開始";
        currentState = "working";
      } else if (event.eventType === "break_start") {
        if (currentState !== "working") message = "作業中以外で休憩開始";
        currentState = "break";
      } else if (event.eventType === "break_end") {
        if (currentState !== "break") message = "休憩中以外で作業再開";
        currentState = "working";
      } else if (event.eventType === "end") {
        if (currentState === "idle") message = "作業中以外で終了";
        currentState = "idle";
      }
      if (message) anomalies.set(event.id, message);
    });
    return anomalies;
  }

  function getWorkSourceLabel() {
    if (state.mode === "local") return "この端末";
    return state.workRemoteAvailable ? "Supabase" : "端末フォールバック";
  }

  function getWorkEventSourceLabel(event) {
    const source = event.metadata?.source;
    if (source === "button") return "操作";
    if (source === "manual_correction") return "手動修正";
    return "記録時不明";
  }

  function renderWorkLogCategorySummary(segments, rangeStart, rangeEnd) {
    if (!elements.workLogCategorySummary) return;
    const totals = new Map();
    segments.filter((segment) => segment.kind === "work").forEach((segment) => {
      const start = Math.max(segment.start, rangeStart);
      const end = Math.min(segment.end, rangeEnd);
      if (end <= start) return;
      const label = segment.context?.category || "未分類";
      totals.set(label, (totals.get(label) || 0) + end - start);
    });
    const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      elements.workLogCategorySummary.innerHTML = '<span class="work-log-category-empty">ジャンル別の記録はありません。</span>';
      return;
    }
    elements.workLogCategorySummary.innerHTML =
      '<span class="work-log-category-summary-label">ジャンル別</span>' +
      entries.map(([label, milliseconds]) =>
        '<span class="work-log-category-chip"><strong>' + escapeHtml(label) + '</strong> ' +
        escapeHtml(formatWorkDurationShort(milliseconds)) + '</span>'
      ).join("");
  }

  function renderWorkLog() {
    if (!elements.workLogModal || elements.workLogModal.hidden) return;
    const selectedDate = state.workLogDate || todayKey();
    const weekStart = getWorkWeekStart(selectedDate);
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart.getTime());
      day.setDate(day.getDate() + index);
      return day;
    });
    const segments = buildWorkSegments(state.workEvents);
    const weekWorkMs = getWorkRangeDuration(segments, weekStartMs, weekEndMs, "work");
    const selectedDay = parseWorkDateKey(selectedDate);
    const selectedDaySegments = clipWorkSegmentsToDay(segments, selectedDay);
    const selectedDayWorkMs = selectedDaySegments
      .filter((segment) => segment.kind === "work")
      .reduce((total, segment) => total + segment.end - segment.start, 0);
    const todayDateKey = todayKey();
    const dayFormatter = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" });
    const weekdayFormatter = new Intl.DateTimeFormat("ja-JP", { weekday: "short" });
    const hourLabels = [0, 6, 12, 18, 24].map((hour) => {
      return '<span class="work-log-time-label" style="top:' + (hour / 24 * 100) + '%">' + String(hour).padStart(2, "0") + ':00</span>';
    }).join("");

    elements.workLogWeekLabel.textContent = formatWorkWeekLabel(weekStart);
    elements.workLogDayTotal.textContent = formatDuration(selectedDayWorkMs);
    elements.workLogWeekTotal.textContent = formatDuration(weekWorkMs);
    renderWorkLogCategorySummary(segments, weekStartMs, weekEndMs);
    elements.workLogSelectedDateLabel.textContent = formatWorkLogLongDate(parseWorkDateKey(selectedDate));

    const timeAxis = '<div class="work-log-time-axis" aria-hidden="true">' + hourLabels + '</div>';
    const columns = days.map((day) => {
      const key = getWorkDateKey(day);
      const daySegments = clipWorkSegmentsToDay(segments, day);
      const dayWorkMs = daySegments.filter((segment) => segment.kind === "work")
        .reduce((total, segment) => total + segment.end - segment.start, 0);
      const blocks = daySegments.map((segment) => {
        const top = ((segment.start - day.getTime()) / (24 * 60 * 60 * 1000)) * 100;
        const height = Math.max(1.4, ((segment.end - segment.start) / (24 * 60 * 60 * 1000)) * 100);
        const taskTitle = segment.context?.taskTitle || "";
        const category = segment.context?.category || "";
        const label = taskTitle || category || (segment.kind === "work" ? "作業" : "休憩");
        const contextTitle = [
          taskTitle,
          category ? "ジャンル: " + category : "",
          segment.context?.memo ? "メモ: " + segment.context.memo : "",
        ].filter(Boolean).join(" · ");
        const title = [label + " " + formatWorkClock(segment.start) + "–" + formatWorkClock(segment.end), contextTitle]
          .filter(Boolean)
          .join(" · ");
        return '<span class="work-log-block work-log-block-' + segment.kind + '" style="top:' + top + '%;height:' + height + '%" title="' + escapeHtml(title) + '">' + escapeHtml(label) + '</span>';
      }).join("");
      const selectedClass = key === selectedDate ? " is-selected" : "";
      const todayClass = key === todayDateKey ? " is-today" : "";
      return '<div class="work-log-day-column' + selectedClass + '">' +
        '<button class="work-log-day-header' + todayClass + '" type="button" data-work-log-date="' + escapeHtml(key) + '" aria-label="' + escapeHtml(formatWorkLogLongDate(day) + 'の作業記録を編集') + '" aria-pressed="' + (key === selectedDate ? "true" : "false") + '">' +
          '<span>' + escapeHtml(dayFormatter.format(day)) + '</span>' +
          '<strong>' + escapeHtml(weekdayFormatter.format(day)) + '</strong>' +
          '<em>' + escapeHtml(formatWorkDurationShort(dayWorkMs)) + '</em>' +
        '</button>' +
        '<div class="work-log-day-body">' + blocks + '</div>' +
      '</div>';
    }).join("");

    elements.workLogCalendar.innerHTML = '<div class="work-log-calendar-grid">' + timeAxis + columns + '</div>';

    const selectedEvents = sortWorkEvents(state.workEvents.filter((event) => getWorkDateKey(event.occurredAt) === selectedDate));
    const anomalyMap = getWorkEventAnomalyMap(state.workEvents);
    if (!selectedEvents.length) {
      elements.workLogEvents.innerHTML = '<li class="work-log-empty">この日のイベントはありません。</li>';
      return;
    }
    elements.workLogEvents.innerHTML = selectedEvents.map((event, index) => {
      const occurredDate = new Date(event.occurredAt);
      const createdDate = new Date(event.createdAt);
      const createdText = Number.isFinite(createdDate.getTime()) &&
        Math.abs(createdDate.getTime() - occurredDate.getTime()) > 60 * 1000
        ? '<small>登録 ' + escapeHtml(formatDateTime(event.createdAt)) + '</small>'
        : "";
      const anomaly = anomalyMap.get(event.id);
      const anomalyText = anomaly ? '<span class="work-log-event-warning">' + escapeHtml(anomaly) + '</span>' : "";
      const context = getWorkContextFromEvent(event);
      const contextParts = [];
      if (context.taskTitle) contextParts.push('<span class="work-log-context-task">タスク: ' + escapeHtml(context.taskTitle) + '</span>');
      if (context.category) contextParts.push('<span class="work-log-context-category">ジャンル: ' + escapeHtml(context.category) + '</span>');
      if (context.memo) contextParts.push('<span class="work-log-context-memo">メモ: ' + escapeHtml(context.memo) + '</span>');
      const previousEvent = index > 0 ? selectedEvents[index - 1] : null;
      const showContext = contextParts.length > 0 &&
        (!previousEvent || !workContextsMatch(context, getWorkContextFromEvent(previousEvent)));
      const contextHtml = showContext
        ? '<div class="work-log-event-context">' + contextParts.join("") + '</div>'
        : "";
      return '<li class="work-log-event-item work-log-event-' + escapeHtml(event.eventType) + '">' +
        '<time datetime="' + escapeHtml(event.occurredAt) + '">' + escapeHtml(formatDateTime(event.occurredAt)) + '</time>' +
        '<div class="work-log-event-content">' +
          '<div class="work-log-event-line">' +
            '<strong>' + escapeHtml(WORK_EVENT_LABELS[event.eventType] || event.eventType) + '</strong>' +
            '<span class="work-log-event-source">' + escapeHtml(getWorkEventSourceLabel(event)) + '</span>' +
            anomalyText + createdText +
          '</div>' +
          contextHtml +
        '</div>' +
      '</li>';
    }).join("");
  }

  function openWorkLogModal() {
    state.workLogDate = state.workLogDate || todayKey();
    elements.workLogModal.hidden = false;
    document.body.classList.add("modal-open");
    renderWorkLog();
  }

  function closeWorkLogModal() {
    elements.workLogModal.hidden = true;
    if (
      elements.appSettingsMenu.hidden &&
      elements.taskModal.hidden &&
      elements.researchPlanModal.hidden &&
      elements.researchScheduleModal.hidden &&
      elements.researchPlanDetailModal.hidden &&
      elements.researchTaskDetailModal.hidden &&
      elements.workCorrectionModal.hidden &&
      elements.workContextModal.hidden &&
      elements.workRecordEditorModal.hidden
    ) document.body.classList.remove("modal-open");
  }

  function moveWorkLogWeek(amount) {
    const date = parseWorkDateKey(state.workLogDate || todayKey());
    date.setDate(date.getDate() + amount * 7);
    state.workLogDate = getWorkDateKey(date);
    renderWorkLog();
  }

  function handleWorkLogClick(event) {
    const dateButton = event.target.closest("[data-work-log-date]");
    if (!dateButton) return;
    state.workLogDate = dateButton.dataset.workLogDate;
    renderWorkLog();
    openWorkRecordEditorModal(state.workLogDate);
  }

  async function refreshWorkLog() {
    elements.workLogRefreshButton.disabled = true;
    try {
      if (state.mode === "remote" && state.user && supabaseClient) {
        await loadRemoteWorkEvents();
      } else {
        state.workEvents = readLocalWorkEvents();
        state.workEventsLoaded = true;
        renderWorkTimer();
      }
      showToast("作業記録を再読込しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    } finally {
      elements.workLogRefreshButton.disabled = false;
      renderWorkLog();
    }
  }

  function isMissingWorkEventsTable(error) {
    const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    return message.includes("work_events") || message.includes("work events");
  }

  async function loadRemoteWorkEvents() {
    const requestId = ++state.workEventsLoadSequence;
    const revisionAtStart = state.workEventsRevision;
    const result = await supabaseClient
      .from(WORK_EVENTS_TABLE)
      .select(WORK_EVENT_SELECT_FIELDS)
      .order("occurred_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (requestId !== state.workEventsLoadSequence || revisionAtStart !== state.workEventsRevision) return;

    if (result.error) {
      if (!isMissingWorkEventsTable(result.error)) console.warn("作業記録の同期読み込みに失敗しました", result.error);
      state.workRemoteAvailable = false;
      state.workEvents = readLocalWorkEvents();
    } else {
      state.workRemoteAvailable = true;
      state.workEvents = sortWorkEvents((result.data || []).map(normalizeWorkEvent));
      writeLocalWorkEvents();
    }
    state.workEventsLoaded = true;
    renderWorkTimer();
    if (elements.workLogModal && !elements.workLogModal.hidden) renderWorkLog();
    checkWorkWarnings();
  }

  async function appendWorkEvent(eventType, occurredAt = new Date().toISOString(), metadata = {}, activityId = null) {
    if (!WORK_EVENT_TYPES.has(eventType)) throw new Error("不明な作業イベントです。");
    const event = normalizeWorkEvent({
      eventType,
      occurredAt,
      createdAt: new Date().toISOString(),
      activityId: activityId || metadata?.activityId || metadata?.activity_id || null,
      metadata,
    });
    if (!event) throw new Error("作業イベントの時刻が正しくありません。");

    if (state.mode === "remote" && state.workRemoteAvailable && state.user && supabaseClient) {
      const result = await supabaseClient
        .from(WORK_EVENTS_TABLE)
        .insert(toWorkDatabasePayload(event))
        .select(WORK_EVENT_SELECT_FIELDS)
        .single();
      if (result.error) {
        if (!isMissingWorkEventsTable(result.error)) throw result.error;
        state.workRemoteAvailable = false;
      } else {
        const savedEvent = normalizeWorkEvent(result.data) || event;
        const mergedEvent = upsertWorkEvent(savedEvent) || savedEvent;
        state.workEventsLoaded = true;
        writeLocalWorkEvents();
        syncWorkStatusLabel();
        return mergedEvent;
      }
    }

    const savedEvent = upsertWorkEvent(event) || event;
    state.workEventsLoaded = true;
    writeLocalWorkEvents();
    syncWorkStatusLabel();
    return savedEvent;
  }

  function withWorkContext(event, context) {
    const metadata = { ...(event?.metadata || {}) };
    ["taskId", "task_id", "taskTitle", "task_title", "category", "genre", "memo", "note", "workMemo"]
      .forEach((key) => delete metadata[key]);
    const source = metadata.source || "button";
    return normalizeWorkEvent({
      ...event,
      activityId: context.activityId || null,
      metadata: { ...metadata, ...getWorkContextMetadata(context, source) },
    });
  }

  async function updateWorkEvent(event) {
    const normalized = normalizeWorkEvent(event);
    if (!normalized) throw new Error("作業イベントの形式が正しくありません。");

    if (state.mode === "remote" && state.workRemoteAvailable && state.user && supabaseClient) {
      const result = await supabaseClient
        .from(WORK_EVENTS_TABLE)
        .update(toWorkDatabasePayload(normalized))
        .eq("id", normalized.id)
        .select(WORK_EVENT_SELECT_FIELDS)
        .single();
      if (result.error) {
        if (!isMissingWorkEventsTable(result.error)) throw result.error;
        state.workRemoteAvailable = false;
      } else {
        const savedEvent = normalizeWorkEvent(result.data) || normalized;
        upsertWorkEvent(savedEvent);
        writeLocalWorkEvents();
        syncWorkStatusLabel();
        return savedEvent;
      }
    }

    const savedEvent = upsertWorkEvent(normalized) || normalized;
    writeLocalWorkEvents();
    syncWorkStatusLabel();
    return savedEvent;
  }

  function getWorkContextTaskOptionsHtml(selectedId = "", selectedTitle = "") {
    const tasks = state.tasks
      .filter((task) => task.title)
      .sort((a, b) => {
        const completedDifference = Number(a.status === "completed") - Number(b.status === "completed");
        if (completedDifference !== 0) return completedDifference;
        const priorityDifference = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
        if (priorityDifference !== 0) return priorityDifference;
        return a.title.localeCompare(b.title, "ja");
      });
    const options = [...tasks];
    if (selectedId && selectedTitle && !options.some((task) => String(task.id) === String(selectedId))) {
      options.unshift({ id: selectedId, title: selectedTitle, tags: [] });
    }
    return '<option value="">タスクを選択しない</option>' +
      options.map((task) => {
        const tags = normalizeTags(task.tags);
        const suffix = tags.length ? " [" + tags.join("・") + "]" : "";
        const selected = String(task.id) === String(selectedId) ? " selected" : "";
        return '<option value="' + escapeHtml(String(task.id)) + '"' + selected + '>' +
          escapeHtml(task.title + suffix) + '</option>';
      }).join("");
  }

  function renderWorkContextTaskOptions(selectedId = "") {
    elements.workContextTask.innerHTML = getWorkContextTaskOptionsHtml(selectedId);
    elements.workContextTask.value = selectedId && [...elements.workContextTask.options].some((option) => option.value === String(selectedId))
      ? String(selectedId)
      : "";
  }

  function getWorkContextCategoryOptionsHtml(task = null, selectedCategory = "") {
    const candidates = getWorkCategoryCandidates(task);
    if (selectedCategory && !candidates.some((candidate) => tagKey(candidate) === tagKey(selectedCategory))) {
      candidates.unshift(selectedCategory);
    }
    return '<option value="">未分類</option>' +
      candidates.map((category) => {
        const selected = tagKey(category) === tagKey(selectedCategory) ? " selected" : "";
        return '<option value="' + escapeHtml(category) + '"' + selected + '>' + escapeHtml(category) + '</option>';
      }).join("");
  }

  function renderWorkContextCategoryOptions(task = null, selectedCategory = "") {
    elements.workContextCategory.innerHTML = getWorkContextCategoryOptionsHtml(task, selectedCategory);
    elements.workContextCategory.value = selectedCategory || "";
  }

  function handleWorkContextTaskChange() {
    const task = state.tasks.find((item) => String(item.id) === String(elements.workContextTask.value));
    renderWorkContextCategoryOptions(task, getDefaultWorkCategory(task));
  }

  function openWorkContextModal() {
    if (state.workActionInFlight || getWorkSnapshot().status !== "idle") return;
    elements.workContextForm.reset();
    renderWorkContextTaskOptions();
    renderWorkContextCategoryOptions();
    elements.workContextMemo.value = "";
    elements.workContextModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(() => elements.workContextTask.focus(), 40);
  }

  function closeWorkContextModal() {
    elements.workContextModal.hidden = true;
    elements.workContextForm.reset();
    if (!elements.workRecordEditorModal || elements.workRecordEditorModal.hidden) {
      document.body.classList.remove("modal-open");
    }
  }

  function renderWorkRecordEditor() {
    if (!elements.workRecordEditorModal || elements.workRecordEditorModal.hidden) return;
    const dateKey = state.workRecordEditorDate || todayKey();
    const day = parseWorkDateKey(dateKey);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const sessions = getWorkSessionsForDate(dateKey);
    const daySegments = clipWorkSegmentsToDay(buildWorkSegments(state.workEvents), day);
    const dayWorkMs = daySegments
      .filter((segment) => segment.kind === "work")
      .reduce((total, segment) => total + segment.end - segment.start, 0);

    elements.workRecordEditorTitle.textContent = formatWorkLogLongDate(day) + "の作業記録";
    elements.workRecordEditorSummary.innerHTML =
      '<div><span>日作業時間</span><strong>' + escapeHtml(formatDuration(dayWorkMs)) + '</strong></div>' +
      '<div><span>セッション</span><strong>' + escapeHtml(String(sessions.length)) + '件</strong></div>' +
      '<p>タスク・ジャンル（タグ）・メモを保存すると、この日の関連イベントへ反映されます。</p>';

    if (!sessions.length) {
      elements.workRecordEditorSessions.innerHTML =
        '<div class="work-record-editor-empty">この日に編集できる作業セッションはありません。</div>';
      return;
    }

    elements.workRecordEditorSessions.innerHTML = sessions.map((session, index) => {
      const context = session.context || {};
      const task = state.tasks.find((item) => String(item.id) === String(context.taskId)) || null;
      const sessionWorkMs = getWorkRangeDuration(session.segments, dayStart, dayEnd, "work");
      const startEvent = session.startEvent || session.events[0];
      const endEvent = session.endEvent;
      const lastEvent = session.events[session.events.length - 1];
      const startText = startEvent ? formatDateTime(startEvent.occurredAt) : "開始時刻不明";
      const endText = endEvent
        ? formatDateTime(endEvent.occurredAt)
        : (lastEvent?.eventType === "break_start" ? "現在は休憩中" : "現在も作業中");
      const eventTrail = session.events.map((event) =>
        '<span class="work-record-event-pill work-record-event-pill-' + escapeHtml(event.eventType) + '">' +
          escapeHtml(WORK_EVENT_LABELS[event.eventType] || event.eventType) + ' ' +
          escapeHtml(formatWorkClock(event.occurredAt)) +
        '</span>'
      ).join("");
      const focusClass = String(session.id) === String(state.workRecordEditorFocusSessionId) ? " is-focused" : "";
      const saveDisabled = state.workRecordSaveInFlight ? " disabled" : "";
      return '<article class="work-record-session' + focusClass + '" data-work-record-session="' + escapeHtml(session.id) + '">' +
        '<div class="work-record-session-heading">' +
          '<div><span class="section-kicker">SESSION ' + escapeHtml(String(index + 1)) + '</span>' +
          '<h3>' + escapeHtml(getWorkSessionStatusLabel(session)) + '</h3></div>' +
          '<strong>' + escapeHtml(formatDuration(sessionWorkMs)) + '</strong>' +
        '</div>' +
        '<p class="work-record-session-range">' + escapeHtml(startText) + ' — ' + escapeHtml(endText) + '</p>' +
        '<div class="work-record-event-pills">' + eventTrail + '</div>' +
        '<form class="work-record-session-form" data-work-record-session-id="' + escapeHtml(session.id) + '">' +
          '<label>取り組むタスク（任意）' +
            '<select data-work-record-field="taskId">' +
              getWorkContextTaskOptionsHtml(context.taskId || "", context.taskTitle || "") +
            '</select>' +
          '</label>' +
          '<label>ジャンル / タグ（任意）' +
            '<select data-work-record-field="category">' +
              getWorkContextCategoryOptionsHtml(task, context.category || "") +
            '</select>' +
          '</label>' +
          '<label class="field-span-2">作業メモ（任意）' +
            '<textarea data-work-record-field="memo" maxlength="2000" rows="3" placeholder="今回やったこと、確認したこと、次にやること">' +
              escapeHtml(context.memo || "") +
            '</textarea>' +
          '</label>' +
          '<div class="work-record-session-actions field-span-2">' +
            '<span>このセッションの記録を更新</span>' +
            '<button class="primary-button" type="submit"' + saveDisabled + '>保存</button>' +
          '</div>' +
        '</form>' +
      '</article>';
    }).join("");
  }

  function openWorkRecordEditorModal(dateKey = todayKey(), focusSessionId = null) {
    state.workRecordEditorDate = dateKey || todayKey();
    state.workRecordEditorFocusSessionId = focusSessionId || null;
    elements.workRecordEditorModal.hidden = false;
    document.body.classList.add("modal-open");
    renderWorkRecordEditor();
    window.setTimeout(() => {
      const focusedSession = [...elements.workRecordEditorSessions.querySelectorAll("[data-work-record-session]")]
        .find((item) => String(item.dataset.workRecordSession) === String(focusSessionId || ""));
      const target = focusedSession?.querySelector("select") || elements.workRecordEditorSessions.querySelector("select");
      if (target) target.focus();
    }, 40);
  }

  function openActiveWorkRecordEditor() {
    const snapshot = getWorkSnapshot();
    if (!snapshot.sessionStartEvent) return;
    openWorkRecordEditorModal(getWorkDateKey(snapshot.sessionStartEvent.occurredAt), snapshot.sessionStartEvent.id);
  }

  function closeWorkRecordEditorModal() {
    elements.workRecordEditorModal.hidden = true;
    state.workRecordEditorDate = null;
    state.workRecordEditorFocusSessionId = null;
    if (
      elements.appSettingsMenu.hidden &&
      elements.taskModal.hidden &&
      elements.researchPlanModal.hidden &&
      elements.researchScheduleModal.hidden &&
      elements.researchPlanDetailModal.hidden &&
      elements.researchTaskDetailModal.hidden &&
      elements.workCorrectionModal.hidden &&
      elements.workContextModal.hidden &&
      elements.workLogModal.hidden
    ) document.body.classList.remove("modal-open");
  }

  async function saveWorkRecordSession(event) {
    event.preventDefault();
    const form = event.target.closest("form[data-work-record-session-id]");
    if (!form || state.workRecordSaveInFlight) return;
    const sessionId = form.dataset.workRecordSessionId;
    const session = buildWorkSessions(state.workEvents)
      .find((item) => String(item.id) === String(sessionId));
    if (!session) {
      showToast("作業セッションが見つかりません。再読込してください。", true);
      return;
    }

    const taskId = form.querySelector('[data-work-record-field="taskId"]')?.value || "";
    const task = state.tasks.find((item) => String(item.id) === String(taskId)) || null;
    const category = form.querySelector('[data-work-record-field="category"]')?.value.trim() || "";
    const memo = form.querySelector('[data-work-record-field="memo"]')?.value.trim() || "";
    const context = {
      taskId: task?.id || null,
      taskTitle: task?.title || null,
      category: category || null,
      memo: memo || null,
      activityId: getWorkActivityId(task, category),
    };
    const saveButton = form.querySelector('button[type="submit"]');
    state.workRecordSaveInFlight = true;
    state.workActionInFlight = true;
    if (saveButton) saveButton.disabled = true;
    renderWorkTimer();
    try {
      for (const eventToUpdate of session.events.map((item) => withWorkContext(item, context))) {
        await updateWorkEvent(eventToUpdate);
      }
      showToast("作業内容を更新しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    } finally {
      state.workRecordSaveInFlight = false;
      state.workActionInFlight = false;
      render();
      renderWorkRecordEditor();
    }
  }

  async function saveWorkContext(event) {
    event.preventDefault();
    if (!elements.workContextForm.reportValidity() || state.workActionInFlight) return;
    const task = state.tasks.find((item) => String(item.id) === String(elements.workContextTask.value));
    const category = elements.workContextCategory.value.trim();
    const memo = elements.workContextMemo.value.trim();
    const context = {
      taskId: task?.id || null,
      taskTitle: task?.title || null,
      category: category || null,
      memo: memo || null,
      activityId: getWorkActivityId(task, category),
    };
    const saveButton = elements.workContextForm.querySelector('button[type="submit"]');
    state.workActionInFlight = true;
    if (saveButton) saveButton.disabled = true;
    renderWorkTimer();
    try {
      await appendWorkEvent("start", undefined, getWorkContextMetadata(context, "button"), context.activityId);
      closeWorkContextModal();
      render();
      showToast("作業を開始しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    } finally {
      state.workActionInFlight = false;
      if (saveButton) saveButton.disabled = false;
      renderWorkTimer();
    }
  }

  async function recordWorkAction(eventType) {
    const snapshot = getWorkSnapshot();
    const allowed = {
      start: snapshot.status === "idle",
      break_start: snapshot.status === "working",
      break_end: snapshot.status === "break",
      end: snapshot.status !== "idle",
    };
    if (!allowed[eventType] || state.workActionInFlight) return;
    if (eventType === "start") {
      openWorkContextModal();
      return;
    }

    state.workActionInFlight = true;
    renderWorkTimer();
    try {
      const context = getWorkContextFromEvent(snapshot.sessionStartEvent);
      await appendWorkEvent(
        eventType,
        undefined,
        getWorkContextMetadata(context, "button"),
        context.activityId
      );
      const messages = { start: "作業を開始しました", break_start: "休憩を開始しました", break_end: "作業を再開しました", end: "作業を終了しました" };
      render();
      showToast(messages[eventType]);
    } catch (error) {
      showToast(toFriendlyError(error), true);
    } finally {
      state.workActionInFlight = false;
      renderWorkTimer();
    }
  }


  function openWorkCorrectionModal() {
    const snapshot = getWorkSnapshot();
    if (snapshot.status === "idle") return;
    const nowValue = toDateTimeLocalValue(new Date().toISOString());
    elements.workCorrectionAt.value = nowValue;
    elements.workCorrectionAt.max = nowValue;
    elements.workCorrectionModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(() => elements.workCorrectionAt.focus(), 40);
  }

  function closeWorkCorrectionModal() {
    elements.workCorrectionModal.hidden = true;
    elements.workCorrectionForm.reset();
    if (
      elements.appSettingsMenu.hidden &&
      elements.taskModal.hidden &&
      elements.researchPlanModal.hidden &&
      elements.researchScheduleModal.hidden &&
      elements.researchPlanDetailModal.hidden &&
      elements.researchTaskDetailModal.hidden &&
      (!elements.workLogModal || elements.workLogModal.hidden) &&
      elements.workContextModal.hidden
    ) document.body.classList.remove("modal-open");
  }

  async function saveWorkCorrection(event) {
    event.preventDefault();
    if (!elements.workCorrectionForm.reportValidity()) return;
    const snapshot = getWorkSnapshot();
    if (snapshot.status === "idle") {
      closeWorkCorrectionModal();
      return;
    }
    const correctionDate = new Date(elements.workCorrectionAt.value);
    const correctionMs = correctionDate.getTime();
    const latestEventMs = snapshot.lastEvent ? new Date(snapshot.lastEvent.occurredAt).getTime() : NaN;
    if (!Number.isFinite(correctionMs) || correctionMs > Date.now()) {
      showToast("終了時刻は現在時刻以前にしてください。", true);
      return;
    }
    if (!Number.isFinite(latestEventMs) || correctionMs <= latestEventMs) {
      showToast("終了時刻は最後の作業イベントより後にしてください。", true);
      return;
    }
    const saveButton = elements.workCorrectionForm.querySelector("button[type=submit]");
    saveButton.disabled = true;
    try {
      const context = getWorkContextFromEvent(snapshot.sessionStartEvent);
      await appendWorkEvent(
        "end",
        correctionDate.toISOString(),
        getWorkContextMetadata(context, "manual_correction"),
        context.activityId
      );
      closeWorkCorrectionModal();
      render();
      showToast("修正した終了時刻を記録しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    } finally {
      saveButton.disabled = false;
    }
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

  function readNotifiedReminderKeys() {
    try {
      const saved = JSON.parse(localStorage.getItem(NOTIFIED_REMINDERS_STORAGE_KEY) || "[]");
      return new Set(Array.isArray(saved) ? saved.filter((value) => typeof value === "string") : []);
    } catch (_) {
      return new Set();
    }
  }

  function writeNotifiedReminderKeys(keys) {
    try {
      localStorage.setItem(NOTIFIED_REMINDERS_STORAGE_KEY, JSON.stringify([...keys].slice(-200)));
    } catch (_) {
      // 通知済み記録を保存できない環境でも、通知自体は継続する。
    }
  }

  async function ensureNotificationPermission() {
    const NotificationApi = window.Notification;
    if (!NotificationApi) {
      showToast("このブラウザは通知に対応していません。", true);
      return false;
    }
    if (NotificationApi.permission === "granted") return true;
    if (NotificationApi.permission === "denied") {
      showToast("通知がブロックされています。ブラウザのサイト設定から許可してください。", true);
      return false;
    }
    try {
      const permission = await NotificationApi.requestPermission();
      if (permission === "granted") {
        showToast("ブラウザ通知を有効にしました。");
        return true;
      }
    } catch (error) {
      console.warn("通知許可の取得に失敗しました", error);
    }
    showToast("通知を許可すると、設定時刻にタスクを知らせます。", true);
    return false;
  }

  function showTaskReminder(task) {
    const NotificationApi = window.Notification;
    if (!NotificationApi || NotificationApi.permission !== "granted") return false;
    try {
      const notification = new NotificationApi("タスクの通知", {
        body: "「" + task.title + "」の予定時刻です。",
        icon: "./assets/icon-192.png",
        tag: "task-reminder-" + task.id,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
        const currentTask = state.tasks.find((item) => item.id === task.id);
        if (!currentTask) return;
        if (state.sidebarView !== "home" && state.sidebarView !== "todo") navigateToPage("home");
        window.setTimeout(() => openTaskModal(currentTask), 0);
      };
      return true;
    } catch (error) {
      console.warn("タスク通知の表示に失敗しました", error);
      return false;
    }
  }

  function checkTaskReminders() {
    const dueTasks = state.tasks.filter((task) => {
      if (!task.reminderEnabled || !task.reminderAt || task.status === "completed") return false;
      const reminderTime = new Date(task.reminderAt).getTime();
      return Number.isFinite(reminderTime) && reminderTime <= Date.now();
    });
    if (!dueTasks.length) return;

    const NotificationApi = window.Notification;
    if (!NotificationApi || NotificationApi.permission !== "granted") {
      const now = Date.now();
      if (now - state.notificationWarningAt >= 60000) {
        state.notificationWarningAt = now;
        showToast("通知の許可が必要なタスクがあります。タスク編集画面で通知を有効にしてください。", true);
      }
      return;
    }

    const notifiedKeys = readNotifiedReminderKeys();
    let changed = false;
    dueTasks.forEach((task) => {
      const key = String(task.id) + ":" + String(task.reminderAt);
      if (notifiedKeys.has(key)) return;
      if (showTaskReminder(task)) {
        notifiedKeys.add(key);
        changed = true;
      }
    });
    if (changed) writeNotifiedReminderKeys(notifiedKeys);
  }

  function startReminderWatcher() {
    if (state.notificationTimer) return;
    const check = () => {
      checkTaskReminders();
      checkWorkWarnings();
    };
    state.notificationTimer = window.setInterval(check, REMINDER_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();
  }

  function startWorkTimerWatcher() {
    if (state.workTickTimer) return;
    state.workTickTimer = window.setInterval(renderWorkTimer, 1000);
    document.addEventListener("visibilitychange", renderWorkTimer);
    window.addEventListener("focus", renderWorkTimer);
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
            <section class="research-panel activity-notes-panel" data-notes-activity="${escapeHtml(activity.id)}" aria-labelledby="${escapeHtml(titleId)}">
              <div class="research-panel-heading activity-notes-heading">
                <div>
                  <p class="section-kicker">NOTES</p>
                  <h2 id="${escapeHtml(titleId)}">${taskLabel}ノート</h2>
                  <p>${taskLabel}の知見や気づきをまとめます。メインのノート一覧からも開けます。</p>
                </div>
                <button class="secondary-button" type="button" data-note-action="add" data-note-activity="${escapeHtml(activity.id)}">＋ ノートを追加</button>
              </div>
              <p class="notes-panel-notice" data-notes-notice hidden></p>
              <div class="notes-grid notes-activity-grid" data-notes-list="${escapeHtml(activity.id)}"></div>
              <div class="notes-empty" data-notes-empty hidden>
                <span class="research-empty-mark" aria-hidden="true">${escapeHtml(activity.icon)}</span>
                <p data-notes-empty-text>${taskLabel}ノートはまだありません。</p>
                <button class="text-button" type="button" data-note-action="add" data-note-activity="${escapeHtml(activity.id)}">${taskLabel}ノートを追加</button>
              </div>
            </section>
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
    state.notesFilter = "all";
    state.notesSearch = "";
    if (elements.notesSearch) elements.notesSearch.value = "";
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


  function isMissingNotesTable(error) {
    const message = [error?.message || "", error?.details || "", error?.hint || ""].join(" ").toLowerCase();
    return message.includes("notes") && (
      message.includes("relation") ||
      message.includes("schema cache") ||
      message.includes("does not exist")
    );
  }

  function notesSetupMessage() {
    return "ノートを同期するには、最新のsupabase/schema.sqlをSupabaseのSQL Editorで実行してください。";
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
    const planTasks = state.tasks.filter((task) => task.researchPlanId === plan.id && task.status !== "completed");
    const prioritizedTasks = [...planTasks].sort((a, b) => {
      const priorityDifference = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
      if (priorityDifference !== 0) return priorityDifference;
      return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
    });
    const topTasks = prioritizedTasks.slice(0, 3);
    const progress = topTasks.length
      ? topTasks.map((task) => `
          <div class="research-plan-priority-task">
            <span class="research-plan-task-status" aria-hidden="true"></span>
            <span class="research-plan-priority-label">${escapeHtml(PRIORITY_LABELS[task.priority])}</span>
            <span class="research-plan-task-title">${escapeHtml(task.title)}</span>
          </div>
        `).join("")
      : '<span class="research-plan-task-empty">進捗タスクはありません。</span>';

    return `
      <article class="research-plan-item research-plan-summary" data-plan-id="${escapeHtml(plan.id)}" data-research-action="open-plan" tabindex="0" role="button">
        <div class="research-item-body">
          <div class="research-item-title-row">
            <h3>${escapeHtml(plan.title)}</h3>
            <span class="status-chip research-status-${escapeHtml(plan.status)}">${escapeHtml(PLAN_STATUS_LABELS[plan.status])}</span>
          </div>
          <div class="research-plan-summary-progress">
            <span class="research-plan-section-label">優先度上位の進捗</span>
            <div class="research-plan-priority-list">${progress}</div>
          </div>
        </div>
        <div class="research-item-actions">
          <span class="research-plan-open-hint">詳細を見る →</span>
          <button class="task-action" type="button" data-research-action="edit-plan">編集</button>
          <button class="task-action delete" type="button" data-research-action="delete-plan">削除</button>
        </div>
      </article>
    `;
  }

  function getResearchScheduleHorizonDays() {
    return localStorage.getItem(RESEARCH_SCHEDULE_HORIZON_STORAGE_KEY) === "30" ? 30 : 7;
  }

  function renderResearchTimeline(schedules, horizonDays = getResearchScheduleHorizonDays()) {
    if (!schedules.length) return "";
    const now = Date.now();
    const horizon = now + horizonDays * 86400000;
    const items = schedules.map((schedule) => ({
      schedule,
      date: new Date(schedule.scheduledAt),
    }));
    const datedItems = items.filter((item) => Number.isFinite(item.date.getTime()));
    const visibleItems = datedItems.filter((item) => {
      const timestamp = item.date.getTime();
      return timestamp >= now && timestamp <= horizon;
    });
    const pastItems = datedItems.filter((item) => item.date.getTime() < now);
    const futureItems = datedItems.filter((item) => item.date.getTime() > horizon);
    const invalidItems = items.filter((item) => !Number.isFinite(item.date.getTime()));
    const span = horizon - now;
    const timelineItems = visibleItems.map((item) => {
      const ratio = ((item.date.getTime() - now) / span) * 100;
      const schedule = item.schedule;
      const plan = getPlanById(schedule.planId);
      return `
        <article class="research-timeline-card" data-schedule-id="${escapeHtml(schedule.id)}" style="--timeline-position: ${Math.max(4, Math.min(96, ratio))}%">
          <time datetime="${escapeHtml(schedule.scheduledAt)}">${escapeHtml(formatScheduleDateTime(schedule.scheduledAt))}</time>
          <strong>${escapeHtml(schedule.title)}</strong>
          <span>${escapeHtml(SCHEDULE_KIND_LABELS[schedule.kind])}${plan ? " · " + escapeHtml(plan.title) : ""}</span>
          <div class="research-item-actions">
            <button class="task-action" type="button" data-research-action="edit-schedule">編集</button>
            <button class="task-action delete" type="button" data-research-action="delete-schedule">削除</button>
          </div>
        </article>
      `;
    }).join("");

    const tick = (label, timestamp, position) => `
      <span class="research-timeline-tick" style="left: ${position}%">
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(dateTimeFormatter.format(new Date(timestamp)))}</small>
      </span>
    `;
    const overflow = (label, list, position, modifier = "") => {
      if (!list.length) return "";
      const titles = list.map((item) => item.schedule.title).join("、");
      return `
        <div class="research-timeline-overflow ${modifier}" style="left: ${position}%" title="${escapeHtml(titles)}">
          <strong>${escapeHtml(label + list.length + "件")}</strong>
          <span>範囲外の予定</span>
        </div>
      `;
    };

    return `
      <div class="research-timeline">
        <div class="research-timeline-scroll">
          <div class="research-timeline-axis">
            <span class="research-timeline-line" aria-hidden="true"></span>
            ${tick("現在", now, 2)}
            ${tick(horizonDays === 7 ? "1週間後" : "1か月後", horizon, 98)}
            ${overflow("過去", pastItems, 2, "is-past")}
            ${overflow("他", futureItems, 98, "is-future")}
            ${overflow("日付不明", invalidItems, 50, "is-invalid")}
            ${timelineItems}
          </div>
        </div>
      </div>
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


  function getNoteActivity(note) {
    return note?.activityId ? getActivityById(note.activityId) : null;
  }

  function getNoteActivityLabel(note) {
    return getNoteActivity(note)?.label || "未分類";
  }

  function formatNoteUpdatedAt(value) {
    return formatDateTime(value) || "更新日時不明";
  }

  function getNoteSearchText(note) {
    const activity = getNoteActivity(note);
    return [
      note.title,
      note.body,
      ...(note.tags || []),
      activity?.label || "",
    ].join(" ").toLocaleLowerCase("ja-JP");
  }

  function renderNoteCard(note) {
    const excerpt = String(note.body || "").replace(/\s+/g, " ").trim().slice(0, 180);
    const tags = normalizeTags(note.tags);
    const tagHtml = tags.length
      ? `<div class="note-card-tags">${tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}`).join("")}</div>`
      : "";
    return `
      <article class="note-card" data-note-id="${escapeHtml(note.id)}" tabindex="0" role="button">
        <div class="note-card-topline">
          <span class="note-activity-chip">${escapeHtml(getNoteActivityLabel(note))}</span>
          <time datetime="${escapeHtml(note.updatedAt)}">${escapeHtml(formatNoteUpdatedAt(note.updatedAt))}</time>
        </div>
        <h3>${escapeHtml(note.title)}</h3>
        <p class="note-card-excerpt">${escapeHtml(excerpt || "本文はまだありません。")}</p>
        ${tagHtml}
        <div class="note-card-actions">
          <button class="task-action" type="button" data-note-action="edit">編集</button>
          <button class="task-action delete" type="button" data-note-action="delete">削除</button>
        </div>
      </article>
    `;
  }

  function renderNoteCollection(listElement, emptyElement, notes, emptyMessage = "ノートはまだありません。") {
    if (!listElement || !emptyElement) return;
    listElement.innerHTML = notes.map(renderNoteCard).join("");
    listElement.hidden = notes.length === 0;
    emptyElement.hidden = notes.length !== 0;
    const messageElement = emptyElement.querySelector("[data-notes-empty-text]");
    if (messageElement) messageElement.textContent = emptyMessage;
  }

  function renderNotesFilterList() {
    if (!elements.notesFilterList) return;
    const activities = state.appSettings?.activities || [];
    const filters = [
      { id: "all", label: "すべて" },
      ...activities.map((activity) => ({ id: activity.id, label: activity.label })),
      { id: "none", label: "未分類" },
    ];
    if (!filters.some((filter) => filter.id === state.notesFilter)) state.notesFilter = "all";
    elements.notesFilterList.innerHTML = filters.map((filter) => {
      const count = filter.id === "all"
        ? state.notes.length
        : state.notes.filter((note) => filter.id === "none" ? !note.activityId : note.activityId === filter.id).length;
      return `
        <button class="notes-filter-button${state.notesFilter === filter.id ? " is-active" : ""}" type="button" role="tab" aria-selected="${state.notesFilter === filter.id}" data-note-filter="${escapeHtml(filter.id)}">
          <span>${escapeHtml(filter.label)}</span>
          <strong>${count}</strong>
        </button>
      `;
    }).join("");
  }

  function getVisibleNotes() {
    const query = String(state.notesSearch || "").trim().toLocaleLowerCase("ja-JP");
    return [...state.notes]
      .filter((note) => {
        if (state.notesFilter === "none") return !note.activityId;
        if (state.notesFilter !== "all") return note.activityId === state.notesFilter;
        return true;
      })
      .filter((note) => !query || getNoteSearchText(note).includes(query))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  function renderActivityNotes() {
    document.querySelectorAll("[data-notes-list]").forEach((listElement) => {
      const panel = listElement.closest("[data-notes-activity]");
      const activityId = listElement.dataset.notesList;
      const activity = getActivityById(activityId);
      const notes = activity
        ? [...state.notes]
          .filter((note) => note.activityId === activityId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        : [];
      const emptyElement = panel?.querySelector("[data-notes-empty]");
      renderNoteCollection(listElement, emptyElement, notes, (activity?.label || "この活動") + "ノートはまだありません。");
      const notice = panel?.querySelector("[data-notes-notice]");
      if (notice) {
        notice.hidden = !state.notesDataError;
        notice.textContent = state.notesDataError
          ? state.notesDataError + " 現在のノートはこの端末に保存します。"
          : "";
      }
    });
  }

  function renderNotes() {
    if (elements.sidebarNoteCount) elements.sidebarNoteCount.textContent = String(state.notes.length);
    renderNotesFilterList();
    if (elements.notesDataNotice) {
      elements.notesDataNotice.hidden = !state.notesDataError;
      elements.notesDataNotice.textContent = state.notesDataError
        ? state.notesDataError + " 現在のノートはこの端末に保存します。"
        : "";
    }
    renderNoteCollection(
      elements.notesList,
      elements.notesEmpty,
      getVisibleNotes(),
      state.notesSearch.trim() ? "検索条件に一致するノートはありません。" : "ノートはまだありません。"
    );
    renderActivityNotes();
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

    const scheduleHorizonDays = getResearchScheduleHorizonDays();
    elements.researchScheduleHorizon.value = String(scheduleHorizonDays);
    elements.researchScheduleList.innerHTML = renderResearchTimeline(sortedSchedules, scheduleHorizonDays);
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
    renderWorkTimer();

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
    elements.notesPage.hidden = state.sidebarView !== "notes";
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
    renderNotes();
    renderResearch();
    if (elements.workLogModal && !elements.workLogModal.hidden) renderWorkLog();
    if (elements.workRecordEditorModal && !elements.workRecordEditorModal.hidden) renderWorkRecordEditor();

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


  async function loadRemoteNotes() {
    try {
      const result = await supabaseClient
        .from(NOTES_TABLE)
        .select(NOTE_SELECT_FIELDS)
        .order("updated_at", { ascending: false });
      if (result.error) throw result.error;
      state.notes = (result.data || []).map(normalizeNote).filter((note) => note.title);
      state.notesRemoteAvailable = true;
      state.notesDataError = "";
    } catch (error) {
      if (!isMissingNotesTable(error)) throw error;
      state.notes = readLocalNotes();
      state.notesRemoteAvailable = false;
      state.notesDataError = notesSetupMessage();
    }
    render();
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
    checkTaskReminders();
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


  async function runRemoteNoteMutation(note, operation) {
    const query = operation === "update"
      ? supabaseClient.from(NOTES_TABLE).update(toNoteDatabasePayload(note)).eq("id", note.id)
      : supabaseClient.from(NOTES_TABLE).insert(toNoteDatabasePayload(note));
    const result = await query.select(NOTE_SELECT_FIELDS).single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function handleSession(session) {
    const previousUserId = state.user?.id || null;
    state.user = session?.user || null;
    const userChanged = previousUserId !== (state.user?.id || null);
    window.dispatchEvent(new CustomEvent("vectory:session-change", { detail: { signedIn: Boolean(state.user) } }));
    if (!state.user) {
      state.workEventsLoadSequence += 1;
      state.workEventsRevision += 1;
      state.tasks = [];
      state.notes = [];
      state.notesRemoteAvailable = true;
      state.notesDataError = "";
      state.plans = [];
      state.schedules = [];
      state.workEvents = [];
      state.workEventsLoaded = false;
      state.workRemoteAvailable = true;
      closeAppSettings();
      setSyncStatus("ログイン待ち", "local");
      showAuth();
      return;
    }

    if (userChanged) {
      state.workEventsLoadSequence += 1;
      state.workEventsRevision += 1;
      state.workEvents = [];
      state.workEventsLoaded = false;
      state.workRemoteAvailable = true;
    }
    localStorage.removeItem(LOCAL_MODE_KEY);
    loadUserAppSettings(state.user);
    elements.accountInitial.textContent = (state.user.email || "M").slice(0, 1).toUpperCase();
    elements.accountEmail.textContent = state.user.email || "ログイン中";
    elements.accountButton.hidden = false;
    await Promise.all([loadRemoteTasks(), loadRemoteResearchData(), loadRemoteWorkEvents(), loadRemoteNotes()]);
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
    if (elements.taskReminderEnabled.checked && !elements.taskReminderAt.value) {
      showToast("通知日時を設定してください。", true);
      elements.taskReminderAt.focus();
      return;
    }
    if (elements.taskReminderEnabled.checked && !(await ensureNotificationPermission())) {
      elements.taskReminderEnabled.checked = false;
      return;
    }
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
      checkTaskReminders();
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
    if (!elements.researchPlanDetailModal.hidden) closeResearchPlanDetail();
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
      if (state.researchPlanDetailId === planId) closeResearchPlanDetail();
      updateResearchPlanSelectors();
      render();
      showToast("研究プランを削除しました");
    } catch (error) {
      showToast(toFriendlyError(error), true);
    }
  }

  function renderResearchPlanDetail(plan) {
    if (!plan) return;
    const planTasks = state.tasks.filter((task) => task.researchPlanId === plan.id);
    const body = `
      <div class="research-plan-detail-grid">
        <section><span>発端｜解決したい疑問点</span><p>${escapeHtml(plan.objective || "未記録")}</p></section>
        <section><span>発端｜確認されている事実・根拠</span><p>${escapeHtml(plan.originFacts || "未記録")}</p></section>
        <section><span>仮説</span><p>${escapeHtml(plan.hypothesis || "未記録")}</p></section>
        <section><span>仮説の根拠</span><p>${escapeHtml(plan.hypothesisBasis || "未記録")}</p></section>
      </div>
      <p class="research-plan-detail-meta">${escapeHtml(formatTargetDate(plan.targetDate))} · ${escapeHtml(PLAN_STATUS_LABELS[plan.status])}</p>
    `;
    elements.researchPlanDetailBody.innerHTML = body;
    const sortedTasks = sortActivityTasks(planTasks);
    elements.researchPlanDetailTaskList.innerHTML = sortedTasks.length
      ? sortedTasks.map((task) => `
          <button class="research-plan-detail-task" type="button" data-research-detail-action="open-task" data-task-id="${escapeHtml(task.id)}">
            <span class="research-plan-task-status ${task.status === "completed" ? "is-completed" : ""}" aria-hidden="true"></span>
            <span class="research-plan-task-title">${escapeHtml(task.title)}</span>
            <span class="research-plan-detail-task-status">${escapeHtml(STATUS_LABELS[task.status])}</span>
          </button>
        `).join("")
      : '<p class="research-plan-task-empty">タスクはまだありません。</p>';
  }

  function openResearchPlanDetail(plan) {
    if (!plan) return;
    state.researchPlanDetailId = plan.id;
    elements.researchPlanDetailTitle.textContent = plan.title;
    renderResearchPlanDetail(plan);
    elements.researchPlanDetailModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeResearchPlanDetail() {
    elements.researchPlanDetailModal.hidden = true;
    state.researchPlanDetailId = null;
    if (elements.researchPlanModal.hidden && elements.researchScheduleModal.hidden && elements.researchTaskDetailModal.hidden) {
      document.body.classList.remove("modal-open");
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
      if (state.researchPlanDetailId) renderResearchPlanDetail(getPlanById(state.researchPlanDetailId));
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


  function updateNoteActivityOptions(selectedActivityId = "") {
    if (!elements.noteActivity) return;
    const options = [
      { id: "", label: "未分類" },
      ...(state.appSettings?.activities || []).map((activity) => ({ id: activity.id, label: activity.label })),
    ];
    elements.noteActivity.innerHTML = options.map((option) => {
      const selected = option.id === selectedActivityId ? " selected" : "";
      return `<option value="${escapeHtml(option.id)}"${selected}>${escapeHtml(option.label)}</option>`;
    }).join("");
    elements.noteActivity.value = options.some((option) => option.id === selectedActivityId)
      ? selectedActivityId
      : "";
  }

  function openNoteModal(note = null, options = {}) {
    state.editingNoteId = note?.id || null;
    elements.noteModalTitle.textContent = note ? "ノートを編集" : "ノートを追加";
    elements.deleteNoteButton.hidden = !note;
    elements.noteId.value = note?.id || "";
    elements.noteTitle.value = note?.title || "";
    const defaultActivityId = note?.activityId
      || options.activityId
      || (getActivityById(state.sidebarView)?.id || "");
    updateNoteActivityOptions(defaultActivityId);
    elements.noteBody.value = note?.body || "";
    elements.noteModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(() => elements.noteTitle.focus(), 40);
  }

  function closeNoteModal() {
    elements.noteModal.hidden = true;
    state.editingNoteId = null;
    elements.noteForm.reset();
    const hasOpenModal = [
      elements.appSettingsMenu,
      elements.workLogModal,
      elements.workContextModal,
      elements.workCorrectionModal,
      elements.workRecordEditorModal,
      elements.taskModal,
      elements.researchPlanModal,
      elements.researchScheduleModal,
      elements.researchPlanDetailModal,
      elements.researchTaskDetailModal,
      elements.noteModal,
    ].some((element) => element && !element.hidden);
    if (!hasOpenModal) document.body.classList.remove("modal-open");
  }

  function getNoteFromForm() {
    const existing = state.notes.find((note) => note.id === state.editingNoteId);
    return normalizeNote({
      id: state.editingNoteId || createId(),
      title: elements.noteTitle.value.trim(),
      body: elements.noteBody.value,
      activityId: elements.noteActivity.value || "",
      tags: existing?.tags || [],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function upsertLocalNote(note) {
    const index = state.notes.findIndex((item) => item.id === note.id);
    if (index >= 0) state.notes[index] = note;
    else state.notes.unshift(note);
    writeLocalNotes();
  }

  async function saveNote(event) {
    event.preventDefault();
    if (!elements.noteForm.reportValidity()) return;
    const note = getNoteFromForm();
    const isEditing = Boolean(state.editingNoteId);
    const saveButton = elements.saveNoteButton;
    saveButton.disabled = true;

    try {
      if (state.mode === "local" || !state.notesRemoteAvailable) {
        upsertLocalNote(note);
        setSyncStatus("この端末のみ", "local");
      } else {
        const data = await runRemoteNoteMutation(note, isEditing ? "update" : "insert");
        const savedNote = normalizeNote(data);
        const index = state.notes.findIndex((item) => item.id === savedNote.id);
        if (index >= 0) state.notes[index] = savedNote;
        else state.notes.unshift(savedNote);
        setSyncStatus("同期済み", "synced");
      }
      closeNoteModal();
      render();
      showToast(isEditing ? "ノートを更新しました" : "ノートを追加しました");
    } catch (error) {
      if (state.mode === "remote" && isMissingNotesTable(error)) {
        state.notesRemoteAvailable = false;
        state.notesDataError = notesSetupMessage();
        upsertLocalNote(note);
        closeNoteModal();
        render();
        showToast("ノートの同期設定前のため、この端末に保存しました。", true);
      } else {
        showToast(toFriendlyError(error), true);
      }
    } finally {
      saveButton.disabled = false;
    }
  }

  async function deleteNote(noteId, askForConfirmation = true) {
    const note = state.notes.find((item) => item.id === noteId);
    if (!note) return;
    if (askForConfirmation && !window.confirm("「" + note.title + "」を削除しますか？")) return;

    try {
      if (state.mode === "local" || !state.notesRemoteAvailable) {
        state.notes = state.notes.filter((item) => item.id !== noteId);
        writeLocalNotes();
      } else {
        const { error } = await supabaseClient.from(NOTES_TABLE).delete().eq("id", noteId);
        if (error) throw error;
        state.notes = state.notes.filter((item) => item.id !== noteId);
      }
      if (state.editingNoteId === noteId) closeNoteModal();
      render();
      showToast("ノートを削除しました");
    } catch (error) {
      if (state.mode === "remote" && isMissingNotesTable(error)) {
        state.notesRemoteAvailable = false;
        state.notesDataError = notesSetupMessage();
        state.notes = state.notes.filter((item) => item.id !== noteId);
        writeLocalNotes();
        if (state.editingNoteId === noteId) closeNoteModal();
        render();
        showToast("ノートの同期設定前のため、この端末から削除しました。", true);
      } else {
        showToast(toFriendlyError(error), true);
      }
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
    if (message.includes("work_events")) return "作業記録を同期できません。supabase/schema.sqlのwork_events定義を確認してください。";
    if (message.includes("notes")) return notesSetupMessage();
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
    state.notes = readLocalNotes();
    state.notesRemoteAvailable = true;
    state.notesDataError = "";
    state.plans = readLocalCollection(RESEARCH_PLANS_STORAGE_KEY, normalizePlan);
    state.schedules = readLocalCollection(RESEARCH_SCHEDULES_STORAGE_KEY, normalizeSchedule);
    state.workEvents = readLocalWorkEvents();
    state.workEventsLoaded = true;
    state.workRemoteAvailable = true;
    state.researchRemoteAvailable = true;
    state.researchTaskSchemaAvailable = true;
    state.researchPlanSchemaAvailable = true;
    state.researchDataError = "";
    localStorage.setItem(LOCAL_MODE_KEY, "true");
    elements.accountButton.hidden = true;
    elements.openAuthButton.hidden = !supabaseClient;
    elements.setupNotice.hidden = false;
    setSyncStatus("この端末のみ", "local");
    syncWorkStatusLabel();
    window.dispatchEvent(new CustomEvent("vectory:session-change", { detail: { signedIn: false } }));
    showApp();
    checkTaskReminders();
    checkWorkWarnings();
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


  function handleNotesClick(event) {
    const filterTarget = event.target.closest("[data-note-filter]");
    if (filterTarget) {
      state.notesFilter = filterTarget.dataset.noteFilter || "all";
      render();
      return true;
    }

    const actionTarget = event.target.closest("[data-note-action]");
    if (actionTarget) {
      const action = actionTarget.dataset.noteAction;
      if (action === "add") {
        openNoteModal(null, { activityId: actionTarget.dataset.noteActivity || "" });
      } else {
        const card = actionTarget.closest("[data-note-id]");
        const note = state.notes.find((item) => item.id === card?.dataset.noteId);
        if (!note) return true;
        if (action === "delete") deleteNote(note.id);
        else if (action === "edit" || action === "open") openNoteModal(note);
      }
      return true;
    }

    const card = event.target.closest("[data-note-id]");
    if (card && !event.target.closest("button, a, input, textarea, select")) {
      const note = state.notes.find((item) => item.id === card.dataset.noteId);
      if (note) openNoteModal(note);
      return true;
    }
    return false;
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
    const noteCard = event.target.closest("[data-note-id]");
    if (noteCard && event.target === noteCard && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      const note = state.notes.find((item) => item.id === noteCard.dataset.noteId);
      if (note) openNoteModal(note);
      return;
    }
    const target = event.target.closest('[data-action="edit"]');
    if (target && (event.key === "Enter" || event.key === " ") ) {
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
    const detailTarget = event.target.closest("[data-research-detail-action]");
    if (detailTarget) {
      const detailAction = detailTarget.dataset.researchDetailAction;
      if (detailAction === "open-task") {
        const task = state.tasks.find((item) => item.id === detailTarget.dataset.taskId);
        if (task) openResearchTaskDetail(task);
      }
      return;
    }
    if (!target) return;
    const action = target.dataset.researchAction;
    const planCard = target.closest("[data-plan-id]");
    const scheduleCard = target.closest("[data-schedule-id]");
    const taskId = target.dataset.taskId;
    if (action === "open-plan" && planCard) {
      openResearchPlanDetail(state.plans.find((plan) => plan.id === planCard.dataset.planId));
      return;
    }
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
    elements.addNoteButton.addEventListener("click", () => openNoteModal());
    window.addEventListener("hashchange", syncPageFromLocation);
    window.addEventListener("popstate", syncPageFromLocation);
    elements.workStartButton.addEventListener("click", () => recordWorkAction("start"));
    elements.workBreakButton.addEventListener("click", () => recordWorkAction("break_start"));
    elements.workResumeButton.addEventListener("click", () => recordWorkAction("break_end"));
    elements.workEndButton.addEventListener("click", () => recordWorkAction("end"));
    elements.workEditContextButton.addEventListener("click", openActiveWorkRecordEditor);
    elements.openWorkLogButton.addEventListener("click", openWorkLogModal);
    elements.workCorrectEndButton.addEventListener("click", openWorkCorrectionModal);
    elements.workContinueButton.addEventListener("click", () => acknowledgeWorkWarning(getWorkWarningSnapshot()));
    elements.workAcknowledgeButton.addEventListener("click", () => acknowledgeWorkWarning(getWorkWarningSnapshot()));
    elements.workContextForm.addEventListener("submit", saveWorkContext);
    elements.workContextTask.addEventListener("change", handleWorkContextTaskChange);
    elements.closeWorkContextModal.addEventListener("click", closeWorkContextModal);
    elements.cancelWorkContextButton.addEventListener("click", closeWorkContextModal);
    elements.workContextModal.addEventListener("click", (event) => {
      if (event.target === elements.workContextModal) closeWorkContextModal();
    });
    elements.workCorrectionForm.addEventListener("submit", saveWorkCorrection);
    elements.closeWorkCorrectionModal.addEventListener("click", closeWorkCorrectionModal);
    elements.cancelWorkCorrectionButton.addEventListener("click", closeWorkCorrectionModal);
    elements.workCorrectionModal.addEventListener("click", (event) => {
      if (event.target === elements.workCorrectionModal) closeWorkCorrectionModal();
    });
    elements.workLogModal.addEventListener("click", handleWorkLogClick);
    elements.workLogPreviousButton.addEventListener("click", () => moveWorkLogWeek(-1));
    elements.workLogTodayButton.addEventListener("click", () => {
      state.workLogDate = todayKey();
      renderWorkLog();
    });
    elements.workLogNextButton.addEventListener("click", () => moveWorkLogWeek(1));
    elements.workLogRefreshButton.addEventListener("click", refreshWorkLog);
    elements.closeWorkLogModal.addEventListener("click", closeWorkLogModal);
    elements.closeWorkLogModalButton.addEventListener("click", closeWorkLogModal);
    elements.workRecordEditorSessions.addEventListener("submit", saveWorkRecordSession);
    elements.closeWorkRecordEditor.addEventListener("click", closeWorkRecordEditorModal);
    elements.closeWorkRecordEditorButton.addEventListener("click", closeWorkRecordEditorModal);
    elements.workRecordEditorModal.addEventListener("click", (event) => {
      if (event.target === elements.workRecordEditorModal) closeWorkRecordEditorModal();
    });
    elements.addTaskButton.addEventListener("click", () => openTaskModal());
    elements.emptyAddButton.addEventListener("click", () => openTaskModal());
    elements.addResearchPlanButton.addEventListener("click", () => openResearchPlanModal());
    elements.addResearchPlanInlineButton.addEventListener("click", () => openResearchPlanModal());
    elements.addResearchScheduleButton.addEventListener("click", () => openResearchScheduleModal());
    elements.addResearchScheduleInlineButton.addEventListener("click", () => openResearchScheduleModal());
    elements.researchScheduleHorizon.addEventListener("change", (event) => {
      const value = event.target.value === "30" ? "30" : "7";
      localStorage.setItem(RESEARCH_SCHEDULE_HORIZON_STORAGE_KEY, value);
      renderResearch();
    });
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
    elements.noteForm.addEventListener("submit", saveNote);
    elements.closeNoteModal.addEventListener("click", closeNoteModal);
    elements.cancelNoteButton.addEventListener("click", closeNoteModal);
    elements.deleteNoteButton.addEventListener("click", () => deleteNote(state.editingNoteId));
    elements.noteModal.addEventListener("click", (event) => {
      if (event.target === elements.noteModal) closeNoteModal();
    });
    elements.taskForm.addEventListener("submit", saveTask);
    elements.taskReminderEnabled.addEventListener("change", async (event) => {
      if (!event.target.checked) return;
      if (!(await ensureNotificationPermission())) event.target.checked = false;
    });
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
    elements.closeResearchPlanDetail.addEventListener("click", closeResearchPlanDetail);
    elements.closeResearchPlanDetailButton.addEventListener("click", closeResearchPlanDetail);
    elements.addResearchPlanDetailTask.addEventListener("click", () => openResearchTaskDetail(null, { researchPlanId: state.researchPlanDetailId || "" }));
    elements.editResearchPlanFromDetail.addEventListener("click", () => openResearchPlanModal(getPlanById(state.researchPlanDetailId)));
    elements.researchPlanDetailModal.addEventListener("click", (event) => {
      if (event.target === elements.researchPlanDetailModal) closeResearchPlanDetail();
    });
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
    elements.deleteResearchTaskDetail.addEventListener("click", async () => {
      const taskId = state.editingResearchTaskId;
      await deleteTask(taskId);
      if (!state.tasks.some((item) => item.id === taskId)) closeResearchTaskDetail();
    });
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
    elements.notesSearch.addEventListener("input", (event) => {
      state.notesSearch = event.target.value;
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
      if (handleNotesClick(event)) return;
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
      else if (event.key === "Escape" && !elements.workRecordEditorModal.hidden) closeWorkRecordEditorModal();
      else if (event.key === "Escape" && !elements.workContextModal.hidden) closeWorkContextModal();
      else if (event.key === "Escape" && !elements.workCorrectionModal.hidden) closeWorkCorrectionModal();
      else if (event.key === "Escape" && !elements.workLogModal.hidden) closeWorkLogModal();
      else if (event.key === "Escape" && !elements.taskModal.hidden) closeTaskModal();
      else if (event.key === "Escape" && !elements.noteModal.hidden) closeNoteModal();
      else if (event.key === "Escape" && !elements.researchPlanModal.hidden) closeResearchPlanModal();
      else if (event.key === "Escape" && !elements.researchScheduleModal.hidden) closeResearchScheduleModal();
      else if (event.key === "Escape" && !elements.researchTaskDetailModal.hidden) closeResearchTaskDetail();
      else if (event.key === "Escape" && !elements.researchPlanDetailModal.hidden) closeResearchPlanDetail();
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
    startReminderWatcher();
    startWorkTimerWatcher();
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
