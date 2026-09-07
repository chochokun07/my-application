
(() => {
  "use strict";

  const config = window.__MY_APP_CONFIG__ || {};
  const remoteClient = config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase?.createClient
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage },
    })
    : null;

  const TABLES = {
    projects: "script_projects",
    chapters: "script_chapters",
    lines: "script_dialogue_lines",
    speakers: "script_speakers",
    concepts: "project_concepts",
    identity: "identity_concept_items",
  };
  const LOCAL_KEYS = {
    projects: "my-application.hobby.projects.v0.1",
    chapters: "my-application.hobby.chapters.v0.1",
    lines: "my-application.hobby.lines.v0.1",
    speakers: "my-application.hobby.speakers.v0.1",
    concepts: "my-application.hobby.concepts.v0.1",
    identity: "my-application.hobby.identity.v0.1",
    selectedProject: "my-application.hobby.selected-project.v0.1",
  };
  const IDENTITY_PROJECT_ID = "7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61";
  const LEGACY_SEED = {"projects":[],"chapters":[],"lines":[],"speakers":[],"notes":[],"identityItems":[]};
  const TARGETS = [
    { id: "black-silence", label: "Black Silence" },
    { id: "blue-echo", label: "Blue Reverberation" },
    { id: "indigo-elder", label: "Indigo Elder" },
    { id: "purple-tears", label: "Purple Tear" },
    { id: "red-gaze", label: "Red Gaze" },
    { id: "red-mist", label: "Red Mist" },
    { id: "vermilion-cross", label: "Vermilion Cross" },
    { id: "yellow-harpoon", label: "Yellow Harpoon" },
  ];
  const SECTIONS = [
    { id: "identity", label: "人格設定" },
    { id: "release", label: "実装予想" },
    { id: "summary", label: "要約" },
    { id: "performance", label: "性能" },
    { id: "operation", label: "運用" },
    { id: "combat", label: "戦闘" },
  ];
  const FIELDS = {
    identity: [
      ["aliasMeaning", "異名の意味", "異名の由来や、名前から受ける印象をメモ"],
      ["worldRole", "Project Moon作品内での立場", "登場作品、所属、物語上の役割などをメモ"],
      ["whyChosen", "特色に選ばれた理由", "なぜこの人物が特色と呼ばれるのかをメモ"],
    ],
    release: [
      ["assignedPrisoner", "割り当てられそうな囚人", "候補の囚人名"],
      ["assignmentReason", "その囚人が選ばれる理由", "武器、関係性、物語、モチーフなどの理由"],
      ["timing", "実装時期", "シーズン、イベント、実装順の予想"],
    ],
    summary: [
      ["position", "人格化した場合の立ち位置", "ゲーム内で担う立ち位置を一文で"],
      ["oneLine", "性能予想を一言で", "動画の締めに使える短い表現"],
    ],
    performance: [
      ["spec", "基礎スペック", "体力／速度／混乱区間／防御レベル"],
      ["skill1", "スキル1", "スキル名、属性、コイン、効果、担当する役割"],
      ["skill2", "スキル2", "スキル名、属性、コイン、効果、担当する役割"],
      ["skill3", "スキル3", "スキル名、属性、コイン、効果、担当する役割"],
      ["defense", "守備スキル", "守備タイプ、効果、使う場面"],
      ["passive", "パッシブ", "発動条件、効果、必要な資源や状態"],
      ["supportPassive", "サポートパッシブ", "控えから与える効果と、相性のよい編成"],
    ],
    operation: [
      ["basicLoop", "基本の立ち回り", "普段どのスキルを振り、何を維持するか"],
      ["powerSpike", "本領発揮までの流れ", "準備から最大出力までの流れ、目安ターンなど"],
      ["goodTeams", "相性のよい編成", "所属、色、状態異常、資源などの相性"],
      ["strengths", "強み", "この人格を採用する理由になる点"],
      ["burden", "運用上の負担", "資源、速度、準備、編成制約などの注意点"],
    ],
    combat: [
      ["weaponsAbilities", "判明している武器・能力", "武器、E.G.O、固有能力、演出から読み取れる要素など"],
      ["combatFeatures", "戦闘時の特徴", "攻撃の流れ、得意な距離、目立つ挙動など"],
      ["differences", "他の特色との差異", "役割、戦い方、見せ場の違いなど"],
    ],
  };
  const state = {
    storage: "local",
    remoteError: "",
    user: null,
    projects: [],
    chapters: [],
    lines: [],
    speakers: [],
    concepts: [],
    identityItems: [],
    selectedProjectId: localStorage.getItem(LOCAL_KEYS.selectedProject) || "",
    selectedChapterId: "",
    selectedTargetId: "red-mist",
    selectedSectionId: "identity",
    activeTab: "concept",
    lastUserId: null,
    initialized: false,
  };

  const $ = (id) => document.getElementById(id);
  const page = () => $("hobbyPage");
  const createId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : "hobby-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  const now = () => new Date().toISOString();
  const isLocalMode = () => localStorage.getItem("my-application.local-mode") === "true";
  const escapeHtml = (value) => {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  };
  const targetLabel = (id) => TARGETS.find((target) => target.id === id)?.label || id;
  const sectionLabel = (id) => SECTIONS.find((section) => section.id === id)?.label || id;
  const fieldDefinition = (sectionId, fieldKey) => (FIELDS[sectionId] || []).find((field) => field[0] === fieldKey) || null;

  function notify(message, error) {
    const toast = $("toast");
    if (!toast) return;
    window.clearTimeout(notify.timer);
    toast.textContent = message;
    toast.classList.toggle("is-error", Boolean(error));
    toast.classList.add("is-visible");
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function setNotice(message) {
    const notice = $("hobbyDataNotice");
    const text = $("hobbyDataNoticeText");
    if (!notice || !text) return;
    text.textContent = message || "";
    notice.hidden = !message;
  }

  function normalizeProject(row) {
    return {
      id: row.id || createId(),
      name: String(row.name || "新しいプロジェクト").trim(),
      conceptType: row.concept_type || row.conceptType || "generic",
      outputTemplate: row.output_template || row.outputTemplate || "{speaker}「{body}」",
      charsPerMinute: Number(row.chars_per_minute || row.charsPerMinute || 300),
      createdAt: row.created_at || row.createdAt || now(),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeChapter(row) {
    return {
      id: row.id || createId(),
      projectId: row.project_id || row.projectId,
      position: Number(row.position || 1),
      name: String(row.name || "チャプター").trim(),
      createdAt: row.created_at || row.createdAt || now(),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeLine(row) {
    return {
      id: row.id || createId(),
      chapterId: row.chapter_id || row.chapterId,
      position: Number(row.position || 1),
      speaker: String(row.speaker || ""),
      body: String(row.body || ""),
      createdAt: row.created_at || row.createdAt || now(),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeSpeaker(row) {
    return {
      id: row.id || createId(),
      name: String(row.name || "").trim(),
      position: Number(row.position || 1),
      createdAt: row.created_at || row.createdAt || now(),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeConcept(row) {
    return {
      projectId: row.project_id || row.projectId,
      conceptType: row.concept_type || row.conceptType || "generic",
      toolKey: row.tool_key || row.toolKey || "",
      body: String(row.body || ""),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeIdentityItem(row) {
    return {
      id: row.id || createId(),
      projectId: row.project_id || row.projectId || IDENTITY_PROJECT_ID,
      targetId: row.target_id || row.targetId || "red-mist",
      sectionId: row.section_id || row.sectionId || "performance",
      fieldKey: row.field_key ?? row.fieldKey ?? null,
      label: String(row.label || "自由項目"),
      placeholder: String(row.placeholder || "自由項目のメモ"),
      position: Number(row.position || 1),
      body: String(row.body || ""),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function readCollection(key, normalizer) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.map(normalizer) : [];
    } catch (error) {
      console.warn("趣味データの読み込みに失敗しました", error);
      return [];
    }
  }

  function writeLocal() {
    localStorage.setItem(LOCAL_KEYS.projects, JSON.stringify(state.projects));
    localStorage.setItem(LOCAL_KEYS.chapters, JSON.stringify(state.chapters));
    localStorage.setItem(LOCAL_KEYS.lines, JSON.stringify(state.lines));
    localStorage.setItem(LOCAL_KEYS.speakers, JSON.stringify(state.speakers));
    localStorage.setItem(LOCAL_KEYS.concepts, JSON.stringify(state.concepts));
    localStorage.setItem(LOCAL_KEYS.identity, JSON.stringify(state.identityItems));
    if (state.selectedProjectId) localStorage.setItem(LOCAL_KEYS.selectedProject, state.selectedProjectId);
  }

  function specialProject() {
    return normalizeProject({
      id: IDENTITY_PROJECT_ID,
      name: "特色人格予想プロジェクト",
      conceptType: "identity_prediction",
      outputTemplate: "{speaker}「{body}」",
      charsPerMinute: 300,
    });
  }

  function seedLocalState() {
    const projectIds = new Set(state.projects.map((project) => project.id));
    LEGACY_SEED.projects.forEach((project) => {
      if (!projectIds.has(project.id)) state.projects.push(normalizeProject(project));
    });
    LEGACY_SEED.chapters.forEach((chapter) => {
      if (!state.chapters.some((item) => item.id === chapter.id)) state.chapters.push(normalizeChapter(chapter));
    });
    LEGACY_SEED.lines.forEach((line) => {
      if (!state.lines.some((item) => item.id === line.id)) state.lines.push(normalizeLine(line));
    });
    LEGACY_SEED.speakers.forEach((speaker) => {
      if (!state.speakers.some((item) => item.id === speaker.id)) state.speakers.push(normalizeSpeaker(speaker));
    });
    if (!state.projects.some((project) => project.id === IDENTITY_PROJECT_ID)) state.projects.push(specialProject());
    LEGACY_SEED.notes.forEach((note) => {
      if (note.projectId && !state.concepts.some((concept) => concept.projectId === note.projectId)) {
        state.concepts.push(normalizeConcept({ projectId: note.projectId, body: note.body }));
      }
    });
    LEGACY_SEED.identityItems.forEach((item) => {
      if (!state.identityItems.some((current) => current.id === item.id)) {
        state.identityItems.push(normalizeIdentityItem({
          id: item.id,
          projectId: IDENTITY_PROJECT_ID,
          targetId: item.targetId,
          sectionId: item.sectionId,
          fieldKey: item.fieldKey,
          label: item.label,
          placeholder: item.placeholder,
          position: item.position,
          body: item.body,
        }));
      }
    });
    if (!state.selectedProjectId || !state.projects.some((project) => project.id === state.selectedProjectId)) {
      state.selectedProjectId = state.projects[0]?.id || "";
    }
    if (state.selectedProjectId) {
      const firstChapter = state.chapters.filter((chapter) => chapter.projectId === state.selectedProjectId).sort((a, b) => a.position - b.position)[0];
      state.selectedChapterId = firstChapter?.id || "";
    }
    writeLocal();
  }

  function getProject() {
    return state.projects.find((project) => project.id === state.selectedProjectId) || null;
  }

  function getConcept(projectId) {
    return state.concepts.find((concept) => concept.projectId === projectId) || null;
  }

  function getChapters(projectId) {
    return state.chapters.filter((chapter) => chapter.projectId === projectId).sort((a, b) => a.position - b.position);
  }

  function getLines(chapterId) {
    return state.lines.filter((line) => line.chapterId === chapterId).sort((a, b) => a.position - b.position);
  }

  function getIdentityItems(targetId, sectionId) {
    return state.identityItems
      .filter((item) => item.projectId === IDENTITY_PROJECT_ID && item.targetId === targetId && item.sectionId === sectionId)
      .sort((a, b) => a.position - b.position);
  }

  function identityItemId(targetId, sectionId, fieldKey) {
    return "identity:" + IDENTITY_PROJECT_ID + ":" + targetId + ":" + sectionId + ":" + fieldKey;
  }

  function findIdentityField(targetId, sectionId, fieldKey) {
    return state.identityItems.find((item) => item.projectId === IDENTITY_PROJECT_ID
      && item.targetId === targetId && item.sectionId === sectionId && item.fieldKey === fieldKey) || null;
  }

  function findCustomIdentityItem(id) {
    return state.identityItems.find((item) => item.id === id) || null;
  }

  function isRemote() {
    return state.storage === "remote" && Boolean(remoteClient && state.user);
  }

  async function fetchRemoteData() {
    const requests = await Promise.all([
      remoteClient.from(TABLES.projects).select("*").order("updated_at", { ascending: false }),
      remoteClient.from(TABLES.chapters).select("*").order("position", { ascending: true }),
      remoteClient.from(TABLES.lines).select("*").order("position", { ascending: true }),
      remoteClient.from(TABLES.speakers).select("*").order("position", { ascending: true }),
      remoteClient.from(TABLES.concepts).select("*"),
      remoteClient.from(TABLES.identity).select("*").order("position", { ascending: true }),
    ]);
    const error = requests.find((result) => result.error)?.error;
    if (error) throw error;
    state.projects = (requests[0].data || []).map(normalizeProject);
    state.chapters = (requests[1].data || []).map(normalizeChapter);
    state.lines = (requests[2].data || []).map(normalizeLine);
    state.speakers = (requests[3].data || []).map(normalizeSpeaker);
    state.concepts = (requests[4].data || []).map(normalizeConcept);
    state.identityItems = (requests[5].data || []).map(normalizeIdentityItem);
  }

  async function upsertRows(table, rows, conflict) {
    if (!rows.length) return;
    const result = await remoteClient.from(table).upsert(rows, { onConflict: conflict || "id" });
    if (result.error) throw result.error;
  }

  async function seedRemoteState() {
    const projectIds = new Set(state.projects.map((project) => project.id));
    const missingProjects = LEGACY_SEED.projects
      .filter((project) => !projectIds.has(project.id))
      .map((project) => ({
        id: project.id,
        user_id: state.user.id,
        name: project.name,
        concept_type: "generic",
        output_template: project.outputTemplate,
        chars_per_minute: project.charsPerMinute,
      }));
    const missingChapters = LEGACY_SEED.chapters
      .filter((chapter) => !state.chapters.some((item) => item.id === chapter.id))
      .map((chapter) => ({ id: chapter.id, user_id: state.user.id, project_id: chapter.projectId, position: chapter.position, name: chapter.name }));
    const missingLines = LEGACY_SEED.lines
      .filter((line) => !state.lines.some((item) => item.id === line.id))
      .map((line) => ({ id: line.id, user_id: state.user.id, chapter_id: line.chapterId, position: line.position, speaker: line.speaker, body: line.body }));
    const missingSpeakers = LEGACY_SEED.speakers
      .filter((speaker) => !state.speakers.some((item) => item.id === speaker.id))
      .map((speaker) => ({ id: speaker.id, user_id: state.user.id, name: speaker.name, position: speaker.position }));
    const missingConcepts = LEGACY_SEED.notes
      .filter((note) => note.projectId && !state.concepts.some((concept) => concept.projectId === note.projectId))
      .map((note) => ({ project_id: note.projectId, user_id: state.user.id, concept_type: "generic", body: note.body }));
    const rows = [
      ...missingProjects,
      {
        id: IDENTITY_PROJECT_ID,
        user_id: state.user.id,
        name: "特色人格予想プロジェクト",
        concept_type: "identity_prediction",
        output_template: "{speaker}「{body}」",
        chars_per_minute: 300,
      },
    ];
    await upsertRows(TABLES.projects, rows, "id");
    await upsertRows(TABLES.chapters, missingChapters, "id");
    await upsertRows(TABLES.lines, missingLines, "id");
    await upsertRows(TABLES.speakers, missingSpeakers, "id");
    await upsertRows(TABLES.concepts, missingConcepts, "project_id");
    if (!state.identityItems.length) {
      const identityRows = LEGACY_SEED.identityItems.map((item) => ({
        id: item.id,
        user_id: state.user.id,
        project_id: IDENTITY_PROJECT_ID,
        target_id: item.targetId,
        section_id: item.sectionId,
        field_key: item.fieldKey,
        label: item.label,
        placeholder: item.placeholder,
        position: item.position,
        body: item.body,
      }));
      await upsertRows(TABLES.identity, identityRows, "id");
    }
    await fetchRemoteData();
  }

  async function loadLocal() {
    state.storage = "local";
    state.remoteError = "";
    state.projects = readCollection(LOCAL_KEYS.projects, normalizeProject);
    state.chapters = readCollection(LOCAL_KEYS.chapters, normalizeChapter);
    state.lines = readCollection(LOCAL_KEYS.lines, normalizeLine);
    state.speakers = readCollection(LOCAL_KEYS.speakers, normalizeSpeaker);
    state.concepts = readCollection(LOCAL_KEYS.concepts, normalizeConcept);
    state.identityItems = readCollection(LOCAL_KEYS.identity, normalizeIdentityItem);
    seedLocalState();
    render();
  }

  async function loadRemote() {
    state.storage = "remote";
    state.remoteError = "";
    try {
      await fetchRemoteData();
      if (!state.projects.length || !state.projects.some((project) => project.id === IDENTITY_PROJECT_ID)) {
        await seedRemoteState();
      }
      if (!state.selectedProjectId || !state.projects.some((project) => project.id === state.selectedProjectId)) {
        state.selectedProjectId = state.projects[0]?.id || "";
      }
      const firstChapter = getChapters(state.selectedProjectId)[0];
      if (!state.selectedChapterId || !getChapters(state.selectedProjectId).some((chapter) => chapter.id === state.selectedChapterId)) {
        state.selectedChapterId = firstChapter?.id || "";
      }
      localStorage.setItem(LOCAL_KEYS.selectedProject, state.selectedProjectId || "");
      setNotice("");
      render();
    } catch (error) {
      state.remoteError = "構想・台本の同期には、最新のsupabase/schema.sqlを実行してください。現在はこの端末に保存します。";
      await loadLocal();
      setNotice(state.remoteError);
    }
  }

  async function saveProject(project) {
    project.updatedAt = now();
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.projects).upsert({
        id: project.id,
        user_id: state.user.id,
        name: project.name,
        concept_type: project.conceptType,
        output_template: project.outputTemplate,
        chars_per_minute: project.charsPerMinute,
        updated_at: project.updatedAt,
      }, { onConflict: "id" }).select("*").single();
      if (result.error) throw result.error;
      const index = state.projects.findIndex((item) => item.id === project.id);
      if (index >= 0) state.projects[index] = normalizeProject(result.data);
      else state.projects.unshift(normalizeProject(result.data));
    } else {
      writeLocal();
    }
    render();
  }

  async function saveConcept(concept) {
    concept.updatedAt = now();
    const index = state.concepts.findIndex((item) => item.projectId === concept.projectId);
    if (index >= 0) state.concepts[index] = concept;
    else state.concepts.push(concept);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.concepts).upsert({
        project_id: concept.projectId,
        user_id: state.user.id,
        concept_type: concept.conceptType,
        tool_key: concept.toolKey || null,
        body: concept.body || null,
        updated_at: concept.updatedAt,
      }, { onConflict: "project_id" });
      if (result.error) throw result.error;
    } else writeLocal();
    render();
  }

  async function saveIdentityItem(item) {
    item.updatedAt = now();
    const index = state.identityItems.findIndex((current) => current.id === item.id);
    if (index >= 0) state.identityItems[index] = item;
    else state.identityItems.push(item);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.identity).upsert({
        id: item.id,
        user_id: state.user.id,
        project_id: IDENTITY_PROJECT_ID,
        target_id: item.targetId,
        section_id: item.sectionId,
        field_key: item.fieldKey,
        label: item.label,
        placeholder: item.placeholder,
        position: item.position,
        body: item.body,
        updated_at: item.updatedAt,
      }, { onConflict: "id" });
      if (result.error) throw result.error;
    } else writeLocal();
  }

  async function saveChapter(chapter) {
    chapter.updatedAt = now();
    const index = state.chapters.findIndex((item) => item.id === chapter.id);
    if (index >= 0) state.chapters[index] = chapter;
    else state.chapters.push(chapter);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.chapters).upsert({
        id: chapter.id,
        user_id: state.user.id,
        project_id: chapter.projectId,
        position: chapter.position,
        name: chapter.name,
        updated_at: chapter.updatedAt,
      }, { onConflict: "id" });
      if (result.error) throw result.error;
    } else writeLocal();
    render();
  }

  async function saveLine(line, rerender) {
    line.updatedAt = now();
    const index = state.lines.findIndex((item) => item.id === line.id);
    if (index >= 0) state.lines[index] = line;
    else state.lines.push(line);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.lines).upsert({
        id: line.id,
        user_id: state.user.id,
        chapter_id: line.chapterId,
        position: line.position,
        speaker: line.speaker,
        body: line.body,
        updated_at: line.updatedAt,
      }, { onConflict: "id" });
      if (result.error) throw result.error;
    } else writeLocal();
    if (rerender) render();
  }

  async function saveSpeaker(speaker) {
    speaker.updatedAt = now();
    const index = state.speakers.findIndex((item) => item.id === speaker.id);
    if (index >= 0) state.speakers[index] = speaker;
    else state.speakers.push(speaker);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.speakers).upsert({
        id: speaker.id,
        user_id: state.user.id,
        name: speaker.name,
        position: speaker.position,
        updated_at: speaker.updatedAt,
      }, { onConflict: "id" });
      if (result.error) throw result.error;
    } else writeLocal();
    render();
  }

  async function removeProject(project) {
    if (!window.confirm("「" + project.name + "」を削除しますか？")) return;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.projects).delete().eq("id", project.id);
      if (result.error) throw result.error;
    }
    state.projects = state.projects.filter((item) => item.id !== project.id);
    const chapterIds = new Set(state.chapters.filter((chapter) => chapter.projectId === project.id).map((chapter) => chapter.id));
    state.chapters = state.chapters.filter((chapter) => chapter.projectId !== project.id);
    state.lines = state.lines.filter((line) => !chapterIds.has(line.chapterId));
    state.concepts = state.concepts.filter((concept) => concept.projectId !== project.id);
    if (project.id === IDENTITY_PROJECT_ID) state.identityItems = [];
    if (!state.projects.length) seedLocalState();
    state.selectedProjectId = state.projects[0]?.id || "";
    state.selectedChapterId = getChapters(state.selectedProjectId)[0]?.id || "";
    writeLocal();
    render();
  }

  function renderProjectList() {
    const container = $("hobbyProjectList");
    if (!container) return;
    const projects = [...state.projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    container.innerHTML = projects.map((project) =>
      "<button class="hobby-project-card" + (project.id === state.selectedProjectId ? " is-active" : "") + "" type="button" data-hobby-action="select-project" data-project-id="" + escapeHtml(project.id) + "">"
      + "<span class="hobby-project-card-name">" + escapeHtml(project.name) + "</span>"
      + "<span class="hobby-project-card-meta">" + (project.conceptType === "identity_prediction" ? "特色人格構想" : "動画プロジェクト") + "</span>"
      + "</button>"
    ).join("");
    $("hobbyProjectEmpty").hidden = projects.length !== 0;
  }

  function renderConcept() {
    const project = getProject();
    const identity = project?.conceptType === "identity_prediction";
    const generic = $("hobbyGenericConcept");
    const identityPanel = $("hobbyIdentityConcept");
    generic.hidden = identity || !project;
    identityPanel.hidden = !identity || !project;
    if (!project) return;
    $("hobbyConceptProjectLabel").textContent = project.name;
    $("hobbyIdentityProjectLabel").textContent = project.name;
    const concept = getConcept(project.id) || normalizeConcept({ projectId: project.id, conceptType: project.conceptType });
    $("hobbyConceptBody").value = concept.body || "";
    $("hobbyIdentityTarget").innerHTML = TARGETS.map((target) =>
      "<option value="" + escapeHtml(target.id) + """ + (target.id === state.selectedTargetId ? " selected" : "") + ">" + escapeHtml(target.label) + "</option>"
    ).join("");
    $("hobbyIdentitySectionTabs").innerHTML = SECTIONS.map((section) =>
      "<button class="hobby-section-tab" + (section.id === state.selectedSectionId ? " is-active" : "") + "" type="button" data-hobby-section="" + section.id + "">" + escapeHtml(section.label) + "</button>"
    ).join("");
    const definitions = FIELDS[state.selectedSectionId] || [];
    const items = getIdentityItems(state.selectedTargetId, state.selectedSectionId);
    const customItems = items.filter((item) => !item.fieldKey);
    const fieldsHtml = definitions.map((field, index) => {
      const item = findIdentityField(state.selectedTargetId, state.selectedSectionId, field[0]);
      return "<label class="hobby-identity-field">"
        + "<span>" + escapeHtml(field[1]) + "</span>"
        + "<textarea rows="4" data-identity-field="1" data-field-key="" + escapeHtml(field[0]) + "" data-field-label="" + escapeHtml(field[1]) + "" data-field-placeholder="" + escapeHtml(field[2]) + "" placeholder="" + escapeHtml(field[2]) + "">" + escapeHtml(item?.body || "") + "</textarea>"
        + "</label>";
    }).join("");
    const customHtml = customItems.map((item) =>
      "<label class="hobby-identity-field hobby-custom-field">"
      + "<span>" + escapeHtml(item.label) + " <button class="hobby-inline-danger" type="button" data-identity-action="remove-custom" data-item-id="" + escapeHtml(item.id) + "">削除</button></span>"
      + "<textarea rows="4" data-identity-field="1" data-item-id="" + escapeHtml(item.id) + "" placeholder="" + escapeHtml(item.placeholder) + "">" + escapeHtml(item.body) + "</textarea>"
      + "</label>"
    ).join("");
    $("hobbyIdentityFields").innerHTML = fieldsHtml + customHtml;
  }

  function renderScript() {
    const project = getProject();
    const chapters = getChapters(project?.id);
    if (!project) return;
    if (!state.selectedChapterId || !chapters.some((chapter) => chapter.id === state.selectedChapterId)) {
      state.selectedChapterId = chapters[0]?.id || "";
    }
    $("hobbyChapterList").innerHTML = chapters.map((chapter) =>
      "<button class="hobby-chapter-button" + (chapter.id === state.selectedChapterId ? " is-active" : "") + "" type="button" data-hobby-action="select-chapter" data-chapter-id="" + escapeHtml(chapter.id) + "">"
      + escapeHtml(chapter.name) + "</button>"
    ).join("");
    $("hobbyChapterEmpty").hidden = chapters.length !== 0;
    const chapter = chapters.find((item) => item.id === state.selectedChapterId);
    $("hobbyCurrentChapterName").textContent = chapter?.name || "チャプター未選択";
    const lines = getLines(chapter?.id);
    const speakerOptions = state.speakers
      .sort((a, b) => a.position - b.position)
      .map((speaker) => "<option value="" + escapeHtml(speaker.name) + "">" + escapeHtml(speaker.name) + "</option>")
      .join("");
    $("hobbyLineList").innerHTML = lines.map((line, index) =>
      "<article class="hobby-dialogue-line" data-line-id="" + escapeHtml(line.id) + "">"
      + "<div class="hobby-line-toolbar"><span class="hobby-line-number">" + (index + 1) + "</span>"
      + "<select data-script-action="speaker">" + (line.speaker && !state.speakers.some((speaker) => speaker.name === line.speaker) ? "<option value="" + escapeHtml(line.speaker) + "" selected>" + escapeHtml(line.speaker) + "</option>" : "") + speakerOptions.replace("value="" + escapeHtml(line.speaker) + """, "value="" + escapeHtml(line.speaker) + "" selected") + "</select>"
      + "<button type="button" data-script-action="up" aria-label="上へ">↑</button><button type="button" data-script-action="down" aria-label="下へ">↓</button><button type="button" data-script-action="delete" aria-label="削除">削除</button></div>"
      + "<textarea rows="3" data-script-action="body" placeholder="セリフ本文">" + escapeHtml(line.body) + "</textarea>"
      + "</article>"
    ).join("");
    $("hobbyLineEmpty").hidden = lines.length !== 0;
    const allText = state.lines.filter((line) => getChapters(project.id).some((chapterItem) => chapterItem.id === line.chapterId)).map((line) => line.body).join("");
    const characters = allText.length;
    $("hobbyScriptStats").textContent = characters + "文字 / 約" + Math.max(0, Math.ceil(characters / Math.max(1, project.charsPerMinute))) + "分";
    $("hobbyOutputTemplate").value = project.outputTemplate;
    $("hobbyCharsPerMinute").value = String(project.charsPerMinute);
    $("hobbySpeakerList").innerHTML = state.speakers.sort((a, b) => a.position - b.position).map((speaker) => "<li>" + escapeHtml(speaker.name) + "</li>").join("");
  }

  function renderWorkspace() {
    const project = getProject();
    $("hobbyWorkspace").hidden = !project;
    $("hobbyProjectActions").hidden = !project;
    if (!project) return;
    $("hobbyProjectTitle").textContent = project.name;
    $("hobbyProjectType").textContent = project.conceptType === "identity_prediction" ? "特色人格予想プロジェクト" : "動画プロジェクト";
    $("hobbyIdentityModeButton").hidden = project.conceptType === "identity_prediction";
    document.querySelectorAll("[data-hobby-tab]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.hobbyTab === state.activeTab));
    $("hobbyConceptPane").hidden = state.activeTab !== "concept";
    $("hobbyScriptPane").hidden = state.activeTab !== "script";
    renderConcept();
    renderScript();
  }

  function render() {
    if (!page()) return;
    renderProjectList();
    renderWorkspace();
  }

  async function createProject() {
    const name = window.prompt("動画プロジェクト名を入力してください。", "新しい動画プロジェクト");
    if (!name?.trim()) return;
    const project = normalizeProject({
      id: createId(),
      name: name.trim(),
      conceptType: name.includes("特色人格") ? "identity_prediction" : "generic",
      outputTemplate: "{speaker}「{body}」",
      charsPerMinute: 300,
    });
    state.projects.unshift(project);
    state.selectedProjectId = project.id;
    state.selectedChapterId = "";
    state.concepts.push(normalizeConcept({ projectId: project.id, conceptType: project.conceptType, toolKey: project.conceptType === "identity_prediction" ? "colored-fixer-notes" : "" }));
    if (project.conceptType === "identity_prediction") {
      LEGACY_SEED.identityItems.forEach((item) => state.identityItems.push(normalizeIdentityItem({ ...item, id: createId(), projectId: project.id })));
    }
    try {
      await saveProject(project);
      await saveConcept(getConcept(project.id));
      notify("プロジェクトを作成しました");
    } catch (error) {
      notify("プロジェクトの保存に失敗しました: " + error.message, true);
    }
  }

  async function editProject() {
    const project = getProject();
    if (!project) return;
    const name = window.prompt("プロジェクト名を変更してください。", project.name);
    if (!name?.trim() || name.trim() === project.name) return;
    project.name = name.trim();
    await saveProject(project);
    notify("プロジェクト名を変更しました");
  }

  async function makeIdentityProject() {
    const project = getProject();
    if (!project) return;
    project.conceptType = "identity_prediction";
    let concept = getConcept(project.id);
    if (!concept) {
      concept = normalizeConcept({ projectId: project.id, conceptType: "identity_prediction", toolKey: "colored-fixer-notes" });
      state.concepts.push(concept);
    } else {
      concept.conceptType = "identity_prediction";
      concept.toolKey = "colored-fixer-notes";
    }
    await saveProject(project);
    await saveConcept(concept);
    notify("特色人格構想ページを紐付けました");
  }

  async function editConcept() {
    const project = getProject();
    if (!project) return;
    const concept = getConcept(project.id) || normalizeConcept({ projectId: project.id, conceptType: project.conceptType });
    concept.body = $("hobbyConceptBody").value;
    await saveConcept(concept);
    notify("構想を保存しました");
  }

  async function addChapter() {
    const project = getProject();
    if (!project) return;
    const name = window.prompt("チャプター名を入力してください。", "チャプター" + (getChapters(project.id).length + 1));
    if (!name?.trim()) return;
    const chapter = normalizeChapter({ id: createId(), projectId: project.id, name: name.trim(), position: getChapters(project.id).length + 1 });
    try {
      await saveChapter(chapter);
      state.selectedChapterId = chapter.id;
      render();
      notify("チャプターを追加しました");
    } catch (error) {
      notify("チャプターの保存に失敗しました: " + error.message, true);
    }
  }

  async function editChapter() {
    const chapter = state.chapters.find((item) => item.id === state.selectedChapterId);
    if (!chapter) return;
    const name = window.prompt("チャプター名を変更してください。", chapter.name);
    if (!name?.trim() || name.trim() === chapter.name) return;
    chapter.name = name.trim();
    await saveChapter(chapter);
    notify("チャプター名を変更しました");
  }

  async function deleteChapter() {
    const chapter = state.chapters.find((item) => item.id === state.selectedChapterId);
    if (!chapter || !window.confirm("「" + chapter.name + "」を削除しますか？")) return;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.chapters).delete().eq("id", chapter.id);
      if (result.error) throw result.error;
    }
    state.chapters = state.chapters.filter((item) => item.id !== chapter.id);
    state.lines = state.lines.filter((line) => line.chapterId !== chapter.id);
    state.selectedChapterId = getChapters(getProject()?.id)[0]?.id || "";
    writeLocal();
    render();
  }

  async function addLine() {
    const chapter = state.chapters.find((item) => item.id === state.selectedChapterId);
    if (!chapter) {
      notify("先にチャプターを追加してください", true);
      return;
    }
    const line = normalizeLine({
      id: createId(),
      chapterId: chapter.id,
      position: getLines(chapter.id).length + 1,
      speaker: state.speakers[0]?.name || "",
      body: "",
    });
    try {
      await saveLine(line, true);
      window.setTimeout(() => document.querySelector("[data-line-id="" + line.id + ""] textarea")?.focus(), 30);
    } catch (error) {
      notify("セリフの保存に失敗しました: " + error.message, true);
    }
  }

  async function addSpeaker() {
    const name = $("hobbySpeakerInput").value.trim();
    if (!name) return;
    if (state.speakers.some((speaker) => speaker.name === name)) {
      $("hobbySpeakerInput").value = "";
      return;
    }
    const speaker = normalizeSpeaker({ id: createId(), name, position: state.speakers.length + 1 });
    $("hobbySpeakerInput").value = "";
    await saveSpeaker(speaker);
    notify("話者を追加しました");
  }

  async function moveLine(lineId, direction) {
    const line = state.lines.find((item) => item.id === lineId);
    if (!line) return;
    const lines = getLines(line.chapterId);
    const index = lines.findIndex((item) => item.id === lineId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= lines.length) return;
    const other = lines[nextIndex];
    const currentPosition = line.position;
    line.position = other.position;
    other.position = currentPosition;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.lines).upsert([
        { id: line.id, user_id: state.user.id, chapter_id: line.chapterId, position: line.position, speaker: line.speaker, body: line.body },
        { id: other.id, user_id: state.user.id, chapter_id: other.chapterId, position: other.position, speaker: other.speaker, body: other.body },
      ], { onConflict: "id" });
      if (result.error) throw result.error;
    }
    writeLocal();
    render();
  }

  async function removeLine(lineId) {
    const line = state.lines.find((item) => item.id === lineId);
    if (!line || !window.confirm("このセリフを削除しますか？")) return;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.lines).delete().eq("id", lineId);
      if (result.error) throw result.error;
    }
    state.lines = state.lines.filter((item) => item.id !== lineId);
    writeLocal();
    render();
  }

  async function saveIdentityField(element) {
    const project = getProject();
    if (!project || project.conceptType !== "identity_prediction") return;
    const targetId = state.selectedTargetId;
    const sectionId = state.selectedSectionId;
    const customId = element.dataset.itemId;
    const fieldKey = element.dataset.fieldKey || null;
    const definition = fieldKey ? fieldDefinition(sectionId, fieldKey) : null;
    const existing = customId ? findCustomIdentityItem(customId) : findIdentityField(targetId, sectionId, fieldKey);
    const item = existing || normalizeIdentityItem({
      id: customId || identityItemId(targetId, sectionId, fieldKey),
      projectId: project.id,
      targetId,
      sectionId,
      fieldKey,
      label: definition?.[1] || element.dataset.fieldLabel || "自由項目",
      placeholder: definition?.[2] || element.dataset.fieldPlaceholder || "自由項目のメモ",
      position: definition ? (FIELDS[sectionId] || []).findIndex((field) => field[0] === fieldKey) + 1 : getIdentityItems(targetId, sectionId).length + 1,
      body: "",
    });
    item.body = element.value;
    try {
      await saveIdentityItem(item);
      notify("構想を保存しました");
    } catch (error) {
      notify("構想の保存に失敗しました: " + error.message, true);
    }
  }

  async function addCustomField() {
    const label = window.prompt("追加する項目名を入力してください。", "自由項目");
    if (!label?.trim()) return;
    const item = normalizeIdentityItem({
      id: createId(),
      projectId: getProject()?.id || IDENTITY_PROJECT_ID,
      targetId: state.selectedTargetId,
      sectionId: state.selectedSectionId,
      fieldKey: null,
      label: label.trim(),
      placeholder: "自由項目のメモ",
      position: getIdentityItems(state.selectedTargetId, state.selectedSectionId).length + 1,
      body: "",
    });
    await saveIdentityItem(item);
    render();
    notify("自由項目を追加しました");
  }

  async function removeCustomField(itemId) {
    const item = findCustomIdentityItem(itemId);
    if (!item || !window.confirm("この自由項目を削除しますか？")) return;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.identity).delete().eq("id", item.id);
      if (result.error) throw result.error;
    }
    state.identityItems = state.identityItems.filter((current) => current.id !== item.id);
    writeLocal();
    render();
  }

  function exportScript() {
    const project = getProject();
    if (!project) return;
    const rows = [];
    getChapters(project.id).forEach((chapter) => {
      rows.push("【" + chapter.name + "】");
      getLines(chapter.id).forEach((line) => {
        rows.push(project.outputTemplate.replaceAll("{speaker}", line.speaker || "").replaceAll("{body}", line.body || ""));
      });
      rows.push("");
    });
    const blob = new Blob([rows.join("
")], { type: "text/plain;charset=utf-8" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = project.name.replace(/[\/:*?"<>|]/g, "_") + ".txt";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function handleClick(event) {
    const tab = event.target.closest("[data-hobby-tab]");
    if (tab) {
      state.activeTab = tab.dataset.hobbyTab;
      renderWorkspace();
      return;
    }
    const section = event.target.closest("[data-hobby-section]");
    if (section) {
      state.selectedSectionId = section.dataset.hobbySection;
      renderConcept();
      return;
    }
    const identityAction = event.target.closest("[data-identity-action]");
    if (identityAction?.dataset.identityAction === "remove-custom") {
      removeCustomField(identityAction.dataset.itemId).catch((error) => notify(error.message, true));
      return;
    }
    const target = event.target.closest("[data-hobby-action]");
    if (!target) return;
    const action = target.dataset.hobbyAction;
    if (action === "select-project") {
      state.selectedProjectId = target.dataset.projectId;
      state.selectedChapterId = getChapters(state.selectedProjectId)[0]?.id || "";
      localStorage.setItem(LOCAL_KEYS.selectedProject, state.selectedProjectId);
      render();
    } else if (action === "add-project") {
      createProject();
    } else if (action === "edit-project") {
      editProject().catch((error) => notify(error.message, true));
    } else if (action === "delete-project") {
      removeProject(getProject()).catch((error) => notify(error.message, true));
    } else if (action === "make-identity") {
      makeIdentityProject().catch((error) => notify(error.message, true));
    } else if (action === "add-chapter") {
      addChapter();
    } else if (action === "edit-chapter") {
      editChapter().catch((error) => notify(error.message, true));
    } else if (action === "delete-chapter") {
      deleteChapter().catch((error) => notify(error.message, true));
    } else if (action === "select-chapter") {
      state.selectedChapterId = target.dataset.chapterId;
      renderScript();
    } else if (action === "add-line") {
      addLine();
    } else if (action === "add-speaker") {
      addSpeaker();
    } else if (action === "move-up" || action === "move-down") {
      moveLine(target.closest("[data-line-id]")?.dataset.lineId, action === "move-up" ? "up" : "down").catch((error) => notify(error.message, true));
    } else if (action === "delete-line") {
      removeLine(target.closest("[data-line-id]")?.dataset.lineId).catch((error) => notify(error.message, true));
    } else if (action === "add-custom") {
      addCustomField().catch((error) => notify(error.message, true));
    } else if (action === "save-concept") {
      editConcept().catch((error) => notify(error.message, true));
    } else if (action === "export-script") {
      exportScript();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.id === "hobbyIdentityTarget") {
      state.selectedTargetId = target.value;
      renderConcept();
      return;
    }
    if (target.id === "hobbyOutputTemplate" || target.id === "hobbyCharsPerMinute") {
      const project = getProject();
      if (!project) return;
      if (target.id === "hobbyOutputTemplate") project.outputTemplate = target.value || "{speaker}「{body}」";
      else project.charsPerMinute = Math.max(1, Number(target.value) || 300);
      saveProject(project).catch((error) => notify(error.message, true));
      return;
    }
    if (target.dataset.scriptAction === "speaker") {
      const line = state.lines.find((item) => item.id === target.closest("[data-line-id]")?.dataset.lineId);
      if (!line) return;
      line.speaker = target.value;
      saveLine(line, false).catch((error) => notify(error.message, true));
    }
  }

  function handleBlur(event) {
    const target = event.target;
    if (target.dataset.identityField === "1") {
      saveIdentityField(target);
      return;
    }
    if (target.dataset.scriptAction === "body") {
      const line = state.lines.find((item) => item.id === target.closest("[data-line-id]")?.dataset.lineId);
      if (!line) return;
      line.body = target.value;
      saveLine(line, false).catch((error) => notify(error.message, true));
    }
  }

  function bindEvents() {
    const root = page();
    if (!root) return;
    root.addEventListener("click", handleClick);
    root.addEventListener("change", handleChange);
    root.addEventListener("blur", handleBlur, true);
    const observer = new MutationObserver(() => {
      if (root.hidden) return;
      render();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["hidden"] });
    window.addEventListener("hashchange", () => {
      if (window.location.hash.replace("#", "").toLowerCase() === "hobby") render();
    });
    $("hobbyProjectList")?.addEventListener("dblclick", (event) => {
      const target = event.target.closest("[data-project-id]");
      if (target) editProject().catch((error) => notify(error.message, true));
    });
  }

  async function syncSession(session) {
    const user = session?.user || null;
    if (!user || isLocalMode() || !remoteClient) {
      if (state.storage !== "local") await loadLocal();
      return;
    }
    if (state.lastUserId === user.id && state.storage === "remote") return;
    state.user = user;
    state.lastUserId = user.id;
    await loadRemote();
  }

  async function init() {
    bindEvents();
    if (remoteClient && !isLocalMode()) {
      remoteClient.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => syncSession(session).catch((error) => notify(error.message, true)), 0);
      });
      const result = await remoteClient.auth.getSession();
      await syncSession(result.data?.session);
    } else {
      await loadLocal();
    }
    state.initialized = true;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
