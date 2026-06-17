use portable_pty::{CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::{mpsc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    tx: Option<mpsc::Sender<Vec<u8>>>,
    master: Option<Box<dyn MasterPty + Send>>,
    child: Option<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
}

impl PtySession {
    /// Spawn a shell in a new PTY.
    pub fn spawn(
        id: String,
        shell: String,
        cwd: String,
        cols: u16,
        rows: u16,
        app: AppHandle,
    ) -> Result<Self, String> {
        let pty_size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let cmd = if cfg!(target_os = "windows") {
            let mut c = CommandBuilder::new("powershell.exe");
            c.cwd(&cwd);
            c
        } else {
            let mut c = CommandBuilder::new(&shell);
            c.cwd(&cwd);
            c.env("TERM", "xterm-256color");
            c.arg("-l");
            c
        };

        let pty_sys = portable_pty::native_pty_system();
        let pair = pty_sys
            .openpty(pty_size)
            .map_err(|e| format!("openpty failed: {}", e))?;

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("spawn_command failed: {}", e))?;

        drop(pair.slave);

        // Split master: keep for resize, clone reader, take writer
        let master = pair.master;
        let reader = master
            .try_clone_reader()
            .map_err(|e| format!("try_clone_reader: {}", e))?;
        let mut writer: Box<dyn Write + Send> = master
            .take_writer()
            .map_err(|e| format!("take_writer: {}", e))?;

        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        let sid = id.clone();

        // Thread 1: read PTY output → emit events
        std::thread::spawn(move || {
            let mut reader = reader;
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let _ = app.emit(
                            "pty://data",
                            serde_json::json!({ "id": sid, "data": &buf[..n] }),
                        );
                    }
                    Err(e) => {
                        let _ = app.emit(
                            "pty://data",
                            serde_json::json!({ "id": sid, "error": format!("{}", e) }),
                        );
                        break;
                    }
                }
            }
            let _ = app.emit(
                "pty://data",
                serde_json::json!({ "id": sid, "type": "exit" }),
            );
        });

        // Thread 2: read channel → write PTY
        std::thread::spawn(move || {
            while let Ok(data) = rx.recv() {
                if writer.write_all(&data).is_err() {
                    break;
                }
                let _ = writer.flush();
            }
        });

        // Thread 3: reap child on natural exit
        // (child handle stored in session for explicit kill)
        Ok(Self {
            tx: Some(tx),
            master: Some(master),
            child: Some(Mutex::new(child)),
        })
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        self.tx
            .as_ref()
            .ok_or("PTY closed")?
            .send(data.to_vec())
            .map_err(|e| format!("send error: {}", e))
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        if let Some(ref master) = self.master {
            master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
                .map_err(|e| format!("pty resize failed: {}", e))?;
        }
        Ok(())
    }

    pub fn kill(&self) {
        if let Some(ref child) = self.child {
            if let Ok(mut c) = child.lock() {
                let _ = c.kill();
                let _ = c.wait();
            }
        }
    }
}
