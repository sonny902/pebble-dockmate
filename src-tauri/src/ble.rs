//! Native Bluetooth Low Energy bridge for the Pebble hardware.
//!
//! Every BLE operation is serialised through a single async mutex so scans,
//! connects and background status polls can never run concurrently on the
//! adapter. Background polling uses `try_lock` and reports `BUSY` instead of
//! queuing, which keeps onboarding scans and connects responsive.

use btleplug::api::{Central, Characteristic, Manager as _, Peripheral as _, ScanFilter};
use btleplug::platform::{Adapter, Manager, Peripheral};
use serde::Serialize;
use std::time::Duration;
use tokio::sync::Mutex;
use uuid::Uuid;

/// Vendor status characteristic exposed by the Pebble firmware.
const STATUS_UUID: Uuid = Uuid::from_u128(0x87654321_4321_4321_4321_cba987654321);

/// Sentinel returned when another BLE operation already owns the adapter.
pub const BUSY: &str = "BUSY";

const SCAN_MS: u64 = 2500;

#[derive(Default)]
pub struct BleState {
    /// Serialises all adapter access.
    op: Mutex<()>,
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    adapter: Option<Adapter>,
    peripheral: Option<Peripheral>,
    characteristic: Option<Characteristic>,
    identifier: Option<String>,
    discovered: Vec<Peripheral>,
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
    /// Dock identifier reported by the hardware. `0` means "not docked".
    pub dock: u32,
    pub id: Option<u32>,
    pub name: String,
    pub identifier: String,
}

#[derive(Debug, serde::Deserialize)]
struct StatusPayload {
    #[serde(default)]
    battery: u8,
    #[serde(default)]
    charging: bool,
    #[serde(default)]
    dock: u32,
}

/// Extracts the numeric hardware id out of an advertised name ("Pebble 3020").
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

fn identifier_of(peripheral: &Peripheral) -> String {
    format!("{:?}", peripheral.id())
}

/// Accepts either the JSON status document or the 4 byte compact frame
/// `[dock_lo, dock_hi, battery, charging]` emitted by constrained firmware.
fn parse_status(data: &[u8]) -> Result<StatusPayload, String> {
    if let Ok(text) = std::str::from_utf8(data) {
        let trimmed = text.trim_end_matches(char::from(0)).trim();
        if trimmed.starts_with('{') {
            return serde_json::from_str(trimmed).map_err(|e| format!("Invalid Pebble status JSON: {e}"));
        }
    }
    if data.len() >= 4 {
        return Ok(StatusPayload {
            dock: u16::from_le_bytes([data[0], data[1]]) as u32,
            battery: data[2].min(100),
            charging: data[3] != 0,
        });
    }
    Err("Pebble returned an unreadable status payload".to_string())
}

async fn adapter(inner: &mut Inner) -> Result<Adapter, String> {
    if let Some(adapter) = inner.adapter.clone() {
        return Ok(adapter);
    }
    let manager = Manager::new()
        .await
        .map_err(|e| format!("Bluetooth is unavailable on this system: {e}"))?;
    let found = manager
        .adapters()
        .await
        .map_err(|e| format!("Could not list Bluetooth adapters: {e}"))?
        .into_iter()
        .next()
        .ok_or_else(|| "No Bluetooth adapter found. Turn Bluetooth on and try again.".to_string())?;
    inner.adapter = Some(found.clone());
    Ok(found)
}

async fn scan(adapter: &Adapter) -> Result<Vec<Peripheral>, String> {
    adapter
        .start_scan(ScanFilter::default())
        .await
        .map_err(|e| format!("Could not start the Bluetooth scan: {e}"))?;
    tokio::time::sleep(Duration::from_millis(SCAN_MS)).await;
    let result = adapter
        .peripherals()
        .await
        .map_err(|e| format!("Could not read nearby Bluetooth devices: {e}"));
    let _ = adapter.stop_scan().await;
    result
}

async fn peripheral_name(peripheral: &Peripheral) -> String {
    peripheral
        .properties()
        .await
        .ok()
        .flatten()
        .and_then(|p| p.local_name)
        .unwrap_or_else(|| "Pebble".to_string())
}

/// Reads the status characteristic, rediscovering services when the cached
/// handle has gone stale (which happens after every physical reconnect).
async fn read_status(
    peripheral: &Peripheral,
    cached: Option<Characteristic>,
) -> Result<(NativeStatus, Characteristic), String> {
    if !peripheral
        .is_connected()
        .await
        .map_err(|e| format!("Could not read the Pebble connection state: {e}"))?
    {
        peripheral
            .connect()
            .await
            .map_err(|e| format!("Could not reconnect to your Pebble: {e}"))?;
    }

    let mut characteristic = cached;
    let mut data: Option<Vec<u8>> = None;
    let mut last_error = String::new();

    for attempt in 0..2 {
        if characteristic.is_none() || attempt == 1 {
            peripheral
                .discover_services()
                .await
                .map_err(|e| format!("Could not discover the Pebble services: {e}"))?;
            characteristic = peripheral
                .characteristics()
                .into_iter()
                .find(|c| c.uuid == STATUS_UUID);
        }
        let Some(c) = characteristic.clone() else {
            last_error = "This device does not expose the Pebble status characteristic".to_string();
            continue;
        };
        match peripheral.read(&c).await {
            Ok(bytes) => {
                data = Some(bytes);
                break;
            }
            Err(e) => last_error = format!("Could not read the Pebble status: {e}"),
        }
    }

    let (Some(bytes), Some(characteristic)) = (data, characteristic) else {
        return Err(if last_error.is_empty() {
            "Could not read the Pebble status".to_string()
        } else {
            last_error
        });
    };

    let payload = parse_status(&bytes)?;
    let name = peripheral_name(peripheral).await;
    Ok((
        NativeStatus {
            battery: payload.battery.min(100),
            charging: payload.charging,
            dock: payload.dock,
            id: pebble_id(&name),
            name,
            identifier: identifier_of(peripheral),
        },
        characteristic,
    ))
}

