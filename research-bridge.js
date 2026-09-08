(() => {
  "use strict";

  const SETTINGS_KEY = "vectory.research-server-settings.v1";
  const PACKET_KEY = "vectory.latest-research-packet.v1";
  const SOL_DRAFT_KEY = "vectory.research-sol-draft.v1";
  const DEFAULT_SETTINGS = { serverUrl: "", token: "", projectUrl: "" };
  const state = {
    settings: readJson(SETTINGS_KEY, DEFAULT_SETTINGS),
    selectedFiles: new Set(),
    currentPath: "",
    latestPacket: readJson(PACKET_KEY, null),
    online: false,
    refreshing: false,
  };

  const $ = (id) => document.getElementById(id);
  const elements = {};

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeServerUrl(value) {
    const raw = String(value || "").trim().replace(/\/+$/, "");
    if (!raw) return "";
    const parsed = new URL(raw);
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
      throw new Error("サーバーURLはHTTPSにしてください。");
    }
    return parsed.toString().replace(/\/$/, "");
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(date);
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function setServerStatus(kind, message, checkedAt = "") {
    state.online = kind === "online";
    elements.researchServerDot.className = `research-server-dot is-${kind}`;
    elements.researchServerStatus.textContent = kind === "online" ? "ONLINE" : kind === "checking" ? "CHECKING" : "OFFLINE";
    elements.researchServerMessage.textContent = message;
    elements.researchServerCheckedAt.textContent = checkedAt || (kind === "checking" ? "確認中" : "未接続");
    elements.researchFilesButton.disabled = !state.online;
    elements.researchPacketButton.disabled = !state.online;
    elements.researchAdoptButton.disabled = !state.online;
  }

  function setAdoptionStatus(message, isError = false) {
    elements.researchAdoptionStatus.textContent = message;
    elements.researchAdoptionStatus.style.color = isError ? "var(--red)" : "";
  }

  async function api(path, options = {}) {
    if (!state.settings.serverUrl) throw new Error("研究サーバーの接続設定がありません。");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeout || 9000);
    try {
      const response = await fetch(`${state.settings.serverUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(state.settings.token ? { Authorization: `Bearer ${state.settings.token}` } : {}),
          ...(options.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `研究サーバー応答エラー (${response.status})`);
      return payload;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("研究サーバーが応答しませんでした。");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function apiBlob(path) {
    if (!state.settings.serverUrl) throw new Error("研究サーバーの接続設定がありません。");
    const response = await fetch(`${state.settings.serverUrl}${path}`, {
      headers: state.settings.token ? { Authorization: `Bearer ${state.settings.token}` } : {},
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `研究資料の取得に失敗しました (${response.status})`);
    }
    return response.blob();
  }

  async function getCloudContext() {
    const context = window.__VECTORY_APP_CONTEXT__;
    const client = context?.getSupabaseClient?.();
    const user = context?.getUser?.();
    return client && user ? { client, user } : null;
  }

  async function loadCachedSummary() {
    const cloud = await getCloudContext();
    if (!cloud) return;
    const { data, error } = await cloud.client
      .from("research_page_settings")
      .select("state_summary, last_sync_at, last_record_title")
      .eq("user_id", cloud.user.id)
      .maybeSingle();
    if (error || !data) return;
    if (data.state_summary) elements.researchCurrentState.textContent = data.state_summary;
    elements.researchStateSource.textContent = data.last_sync_at
      ? `最終同期 ${formatDate(data.last_sync_at)}（サーバー停止中も表示）`
      : "";
    if (data.last_record_title) {
      elements.researchRecentRecords.innerHTML = `<div class="research-recent-record"><strong>${escapeHtml(data.last_record_title)}</strong><small>最終同期時の記録</small></div>`;
    }
  }

  async function saveCloudSummary(serverState, records) {
    const cloud = await getCloudContext();
    if (!cloud) return;
    await cloud.client.from("research_page_settings").upsert({
      user_id: cloud.user.id,
      state_summary: String(serverState.summary || "").slice(0, 4000),
      last_sync_at: new Date().toISOString(),
      last_record_title: String(records[0]?.name || "").slice(0, 240) || null,
      server_label: String(serverState.root_name || "自宅研究PC").slice(0, 120),
    }, { onConflict: "user_id" });
  }

  async function savePacketMetadata(packet, problem) {
    const cloud = await getCloudContext();
    if (!cloud) return;
    await cloud.client.from("research_packets").insert({
      id: packet.id,
      user_id: cloud.user.id,
      problem: String(problem).slice(0, 4000),
      source_files: Array.isArray(packet.sources) ? packet.sources.slice(0, 100) : [],
      generated_by: String(packet.generated_by || "local-server").slice(0, 80),
      status: "draft",
    });
  }

  async function saveConsultationMetadata(status, response, recordPath = null) {
    const cloud = await getCloudContext();
    if (!cloud || !state.latestPacket?.id) return;
    await cloud.client.from("research_consultations").upsert({
      user_id: cloud.user.id,
      packet_id: state.latestPacket.id,
      status,
      response_excerpt: String(response).replace(/\s+/g, " ").slice(0, 500),
      adopted_record_path: recordPath,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,packet_id" });
  }

  function renderRecords(records) {
    if (!records.length) {
      elements.researchRecentRecords.innerHTML = "<p>最近の研究記録はありません。</p>";
      return;
    }
    elements.researchRecentRecords.innerHTML = records.slice(0, 5).map((record) => `
      <div class="research-recent-record">
        <button type="button" data-research-record-path="${escapeHtml(record.path)}">
          <strong>${escapeHtml(record.name)}</strong>
          <small>${escapeHtml(formatDate(record.modified_at))}${record.summary ? ` · ${escapeHtml(record.summary)}` : ""}</small>
        </button>
      </div>
    `).join("");
  }

  async function refreshResearchServer({ quiet = false } = {}) {
    if (state.refreshing) return;
    if (!state.settings.serverUrl) {
      setServerStatus("offline", "接続設定から、自宅PCの研究サーバーURLを登録してください。");
      return;
    }
    state.refreshing = true;
    if (!quiet) setServerStatus("checking", "研究サーバーへ接続しています。");
    try {
      const [health, serverState, recordResult] = await Promise.all([
        api("/api/health"),
        api("/api/state"),
        api("/api/records?limit=5"),
      ]);
      const records = Array.isArray(recordResult.records) ? recordResult.records : [];
      setServerStatus("online", health.message || `${health.root_name || "研究フォルダー"}に接続しています。`, formatDate(new Date()));
      elements.researchCurrentState.textContent = serverState.summary || "研究状態の記録はまだありません。";
      elements.researchStateSource.textContent = serverState.updated_at
        ? `${serverState.source || "研究サーバー"} · ${formatDate(serverState.updated_at)}`
        : (serverState.source || "");
      renderRecords(records);
      saveCloudSummary({ ...serverState, root_name: health.root_name }, records).catch(() => {});
    } catch (error) {
      setServerStatus("offline", error.message || "研究サーバーへ接続できませんでした。", formatDate(new Date()));
      loadCachedSummary().catch(() => {});
    } finally {
      state.refreshing = false;
    }
  }

  function openModal(element) {
    element.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeModal(element) {
    element.hidden = true;
    if (![elements.researchServerSettingsModal, elements.researchFilesModal, elements.researchPacketModal].some((modal) => !modal.hidden)) {
      document.body.classList.remove("modal-open");
    }
  }

  function closeAllBridgeModals() {
    [elements.researchServerSettingsModal, elements.researchFilesModal, elements.researchPacketModal].forEach(closeModal);
  }

  function openSettings() {
    elements.researchServerUrl.value = state.settings.serverUrl || "";
    elements.researchServerToken.value = state.settings.token || "";
    elements.researchProjectUrl.value = state.settings.projectUrl || "";
    openModal(elements.researchServerSettingsModal);
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      state.settings = {
        serverUrl: normalizeServerUrl(elements.researchServerUrl.value),
        token: elements.researchServerToken.value.trim(),
        projectUrl: elements.researchProjectUrl.value.trim(),
      };
      if (state.settings.projectUrl) new URL(state.settings.projectUrl);
      saveJson(SETTINGS_KEY, state.settings);
      closeModal(elements.researchServerSettingsModal);
      await refreshResearchServer();
    } catch (error) {
      elements.researchServerMessage.textContent = error.message;
    }
  }

  function renderFiles(entries) {
    if (!entries.length) {
      elements.researchFilesList.innerHTML = "<p class=\"research-bridge-help\">この階層に表示できる資料はありません。</p>";
      return;
    }
    elements.researchFilesList.innerHTML = entries.map((entry) => {
      const checked = state.selectedFiles.has(entry.path) ? "checked" : "";
      const checkbox = entry.type === "file" && entry.previewable
        ? `<input type="checkbox" data-research-select-file="${escapeHtml(entry.path)}" ${checked} aria-label="Packetの参照資料に選択" />`
        : "";
      return `<div class="research-file-row">
        ${checkbox}
        <button class="research-file-name" type="button" data-research-file-path="${escapeHtml(entry.path)}" data-research-file-type="${escapeHtml(entry.type)}" data-research-file-previewable="${entry.previewable ? "true" : "false"}">
          <span aria-hidden="true">${entry.type === "directory" ? "▸" : "□"}</span>
          <span>${escapeHtml(entry.name)}</span>
        </button>
        <span class="research-file-meta">${entry.type === "directory" ? "フォルダー" : formatBytes(entry.size)}${entry.modified_at ? ` · ${escapeHtml(formatDate(entry.modified_at))}` : ""}</span>
      </div>`;
    }).join("");
  }

  function updateSelectionCount() {
    elements.researchFileSelectionCount.textContent = `選択中 ${state.selectedFiles.size}件`;
    elements.researchPacketSources.textContent = state.selectedFiles.size
      ? `参照資料：${[...state.selectedFiles].join("、")}`
      : "参照資料：サーバーが最近の記録を選びます。";
  }

  async function loadFiles(path = "") {
    elements.researchFilesList.innerHTML = "<p class=\"research-bridge-help\">読み込み中...</p>";
    elements.researchFilePreview.hidden = true;
    try {
      const result = await api(`/api/files?path=${encodeURIComponent(path)}`);
      state.currentPath = result.path || "";
      elements.researchFilesPath.textContent = `/${state.currentPath}`;
      elements.researchFilesUpButton.disabled = !state.currentPath;
      renderFiles(Array.isArray(result.entries) ? result.entries : []);
      updateSelectionCount();
    } catch (error) {
      elements.researchFilesList.innerHTML = `<p class="research-bridge-help">${escapeHtml(error.message)}</p>`;
    }
  }

  async function previewFile(path) {
    elements.researchFilePreview.hidden = false;
    elements.researchFilePreview.textContent = "読み込み中...";
    try {
      const result = await api(`/api/file?path=${encodeURIComponent(path)}`);
      elements.researchFilePreview.textContent = result.content || "（内容なし）";
    } catch (error) {
      elements.researchFilePreview.textContent = error.message;
    }
  }

  async function openBinaryFile(path) {
    const previewWindow = window.open("", "_blank");
    if (previewWindow) previewWindow.opener = null;
    elements.researchFilePreview.hidden = false;
    elements.researchFilePreview.textContent = "研究資料を取得しています...";
    try {
      const blob = await apiBlob(`/api/download?path=${encodeURIComponent(path)}`);
      const objectUrl = URL.createObjectURL(blob);
      if (previewWindow) previewWindow.location.replace(objectUrl);
      else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = path.split("/").pop() || "research-file";
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      elements.researchFilePreview.textContent = "研究資料を新しいタブで開きました。";
    } catch (error) {
      previewWindow?.close();
      elements.researchFilePreview.textContent = error.message;
    }
  }

  function openFiles(path = "") {
    if (!state.online) return refreshResearchServer();
    openModal(elements.researchFilesModal);
    loadFiles(path);
  }

  function openPacketModal() {
    elements.researchPacketForm.hidden = false;
    elements.researchPacketResult.hidden = true;
    updateSelectionCount();
    openModal(elements.researchPacketModal);
    elements.researchPacketProblem.focus();
  }

  async function createPacket(event) {
    event.preventDefault();
    const problem = elements.researchPacketProblem.value.trim();
    if (!problem) return;
    elements.researchPacketSubmit.disabled = true;
    elements.researchPacketSubmit.textContent = "作成中...";
    try {
      const packet = await api("/api/packets", {
        method: "POST",
        timeout: 190000,
        body: JSON.stringify({ problem, selected_files: [...state.selectedFiles] }),
      });
      if (!packet.id) packet.id = crypto.randomUUID?.() || `packet-${Date.now()}`;
      state.latestPacket = { ...packet, problem, created_at: packet.created_at || new Date().toISOString() };
      saveJson(PACKET_KEY, state.latestPacket);
      elements.researchPacketOutput.value = packet.markdown || "";
      elements.researchPacketForm.hidden = true;
      elements.researchPacketResult.hidden = false;
      savePacketMetadata(packet, problem).catch(() => {});
    } catch (error) {
      elements.researchPacketSources.textContent = error.message;
    } finally {
      elements.researchPacketSubmit.disabled = false;
      elements.researchPacketSubmit.textContent = "作成";
    }
  }

  async function copyText(value) {
    await navigator.clipboard.writeText(value);
  }

  async function openSol() {
    const markdown = state.latestPacket?.markdown || elements.researchPacketOutput.value;
    if (!markdown) {
      openPacketModal();
      return;
    }
    const target = state.settings.projectUrl || "https://chatgpt.com/";
    const solWindow = window.open(target, "_blank");
    if (solWindow) solWindow.opener = null;
    try {
      await copyText(markdown);
    } catch (_) {
      elements.researchPacketOutput?.select?.();
    }
    setAdoptionStatus("Research Packetをコピーし、Solの画面を開きました。");
  }

  function saveSolDraft() {
    const response = elements.researchSolResponse.value.trim();
    localStorage.setItem(SOL_DRAFT_KEY, response);
    saveConsultationMetadata("draft", response).catch(() => {});
    setAdoptionStatus(response ? "この端末に下書きを保存しました。" : "下書きを消去しました。");
  }

  async function adoptSolResponse() {
    const response = elements.researchSolResponse.value.trim();
    if (!response) {
      setAdoptionStatus("採用するSol回答を入力してください。", true);
      return;
    }
    if (!state.latestPacket?.id) {
      setAdoptionStatus("先にResearch Packetを作成してください。", true);
      return;
    }
    if (!window.confirm("この回答を、人間が採用した研究記録として自宅PCへ保存しますか？")) return;
    elements.researchAdoptButton.disabled = true;
    try {
      const result = await api("/api/adoptions", {
        method: "POST",
        body: JSON.stringify({
          packet_id: state.latestPacket.id,
          problem: state.latestPacket.problem || "",
          response,
          sources: state.latestPacket.sources || [],
        }),
      });
      await saveConsultationMetadata("adopted", response, result.path || null).catch(() => {});
      localStorage.removeItem(SOL_DRAFT_KEY);
      elements.researchSolResponse.value = "";
      setAdoptionStatus(`採用済み：${result.path || "研究記録へ保存しました。"}`);
      refreshResearchServer({ quiet: true });
    } catch (error) {
      setAdoptionStatus(error.message, true);
    } finally {
      elements.researchAdoptButton.disabled = !state.online;
    }
  }

  function handleFilesClick(event) {
    const select = event.target.closest("[data-research-select-file]");
    if (select) {
      if (select.checked) state.selectedFiles.add(select.dataset.researchSelectFile);
      else state.selectedFiles.delete(select.dataset.researchSelectFile);
      updateSelectionCount();
      return;
    }
    const file = event.target.closest("[data-research-file-path]");
    if (!file) return;
    if (file.dataset.researchFileType === "directory") loadFiles(file.dataset.researchFilePath);
    else if (file.dataset.researchFilePreviewable === "true") previewFile(file.dataset.researchFilePath);
    else openBinaryFile(file.dataset.researchFilePath);
  }

  function parentPath(path) {
    return String(path || "").split("/").filter(Boolean).slice(0, -1).join("/");
  }

  function bindElements() {
    [
      "researchServerDot", "researchServerStatus", "researchServerCheckedAt", "researchServerMessage",
      "researchCurrentState", "researchStateSource", "researchRecentRecords", "researchFilesButton",
      "researchPacketButton", "researchSolButton", "researchServerRefreshButton", "researchServerSettingsButton",
      "researchSolResponse", "researchSaveDraftButton", "researchAdoptButton", "researchAdoptionStatus",
      "researchServerSettingsModal", "researchServerSettingsForm", "researchServerUrl", "researchServerToken",
      "researchProjectUrl", "researchFilesModal", "researchFilesPath", "researchFilesUpButton",
      "researchFilesReloadButton", "researchFilesList", "researchFilePreview", "researchFileSelectionCount",
      "researchPacketModal", "researchPacketForm", "researchPacketProblem", "researchPacketSources",
      "researchPacketSubmit", "researchPacketResult", "researchPacketOutput", "researchPacketCopyButton",
      "researchPacketSolButton",
    ].forEach((id) => { elements[id] = $(id); });
  }

  function boot() {
    bindElements();
    if (!elements.researchServerStatus) return;
    elements.researchSolResponse.value = localStorage.getItem(SOL_DRAFT_KEY) || "";
    if (state.latestPacket?.markdown) elements.researchPacketOutput.value = state.latestPacket.markdown;

    elements.researchServerSettingsButton.addEventListener("click", openSettings);
    elements.researchServerRefreshButton.addEventListener("click", () => refreshResearchServer());
    elements.researchServerSettingsForm.addEventListener("submit", saveSettings);
    elements.researchFilesButton.addEventListener("click", () => openFiles(""));
    elements.researchPacketButton.addEventListener("click", openPacketModal);
    elements.researchSolButton.addEventListener("click", openSol);
    elements.researchPacketForm.addEventListener("submit", createPacket);
    elements.researchPacketCopyButton.addEventListener("click", () => copyText(elements.researchPacketOutput.value));
    elements.researchPacketSolButton.addEventListener("click", openSol);
    elements.researchSaveDraftButton.addEventListener("click", saveSolDraft);
    elements.researchAdoptButton.addEventListener("click", adoptSolResponse);
    elements.researchFilesList.addEventListener("click", handleFilesClick);
    elements.researchFilesUpButton.addEventListener("click", () => loadFiles(parentPath(state.currentPath)));
    elements.researchFilesReloadButton.addEventListener("click", () => loadFiles(state.currentPath));
    elements.researchRecentRecords.addEventListener("click", (event) => {
      const button = event.target.closest("[data-research-record-path]");
      if (!button) return;
      openModal(elements.researchFilesModal);
      elements.researchFilesPath.textContent = button.dataset.researchRecordPath;
      elements.researchFilesList.innerHTML = "";
      previewFile(button.dataset.researchRecordPath);
    });
    document.querySelectorAll("[data-research-bridge-close]").forEach((button) => button.addEventListener("click", closeAllBridgeModals));
    document.querySelectorAll("[data-research-open-packet]").forEach((button) => button.addEventListener("click", () => {
      closeModal(elements.researchFilesModal);
      openPacketModal();
    }));
    [elements.researchServerSettingsModal, elements.researchFilesModal, elements.researchPacketModal].forEach((modal) => {
      modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal); });
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeAllBridgeModals(); });
    window.addEventListener("hashchange", () => {
      if (location.hash.replace("#", "") === "research") refreshResearchServer({ quiet: state.online });
    });
    window.addEventListener("vectory:session-change", (event) => {
      if (event.detail?.signedIn) loadCachedSummary().catch(() => {});
    });
    window.setTimeout(() => {
      loadCachedSummary().catch(() => {});
      if (state.settings.serverUrl) refreshResearchServer();
      else setServerStatus("offline", "接続設定から、自宅PCの研究サーバーURLを登録してください。");
    }, 500);
    window.setInterval(() => {
      if (location.hash.replace("#", "") === "research" && state.settings.serverUrl) refreshResearchServer({ quiet: true });
    }, 60000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
