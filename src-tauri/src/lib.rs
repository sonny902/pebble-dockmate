mod actions;
mod ble;

use ble::{BleState, NativeStatus, NearbyPebble};
use tauri::State;

#[tauri::command]
async fn scan_pebbles(state: State<'_, BleState>) -> Result<Vec<NearbyPebble>, String> {
    state.scan_pebbles().await
}

#[tauri::command]
async fn connect_pebble(
    state: State<'_, BleState>,
    identifier: String,
) -> Result<NativeStatus, String> {
    state.connect(identifier).await
}

#[tauri::command]
async fn reconnect_pebble(
    state: State<'_, BleState>,
    identifier: String,
) -> Result<NativeStatus, String> {
    state.connect(identifier).await
}

#[tauri::command]
async fn disconnect_pebble(state: State<'_, BleState>) -> Result<(), String> {
    state.disconnect().await
}

#[tauri::command]
async fn get_status(state: State<'_, BleState>) -> Result<NativeStatus, String> {
    state.status().await
}

/// Convenience read used by the dock setup flow. `0` means "not docked".
#[tauri::command]
async fn get_dock_id(state: State<'_, BleState>) -> Result<u32, String> {
    state.status().await.map(|s| s.dock)
}

#[tauri::command]
async fn is_connected(state: State<'_, BleState>) -> Result<bool, String> {
    Ok(state.is_connected().await)
}

#[tauri::command]
async fn supported_actions() -> Result<Vec<String>, String> {
    Ok(actions::supported_actions())
}

#[tauri::command]
async fn execute_action(action_type: String, target: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || actions::execute(&action_type, &target))
        .await
        .map_err(|e| format!("Action failed to start: {e}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BleState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_pebbles,
            connect_pebble,
            reconnect_pebble,
            disconnect_pebble,
            get_status,
            get_dock_id,
            is_connected,
            supported_actions,
            execute_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running Pebble Companion");
}
