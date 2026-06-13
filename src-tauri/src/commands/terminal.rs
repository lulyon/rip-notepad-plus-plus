use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use std::io::{Read, Write};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Mutex;

// Buffered PTY output, continuously filled by a background thread
static OUTPUT_RX: Mutex<Option<Receiver<String>>> = Mutex::new(None);
static PTY_WRITER: Mutex<Option<Box<dyn Write + Send>>> = Mutex::new(None);

#[tauri::command]
pub async fn pty_spawn(cwd: String) -> Result<(), String> {
    pty_kill_internal();

    let pty_system = native_pty_system();
    let pty_pair = pty_system
        .openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let shell: String = if cfg!(target_os = "windows") {
        "cmd.exe".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    };

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(cwd);
    #[cfg(unix)] {
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
    }

    let mut reader = pty_pair.master.try_clone_reader()
        .map_err(|e| format!("Failed: {}", e))?;
    let writer = pty_pair.master.take_writer()
        .map_err(|e| format!("Failed: {}", e))?;

    let child = pty_pair.slave.spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn: {}", e))?;

    // Background thread: continuously read PTY output into channel
    let (tx, rx): (Sender<String>, Receiver<String>) = channel();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    if tx.send(s).is_err() { break; }
                }
                Err(_) => break,
            }
        }
    });

    *OUTPUT_RX.lock().unwrap() = Some(rx);
    *PTY_WRITER.lock().unwrap() = Some(writer);
    std::mem::forget(child); // Keeps child alive; dies when writer drops
    Ok(())
}

#[tauri::command]
pub async fn pty_write(data: String) -> Result<(), String> {
    let mut lock = PTY_WRITER.lock().unwrap();
    if let Some(w) = lock.as_mut() {
        w.write_all(data.as_bytes()).map_err(|e| format!("write: {}", e))?;
        w.flush().ok();
    }
    Ok(())
}

#[tauri::command]
pub async fn pty_read() -> Result<String, String> {
    let lock = OUTPUT_RX.lock().unwrap();
    let mut result = String::new();
    if let Some(rx) = lock.as_ref() {
        loop {
            match rx.try_recv() {
                Ok(chunk) => result.push_str(&chunk),
                Err(std::sync::mpsc::TryRecvError::Empty) => break,
                Err(std::sync::mpsc::TryRecvError::Disconnected) => break,
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn pty_kill() -> Result<(), String> {
    pty_kill_internal();
    Ok(())
}

fn pty_kill_internal() {
    *OUTPUT_RX.lock().unwrap() = None;
    *PTY_WRITER.lock().unwrap() = None;
}
