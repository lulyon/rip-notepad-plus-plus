use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatusEntry {
    pub path: String,
    pub status: String, // "M" = modified, "A" = staged, "??" = untracked, "D" = deleted, "R" = renamed
    pub display_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub changed: Vec<GitStatusEntry>,
    pub ahead: u32,
    pub behind: u32,
}

fn find_git() -> &'static str {
    // macOS GUI apps have a restricted PATH; try common locations
    for candidate in &["/usr/bin/git", "/usr/local/bin/git", "/opt/homebrew/bin/git", "git"] {
        if std::process::Command::new(candidate)
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return candidate;
        }
    }
    "git" // fallback
}

fn run_git(cwd: &str, args: &[&str]) -> Result<String, String> {
    let git_path = find_git();
    let output = std::process::Command::new(git_path)
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to run git ({}): {}", git_path, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn find_git_root(path: &str) -> Result<String, String> {
    let p = std::path::Path::new(path);
    let dir = if p.is_dir() { p.to_path_buf() } else {
        p.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| std::path::PathBuf::from("."))
    };
    run_git(dir.to_str().unwrap_or("."), &["rev-parse", "--show-toplevel"])
        .map(|s| s.trim().to_string())
}

#[tauri::command]
pub async fn git_status(repo_path: String) -> Result<GitStatus, String> {
    let root = find_git_root(&repo_path)?;

    let branch = run_git(&root, &["rev-parse", "--abbrev-ref", "HEAD"])?
        .trim()
        .to_string();

    // Parse ahead/behind
    let ahead_behind = run_git(
        &root,
        &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
    );
    let (ahead, behind) = match ahead_behind {
        Ok(s) => {
            let parts: Vec<u32> = s
                .trim()
                .split('\t')
                .filter_map(|n| n.parse().ok())
                .collect();
            (parts.first().copied().unwrap_or(0), parts.get(1).copied().unwrap_or(0))
        }
        Err(_) => (0, 0),
    };

    // Get changed files
    let status_output = run_git(&root, &["status", "--porcelain"])?;
    let mut changed: Vec<GitStatusEntry> = Vec::new();
    for line in status_output.lines() {
        if line.len() < 3 {
            continue;
        }
        let status_code = line[..2].trim().to_string();
        let file_path = line[3..].trim().to_string();
        // Skip empty or malformed lines
        if file_path.is_empty() {
            continue;
        }
        changed.push(GitStatusEntry {
            path: format!("{}/{}", root, file_path),
            status: if status_code.is_empty() { "M".to_string() } else { status_code },
            display_path: file_path,
        });
    }

    Ok(GitStatus {
        branch,
        changed,
        ahead,
        behind,
    })
}

#[tauri::command]
pub async fn git_branch(repo_path: String) -> Result<String, String> {
    let root = find_git_root(&repo_path)?;
    run_git(&root, &["rev-parse", "--abbrev-ref", "HEAD"])
        .map(|s| s.trim().to_string())
}

#[tauri::command]
pub async fn git_diff_file(repo_path: String, file_path: String) -> Result<String, String> {
    let root = find_git_root(&repo_path)?;
    run_git(&root, &["diff", "--", &file_path])
}
