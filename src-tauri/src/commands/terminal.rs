use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use std::io::{Read, Write};
use std::sync::Mutex;

struct PtyHandle {
    writer: Box<dyn Write + Send>,
    reader: Box<dyn Read + Send>,
    #[allow(dead_code)]
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

static PTY_STATE: Mutex<Option<PtyHandle>> = Mutex::new(None);

#[tauri::command]
pub async fn pty_spawn(cwd: String) -> Result<(), String> {
    let mut state = PTY_STATE.lock().unwrap();
    *state = None;

    let pty_system = native_pty_system();
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
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

    let reader = pty_pair.master.try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;
    let writer = pty_pair.master.take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    let child = pty_pair.slave.spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn: {}", e))?;

    *state = Some(PtyHandle { writer, reader, child });
    Ok(())
}

#[tauri::command]
pub async fn pty_write(data: String) -> Result<(), String> {
    let mut lock = PTY_STATE.lock().unwrap();
    if let Some(h) = lock.as_mut() {
        let _ = h.writer.write(data.as_bytes())
            .map_err(|e| format!("write err: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn pty_read() -> Result<String, String> {
    let mut lock = PTY_STATE.lock().unwrap();
    if let Some(h) = lock.as_mut() {
        let mut buf = [0u8; 8192];
        match h.reader.read(&mut buf) {
            Ok(0) => return Ok(String::new()),
            Ok(n) => return Ok(String::from_utf8_lossy(&buf[..n]).to_string()),
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => return Ok(String::new()),
            Err(e) => return Err(format!("read err: {}", e)),
        }
    }
    Ok(String::new())
}

#[tauri::command]
pub async fn pty_kill() -> Result<(), String> {
    let mut state = PTY_STATE.lock().unwrap();
    *state = None;
    Ok(())
}
