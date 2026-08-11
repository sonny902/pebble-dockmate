use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter};
use btleplug::platform::{Adapter, Manager, Peripheral};
use serde::Serialize;
use std::sync::Arc;
use std::time::Duration;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

const STATUS_UUID: &str = "87654321-4321-4321-4321-cba987654321";

#[derive(Default)]
pub struct AppState {
    adapter: Mutex<Option<Adapter>>,
    peripheral: Mutex<Option<Peripheral>>,
    identifier: Mutex<Option<String>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NearbyPebble {
    pub id: Option<u32>,
    pub name: String,
    pub identifier: String,
    pub rssi: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeStatus {
    pub battery: u8,
    pub charging: bool,
    pub dock: u32,
    pub id: Option<u32>,
    pub name: String,
    pub identifier: String,
}

fn pebble_id(name: &str) -> Option<u32> {
    let digits: String = name
        .chars()
        .skip_while(|c| !c.is_ascii_digit())
        .take_while(|c| c.is_ascii_digit())
        .collect();

    if digits.is_empty() {
        None
    } else {
        digits.parse().ok()
    }
}

async fn get_adapter(state: &AppState) -> Result<Adapter, String> {
    if let Some(adapter) = state.adapter.lock().await.clone() {
        return Ok(adapter);
    }

    let manager = Manager::new()
        .await
        .map_err(|e| format!("Bluetooth manager error: {e}"))?;
    let mut adapters = manager
        .adapters()
        .await
        .map_err(|e| format!("Bluetooth adapter error: {e}"))?;

    let adapter = adapters
        .drain(..)
        .next()
        .ok_or_else(|| "No Bluetooth adapter found".to_string())?;

    *state.adapter.lock().await = Some(adapter.clone());
    Ok(adapter)
}

async fn scan_adapter(adapter: &Adapter) -> Result<Vec<Peripheral>, String> {
    adapter
        .start_scan(ScanFilter::default())
        .await
        .map_err(|e| format!("Could not start Bluetooth scan: {e}"))?;

    tokio::time::sleep(Duration::from_secs(2)).await;

    adapter
        .peripherals()
        .await
        .map_err(|e| format!("Could not read Bluetooth devices: {e}"))
}

async fn read_status(peripheral: &Peripheral) -> Result<NativeStatus, String> {
    if !peripheral
        .is_connected()
        .await
        .map_err(|e| format!("Could not read Pebble connection state: {e}"))?
    {
        peripheral
            .connect()
            .await
            .map_err(|e| format!("Could not reconnect to Pebble: {e}"))?;
    }

    peripheral
        .discover_services()
        .await
        .map_err(|e| format!("Could not discover Pebble services: {e}"))?;

    let status_uuid = Uuid::parse_str(STATUS_UUID).map_err(|e| e.to_string())?;
    let characteristic = peripheral
        .characteristics()
        .into_iter()
        .find(|characteristic| characteristic.uuid == status_uuid)
        .ok_or_else(|| "Pebble status characteristic was not found".to_string())?;

    let data = peripheral
        .read(&characteristic)
        .await
        .map_err(|e| format!("Could not read Pebble status: {e}"))?;

    let text = String::from_utf8(data).map_err(|e| format!("Invalid Pebble status: {e}"))?;
    let raw: PebbleStatus =
        serde_json::from_str(&text).map_err(|e| format!("Invalid Pebble JSON: {e}"))?;

    let properties = peripheral
        .properties()
        .await
        .map_err(|e| format!("Could not read Pebble properties: {e}"))?;

    let name = properties
        .as_ref()
        .and_then(|p| p.local_name.clone())
        .unwrap_or_else(|| "Pebble".to_string());

    let identifier = format!("{:?}", peripheral.id());

    Ok(NativeStatus {
        battery: raw.battery,
        charging: raw.charging,
        dock: raw.dock,
        id: pebble_id(&name),
        name,
        identifier,
    })
}

#[derive(Debug, serde::Deserialize)]
struct PebbleStatus {
    battery: u8,
    charging: bool,
    dock: u32,
}

#[tauri::command]
async fn scan_pebbles(state: State<'_, AppState>) -> Result<Vec<NearbyPebble>, String> {
    let adapter = get_adapter(&state).await?;
    let peripherals = scan_adapter(&adapter).await?;
    let mut found = Vec::new();

    for peripheral in peripherals {
        let properties = match peripheral.properties().await {
            Ok(Some(properties)) => properties,
            _ => continue,
        };

        let Some(name) = properties.local_name else {
            continue;
        };

        if !name.to_ascii_lowercase().starts_with("pebble") {
            continue;
        }

        let identifier = format!("{:?}", peripheral.id());
        let rssi = properties
            .rssi
            .map(|value| format!("{} dBm", value))
            .unwrap_or_else(|| "Nearby".to_string());

        found.push(NearbyPebble {
            id: pebble_id(&name),
            name,
            identifier,
            rssi,
        });
    }

    adapter
        .stop_scan()
        .await
        .map_err(|e| format!("Could not stop Bluetooth scan: {e}"))?;

    Ok(found)
}

#[tauri::command]
async fn connect_pebble(
    state: State<'_, AppState>,
    identifier: String,
) -> Result<NativeStatus, String> {
    let adapter = get_adapter(&state).await?;
    let peripherals = scan_adapter(&adapter).await?;

    let peripheral = peripherals
        .into_iter()
        .find(|candidate| format!("{:?}", candidate.id()) == identifier)
        .ok_or_else(|| "That Pebble is no longer nearby".to_string())?;

    if !peripheral
        .is_connected()
        .await
        .map_err(|e| format!("Could not read Pebble connection state: {e}"))?
    {
        peripheral
            .connect()
            .await
            .map_err(|e| format!("Could not connect to Pebble: {e}"))?;
    }

    let status = read_status(&peripheral).await?;

    *state.peripheral.lock().await = Some(peripheral);
    *state.identifier.lock().await = Some(identifier);

    Ok(status)
}

#[tauri::command]
async fn get_status(state: State<'_, AppState>) -> Result<NativeStatus, String> {
    let peripheral = state
        .peripheral
        .lock()
        .await
        .clone()
        .ok_or_else(|| "Pebble is not connected".to_string())?;

    read_status(&peripheral).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![scan_pebbles, connect_pebble, get_status])
        .run(tauri::generate_context!())
        .expect("error while running Pebble Companion");
}
