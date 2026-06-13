use std::io::{Read, Write};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Mutex;

struct ShellProcess {
    stdin: Box<dyn Write + Send>,
    child: Child,
}

static SHELL: Mutex<Option<ShellProcess>> = Mutex::new(None);
static OUTPUT_RX: Mutex<Option<Receiver<String>>> = Mutex::new(None);

#[tauri::command]
pub async fn pty_spawn(cwd: String) -> Result<(), String> {
    pty_kill_internal();

    let shell = if cfg!(target_os = "windows") {
        "cmd.exe".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    };

    let mut child = Command::new(&shell)
        .current_dir(&cwd)
        .env("TERM", "xterm-256color")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn shell: {}", e))?;

    let stdin = child.stdin.take().ok_or("no stdin")?;
    let mut stdout = child.stdout.take().ok_or("no stdout")?;
    let mut stderr = child.stderr.take().ok_or("no stderr")?;

    // Background threads: read stdout and stderr
    let (tx, rx): (Sender<String>, Receiver<String>) = channel();
    let tx2 = tx.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match stdout.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    if tx.send(s).is_err() { break; }
                }
                Err(_) => break,
            }
        }
    });
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match stderr.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    if tx2.send(s).is_err() { break; }
                }
                Err(_) => break,
            }
        }
    });

    *SHELL.lock().unwrap() = Some(ShellProcess { stdin: Box::new(stdin), child });
    *OUTPUT_RX.lock().unwrap() = Some(rx);
    Ok(())
}

#[tauri::command]
pub async fn pty_write(data: String) -> Result<(), String> {
    let mut lock = SHELL.lock().unwrap();
    if let Some(s) = lock.as_mut() {
        s.stdin.write_all(data.as_bytes()).map_err(|e| format!("write: {}", e))?;
        s.stdin.flush().ok();
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
    if let Some(mut s) = SHELL.lock().unwrap().take() {
        let _ = s.child.kill();
    }
    *OUTPUT_RX.lock().unwrap() = None;
}
