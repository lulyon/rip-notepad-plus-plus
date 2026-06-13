use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use std::io::{Read, Write};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Mutex;

type PtyMaster = Box<dyn portable_pty::MasterPty + Send>;

static PTY_MASTER: Mutex<Option<PtyMaster>> = Mutex::new(None);
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
    cmd.env("LANG", "en_US.UTF-8");

    let master = pty_pair.master;
    let mut reader = master.try_clone_reader().map_err(|e| format!("clone reader: {}", e))?;

    let child = pty_pair.slave.spawn_command(cmd).map_err(|e| format!("spawn: {}", e))?;

    // Background thread: read PTY output into channel
    let (tx, rx): (Sender<String>, Receiver<String>) = channel();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    if tx.send(s).is_err() { break; }
                }
                Err(_e) => { break; }
            }
        }
    });

    *PTY_MASTER.lock().unwrap() = Some(master);
    *OUTPUT_RX.lock().unwrap() = Some(rx);

    // DEBUG: Write to shell after a short delay
    let debug_cwd = cwd.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(800));
        let lock = PTY_MASTER.lock().unwrap();
        if let Some(m) = lock.as_ref() {
            let mut w = m.take_writer().unwrap();
            let _ = w.write_all(b"echo Shell working in $PWD\n");
            let _ = w.flush();
        }
    });

    std::mem::forget(child);
    Ok(())
}

#[tauri::command]
pub async fn pty_write(data: String) -> Result<(), String> {
    // take_writer returns a new writer each time (non-consuming)
    let lock = PTY_MASTER.lock().unwrap();
    if let Some(m) = lock.as_ref() {
        let mut w = m.take_writer().map_err(|e| format!("take_writer: {}", e))?;
        w.write_all(data.as_bytes()).map_err(|e| format!("write: {}", e))?;
        w.flush().ok();
    }
    Ok(())
}

#[tauri::command]
pub async fn pty_read() -> Result<String, String> {
    let lock = OUTPUT_RX.lock().unwrap();
    let mut out = String::new();
    if let Some(rx) = lock.as_ref() {
        while let Ok(chunk) = rx.try_recv() {
            out.push_str(&chunk);
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn pty_kill() -> Result<(), String> {
    pty_kill_internal();
    Ok(())
}

fn pty_kill_internal() {
    *PTY_MASTER.lock().unwrap() = None;
    *OUTPUT_RX.lock().unwrap() = None;
}
