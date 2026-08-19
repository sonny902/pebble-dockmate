//! Desktop action execution.
//!
//! Every action listed by [`supported_actions`] has a concrete implementation
//! for the current platform. Anything not listed is surfaced to the UI as an
//! explicitly unsupported action instead of silently doing nothing.

use std::process::{Command, Stdio};

pub const ALL_ACTIONS: [&str; 7] = [
    "open_app",
    "open_website",
    "open_folder",
    "run_command",
    "change_volume",
    "mute_microphone",
    "focus_mode",
];

/// Action types this build can actually perform.
pub fn supported_actions() -> Vec<String> {
    #[cfg(target_os = "windows")]
    let supported: &[&str] = &ALL_ACTIONS;
    #[cfg(target_os = "macos")]
    let supported: &[&str] = &ALL_ACTIONS;
    #[cfg(all(unix, not(target_os = "macos")))]
    let supported: &[&str] = &[
        "open_app",
        "open_website",
        "open_folder",
        "run_command",
        "change_volume",
        "mute_microphone",
    ];
    supported.iter().map(|s| (*s).to_string()).collect()
}

fn spawn(program: &str, args: &[&str], label: &str) -> Result<(), String> {
    Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Could not {label}: {e}"))
}

/// Windows launch target for a catalog app: a registered protocol where the
/// app publishes one, otherwise an executable resolved through PATH.
#[cfg(target_os = "windows")]
fn windows_launch_target(app: &str) -> Option<&'static str> {
    Some(match app {
        "Visual Studio Code" => "code",
        "Spotify" => "spotify:",
        "Google Chrome" => "chrome",
        "Discord" => "discord://",
        "Slack" => "slack://open",
        "Notion" => "notion://",
        "Terminal" => "wt",
        "Microsoft Teams" => "msteams://",
        "Figma" => "figma://",
        "Obsidian" => "obsidian://",
        "Zoom" => "zoommtg://",
        "Linear" => "linear://",
        "Mail" => "outlookmail:",
        "Calendar" => "outlookcal:",
        "Photoshop" => "photoshop",
        // macOS-only catalog entries have no Windows counterpart.
        "Safari" | "Apple Music" | "Xcode" => return None,
        _ => return None,
    })
}

/// Runs a PowerShell script from a temp file so quoting stays predictable.
#[cfg(target_os = "windows")]
fn powershell(script: &str, label: &str) -> Result<(), String> {
    use std::io::Write;
    let path = std::env::temp_dir().join(format!("pebble-{}.ps1", std::process::id()));
    let mut file = std::fs::File::create(&path).map_err(|e| format!("Could not {label}: {e}"))?;
    file.write_all(script.as_bytes())
        .map_err(|e| format!("Could not {label}: {e}"))?;
    drop(file);
    let status = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-WindowStyle",
            "Hidden",
            "-File",
        ])
        .arg(&path)
        .status()
        .map_err(|e| format!("Could not {label}: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("Could not {label}"))
    }
}

/// Core Audio interop used for master volume and microphone mute.
#[cfg(target_os = "windows")]
const AUDIO_INTEROP: &str = r#"
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int NotImpl1(); int NotImpl2(); int NotImpl3(); int NotImpl4();
  int SetMasterVolumeLevelScalar(float level, Guid ctx);
  int GetMasterVolumeLevelScalar(out float level);
  int NotImpl5(); int NotImpl6(); int NotImpl7(); int NotImpl8();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, Guid ctx);
  int GetMute(out bool mute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid iid, int clsCtx, IntPtr act, out IAudioEndpointVolume vol); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int NotImpl(); int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice dev); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class DeviceEnumerator { }
public static class PebbleAudio {
  static IAudioEndpointVolume Endpoint(int flow) {
    var e = (IMMDeviceEnumerator)(new DeviceEnumerator());
    IMMDevice dev; Marshal.ThrowExceptionForHR(e.GetDefaultAudioEndpoint(flow, 1, out dev));
    IAudioEndpointVolume vol; var iid = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(dev.Activate(ref iid, 23, IntPtr.Zero, out vol));
    return vol;
  }
  public static void SetVolume(int percent) {
    Marshal.ThrowExceptionForHR(Endpoint(0).SetMasterVolumeLevelScalar(percent / 100f, Guid.Empty));
  }
  public static void ToggleMicMute() {
    var v = Endpoint(1); bool muted; Marshal.ThrowExceptionForHR(v.GetMute(out muted));
    Marshal.ThrowExceptionForHR(v.SetMute(!muted, Guid.Empty));
  }
}
'@
"#;

