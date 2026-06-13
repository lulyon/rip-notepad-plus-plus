use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use std::io::{Read, Write};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Mutex;

struct PtyState {
    #[allow(dead_code)] master: Box<dyn portable_pty::MasterPty + Send>, so PTY doesn't close
    writer: Box<dyn Write + Send>,                     // take_writer() called ONCE
}

static PTY: Mutex<Option<PtyState>> = Mutex::new(None);
static OUTPUT_RX: Mutex<Option<Receiver<String>>> = Mutex::new(None);

#[tauri::command]
pub async fn pty_spawn(cwd: String) -> Result<(), String> {
    pty_kill_internal();

    let pty_system = native_pty_system();
    let pty_pair = pty_system
        .openpty(PtySize { rows: 30, cols: 100, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| format!("openpty: {}", e))?;

    let shell = if cfg!(target_os = "windows") {
        "cmd.exe".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    };

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&cwd);
    cmd.env("TERM", "xterm-256color");

    let master = pty_pair.master;
    // take_writer() ONCE — dropping it sends EOF to shell
    let writer = master.take_writer().map_err(|e| format!("take_writer: {}", e))?;
    let mut reader = master.try_clone_reader().map_err(|e| format!("clone reader: {}", e))?;

    let child = pty_pair.slave.spawn_command(cmd).map_err(|e| format!("spawn: {}", e))?;

    // Background thread: read PTY output into channel
    let (tx, rx): (Sender<String>, Receiver<String>) = channel();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => { if tx.send(String::from_utf8_lossy(&buf[..n]).to_string()).is_err() { break; } }
                Err(_) => break,
            }
        }
    });

    *PTY.lock().unwrap() = Some(PtyState { master, writer });
    *OUTPUT_RX.lock().unwrap() = Some(rx);
    std::mem::forget(child);
    Ok(())
}

#[tauri::command]
pub async fn pty_write(data: String) -> Result<(), String> {
    let mut lock = PTY.lock().unwrap();
    if let Some(s) = lock.as_mut() {
        s.writer.write_all(data.as_bytes()).map_err(|e| format!("write: {}", e))?;
        s.writer.flush().ok();
    }
    Ok(())
}

#[tauri::command]
pub async fn pty_read() -> Result<String, String> {
    let lock = OUTPUT_RX.lock().unwrap();
    let mut out = String::new();
    if let Some(rx) = lock.as_ref() {
        while let Ok(chunk) = rx.try_recv() { out.push_str(&chunk); }
    }
    Ok(out)
}

#[tauri::command]
pub async fn pty_kill() -> Result<(), String> {
    pty_kill_internal();
    Ok(())
}

fn pty_kill_internal() {
    *PTY.lock().unwrap() = None;   // drops writer → EOF → shell exits
    *OUTPUT_RX.lock().unwrap() = None;
}