impl BleState {
    pub async fn scan_pebbles(&self) -> Result<Vec<NearbyPebble>, String> {
        let _op = self.op.lock().await;
        let mut inner = self.inner.lock().await;
        let adapter = adapter(&mut inner).await?;
        drop(inner);

        let peripherals = scan(&adapter).await?;
        let mut found = Vec::new();
        let mut discovered = Vec::new();
        for peripheral in peripherals {
            let Ok(Some(properties)) = peripheral.properties().await else {
                continue;
            };
            let Some(name) = properties.local_name.clone() else {
                continue;
            };
            if !name.to_ascii_lowercase().starts_with("pebble") {
                continue;
            }
            discovered.push(peripheral.clone());
            found.push(NearbyPebble {
                id: pebble_id(&name),
                identifier: identifier_of(&peripheral),
                rssi: properties
                    .rssi
                    .map(|v| format!("{v} dBm"))
                    .unwrap_or_else(|| "Nearby".to_string()),
                name,
            });
        }
        found.sort_by(|a, b| a.name.cmp(&b.name));

        let mut inner = self.inner.lock().await;
        inner.discovered = discovered;
        Ok(found)
    }

    pub async fn connect(&self, identifier: String) -> Result<NativeStatus, String> {
        let _op = self.op.lock().await;
        let mut inner = self.inner.lock().await;
        let adapter = adapter(&mut inner).await?;
        let known = inner
            .discovered
            .iter()
            .find(|p| identifier_of(p) == identifier)
            .cloned();
        drop(inner);

        let peripheral = match known {
            Some(p) => p,
            None => scan(&adapter)
                .await?
                .into_iter()
                .find(|p| identifier_of(p) == identifier)
                .ok_or_else(|| "That Pebble is not nearby right now".to_string())?,
        };

        if !peripheral
            .is_connected()
            .await
            .map_err(|e| format!("Could not read the Pebble connection state: {e}"))?
        {
            peripheral
                .connect()
                .await
                .map_err(|e| format!("Could not connect to your Pebble: {e}"))?;
        }

        let (status, characteristic) = read_status(&peripheral, None).await?;
        let mut inner = self.inner.lock().await;
        inner.peripheral = Some(peripheral);
        inner.characteristic = Some(characteristic);
        inner.identifier = Some(identifier);
        Ok(status)
    }

    pub async fn disconnect(&self) -> Result<(), String> {
        let _op = self.op.lock().await;
        let mut inner = self.inner.lock().await;
        if let Some(peripheral) = inner.peripheral.take() {
            if peripheral.is_connected().await.unwrap_or(false) {
                let _ = peripheral.disconnect().await;
            }
        }
        inner.characteristic = None;
        inner.identifier = None;
        inner.discovered.clear();
        Ok(())
    }

    /// Background-safe status read. Returns [`BUSY`] rather than waiting when
    /// a scan or connect currently owns the adapter.
    pub async fn status(&self) -> Result<NativeStatus, String> {
        let Ok(_op) = self.op.try_lock() else {
            return Err(BUSY.to_string());
        };
        let inner = self.inner.lock().await;
        let peripheral = inner
            .peripheral
            .clone()
            .ok_or_else(|| "Pebble is not connected".to_string())?;
        let cached = inner.characteristic.clone();
        drop(inner);

        let (status, characteristic) = read_status(&peripheral, cached).await?;
        self.inner.lock().await.characteristic = Some(characteristic);
        Ok(status)
    }

    pub async fn is_connected(&self) -> bool {
        let inner = self.inner.lock().await;
        match inner.peripheral.clone() {
            Some(p) => {
                drop(inner);
                p.is_connected().await.unwrap_or(false)
            }
            None => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_id_from_advertised_name() {
        assert_eq!(pebble_id("Pebble 3020"), Some(3020));
        assert_eq!(pebble_id("Pebble"), None);
    }

    #[test]
    fn parses_json_status() {
        let s = parse_status(br#"{"battery":82,"charging":true,"dock":3015}"#).unwrap();
        assert_eq!((s.battery, s.charging, s.dock), (82, true, 3015));
    }

    #[test]
    fn parses_binary_status() {
        let s = parse_status(&[0xC7, 0x0B, 64, 1]).unwrap();
        assert_eq!((s.battery, s.charging, s.dock), (64, true, 3015));
    }
}
