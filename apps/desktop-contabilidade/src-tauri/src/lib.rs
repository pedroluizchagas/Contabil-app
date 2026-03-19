// Comandos Tauri do App Contabilidade
// Operações nativas são adicionadas aqui conforme necessário.
// A maior parte da lógica roda no frontend React via Supabase.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o app ContaHub");
}