pub fn execute(action_type: &str, target: &str) -> Result<(), String> {
    if !supported_actions().iter().any(|a| a == action_type) {
        return Err(format!(
            "'{action_type}' is not supported on this system yet"
        ));
    }

    match action_type {
        "open_app" => open_app(target),
        "open_website" => {
            let url = if target.starts_with("http://") || target.starts_with("https://") {
                target.to_string()
            } else {
                format!("https://{target}")
            };
            open_uri(&url, "open the website")
        }
        "open_folder" => {
            #[cfg(target_os = "windows")]
            {
                spawn("explorer", &[target], "open the folder")
            }
            #[cfg(target_os = "macos")]
            {
                spawn("open", &[target], "open the folder")
            }
            #[cfg(all(unix, not(target_os = "macos")))]
            {
                spawn("xdg-open", &[target], "open the folder")
            }
        }
        "run_command" => {
            #[cfg(target_os = "windows")]
            {
                spawn("cmd", &["/C", target], "run the command")
            }
            #[cfg(not(target_os = "windows"))]
            {
                spawn("sh", &["-lc", target], "run the command")
            }
        }
        "change_volume" => {
            let level: u8 = target
                .trim()
                .parse()
                .map_err(|_| "Volume must be a number between 0 and 100".to_string())?;
            let level = level.min(100);
            #[cfg(target_os = "windows")]
            {
                powershell(
                    &format!("{AUDIO_INTEROP}\n[PebbleAudio]::SetVolume({level})\n"),
                    "change the volume",
                )
            }
            #[cfg(target_os = "macos")]
            {
                spawn(
                    "osascript",
                    &["-e", &format!("set volume output volume {level}")],
                    "change the volume",
                )
            }
            #[cfg(all(unix, not(target_os = "macos")))]
            {
                spawn(
                    "pactl",
                    &["set-sink-volume", "@DEFAULT_SINK@", &format!("{level}%")],
                    "change the volume",
                )
            }
        }
        "mute_microphone" => {
            #[cfg(target_os = "windows")]
            {
                powershell(
                    &format!("{AUDIO_INTEROP}\n[PebbleAudio]::ToggleMicMute()\n"),
                    "toggle the microphone",
                )
            }
            #[cfg(target_os = "macos")]
            {
                spawn(
                    "osascript",
                    &[
                        "-e",
                        "set volume input muted not (input muted of (get volume settings))",
                    ],
                    "toggle the microphone",
                )
            }
            #[cfg(all(unix, not(target_os = "macos")))]
            {
                spawn(
                    "pactl",
                    &["set-source-mute", "@DEFAULT_SOURCE@", "toggle"],
                    "toggle the microphone",
                )
            }
        }
        "focus_mode" => {
            #[cfg(target_os = "windows")]
            {
                open_uri("ms-settings:quiethours", "open Focus settings")
            }
            #[cfg(target_os = "macos")]
            {
                open_uri(
                    "x-apple.systempreferences:com.apple.Focus",
                    "open Focus settings",
                )
            }
            #[cfg(all(unix, not(target_os = "macos")))]
            {
                Err("Focus mode is not available on this desktop".to_string())
            }
        }
        other => Err(format!("'{other}' is not a known Pebble action")),
    }
}

fn open_uri(uri: &str, label: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        spawn("cmd", &["/C", "start", "", uri], label)
    }
    #[cfg(target_os = "macos")]
    {
        spawn("open", &[uri], label)
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        spawn("xdg-open", &[uri], label)
    }
}

fn open_app(target: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Known catalog apps launch through their registered protocol or
        // executable; anything else is passed to the shell so user-installed
        // apps on PATH still work.
        let launch = windows_launch_target(target).unwrap_or(target);
        return spawn(
            "cmd",
            &["/C", "start", "", launch],
            &format!("open {target}"),
        );
    }
    #[cfg(target_os = "macos")]
    {
        spawn("open", &["-a", target], &format!("open {target}"))
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let lower = target.to_lowercase().replace(' ', "-");
        spawn(&lower, &[], &format!("open {target}"))
    }
}
