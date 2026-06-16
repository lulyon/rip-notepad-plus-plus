use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

use crate::pty::session::PtySession;

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(
        &self,
        id: String,
        shell: String,
        cwd: String,
        cols: u16,
        rows: u16,
        app: AppHandle,
    ) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        if sessions.contains_key(&id) {
            return Err(format!("PTY session {} already exists", id));
        }
        let session = PtySession::spawn(id.clone(), shell, cwd, cols, rows, app)?;
        sessions.insert(id, session);
        Ok(())
    }

    pub fn write(&self, id: &str, data: &[u8]) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        sessions
            .get(id)
            .ok_or_else(|| format!("PTY session {} not found", id))?
            .write(data)
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        sessions
            .get(id)
            .ok_or_else(|| format!("PTY session {} not found", id))?
            .resize(cols, rows)
    }

    pub fn kill(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.remove(id) {
            session.kill();
            Ok(())
        } else {
            Err(format!("PTY session {} not found", id))
        }
    }
}
