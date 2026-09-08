// Supabaseの公開URLと公開キーを設定してください。
// ここに入れるのは anon / publishable key です。service_role key は絶対に入れないでください。
window.__MY_APP_CONFIG__ = {
  SUPABASE_URL: "https://cxecdwseyesundvixfqq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_AR_NENscra2DuONe_MKsCQ_i07AKexc",
};

if ("serviceWorker" in navigator && (window.isSecureContext || location.hostname === "localhost")) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  }, { once: true });

  navigator.serviceWorker.register("./sw.js?v=0.3.6", { updateViaCache: "none" }).catch(() => {});
}
