#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Deep links received while ZUNO is already open are forwarded to the first process.
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
    }

    builder = builder.plugin(tauri_plugin_deep_link::init());

    builder
        .run(tauri::generate_context!())
        .expect("ZUNO Music desktop runtime failed");
}
