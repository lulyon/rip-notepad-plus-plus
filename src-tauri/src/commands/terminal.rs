use std::io::Read;
use std::process::Command;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Mutex;
use std::os::fd::{FromRawFd, IntoRawFd};

struct PtyHandle {
    fd: i32,
    #[allow(dead_code)]
    child: std::process::Child,
}

static PTY: Mutex<Option<PtyHandle>> = Mutex::new(None);
static OUTPUT_RX: Mutex<Option<Receiver<String>>> = Mutex::new(None);

#[tauri::command]
pub async fn pty_spawn(cwd: String) -> Result<(), String> {
    pty_kill_internal();

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

    #[cfg(target_os = "macos")]
    return pty_spawn_native(&shell, &cwd);

    #[cfg(not(target_os = "macos"))]
    return pty_spawn_piped(&shell, &cwd);
}

#[cfg(target_os = "macos")]
fn pty_spawn_native(shell: &str, cwd: &str) -> Result<(), String> {
    unsafe {
        use std::ffi::CString;
        let mut master_fd: libc::c_int = 0;
        let pid = libc::forkpty(
            &mut master_fd,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        );

        if pid == -1 {
            return Err("forkpty failed".into());
        }

        if pid == 0 {
            // Child
            let cwd_c = CString::new(cwd).unwrap();
            libc::chdir(cwd_c.as_ptr());
            let shell_c = CString::new(shell).unwrap();
            let argv: [*const libc::c_char; 2] = [shell_c.as_ptr(), std::ptr::null()];
            libc::execvp(shell_c.as_ptr(), argv.as_ptr());
            libc::_exit(1);
        }

        // Parent: spawn reader thread
        let read_fd = libc::dup(master_fd);
        let (tx, rx): (Sender<String>, Receiver<String>) = channel();
        let master_fd_copy = master_fd;

        std::thread::spawn(move || {
            let mut f = std::fs::File::from_raw_fd(read_fd);
            let mut buf = [0u8; 8192];
            loop {
                match f.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        if tx.send(String::from_utf8_lossy(&buf[..n]).to_string()).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
            // Don't drop f — the fd is still needed elsewhere
            let _ = f.into_raw_fd();
        });

        let child = Command::new("true").spawn().unwrap();
        *PTY.lock().unwrap() = Some(PtyHandle {
            fd: master_fd_copy,
            child,
        });
        *OUTPUT_RX.lock().unwrap() = Some(rx);
        Ok(())
    }
}

#[cfg(not(target_os = "macos"))]
fn pty_spawn_piped(shell: &str, cwd: &str) -> Result<(), String> {
    let mut child = Command::new(shell)
        .current_dir(cwd)
        .env("TERM", "xterm-256color")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn: {}", e))?;

    let stdin = child.stdin.take().ok_or("no stdin")?;
    let mut stdout = child.stdout.take().ok_or("no stdout")?;

    let (tx, rx): (Sender<String>, Receiver<String>) = channel();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match stdout.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if tx.send(String::from_utf8_lossy(&buf[..n]).to_string()).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    let stdin_fd: i32 = stdin.into_raw_fd();
    *PTY.lock().unwrap() = Some(PtyHandle {
        fd: stdin_fd,
        child: Command::new("true").spawn().unwrap(),
    });
    *OUTPUT_RX.lock().unwrap() = Some(rx);
    Ok(())
}

#[tauri::command]
pub async fn pty_write(data: String) -> Result<(), String> {
    let lock = PTY.lock().unwrap();
    if let Some(h) = lock.as_ref() {
        #[cfg(unix)]
        unsafe {
            let len = data.len();
            let written = libc::write(h.fd, data.as_ptr() as *const libc::c_void, len);
            if written < 0 {
                return Err(format!("write err: {}", std::io::Error::last_os_error()));
            }
        }
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
    *PTY.lock().unwrap() = None;
    *OUTPUT_RX.lock().unwrap() = None;
}
