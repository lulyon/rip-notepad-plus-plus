use walkdir::WalkDir;

use crate::models::SearchMatch;

/// Recursively search for text/regex in files under a directory.
pub fn find_in_files(
    root_dir: &str,
    query: &str,
    is_regex: bool,
    case_sensitive: bool,
    whole_word: bool,
    file_pattern: Option<&str>,
    max_results: Option<u32>,
) -> Result<Vec<SearchMatch>, String> {
    let max = max_results.unwrap_or(200) as usize;

    // Build the search pattern
    let pattern = if is_regex {
        query.to_string()
    } else {
        regex::escape(query)
    };

    // Build the whole-word pattern
    let full_pattern = if whole_word {
        format!(r"\b{}\b", pattern)
    } else {
        pattern
    };

    let re = RegexBuilder::new(&full_pattern)
        .case_insensitive(!case_sensitive)
        .size_limit(10 * 1024 * 1024) // 10MB regex size limit
        .build()
        .map_err(|e| format!("Invalid regex: {}", e))?;

    // Parse file extensions filter
    let extensions: Option<Vec<&str>> = file_pattern.map(|p| {
        p.split(',')
            .map(|s| s.trim().trim_start_matches("*."))
            .collect()
    });

    let mut results: Vec<SearchMatch> = Vec::new();
    let walker = WalkDir::new(root_dir)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file());

    for entry in walker {
        if results.len() >= max {
            break;
        }

        let path = entry.path();

        // Filter by file extension
        if let Some(ref exts) = extensions {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if !exts.contains(&ext) {
                    continue;
                }
            } else {
                // File with no extension doesn't match a pattern like "*.rs"
                continue;
            }
        }

        // Skip binary files (check for null bytes in first 8KB)
        if let Ok(data) = std::fs::read(path) {
            if data.iter().take(8192).any(|&b| b == 0) {
                continue;
            }
        } else {
            continue;
        }

        // Read file content
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // Search each line
        for (line_idx, line) in content.lines().enumerate() {
            if results.len() >= max {
                break;
            }

            for m in re.find_iter(line) {
                if results.len() >= max {
                    break;
                }
                results.push(SearchMatch {
                    path: path.to_string_lossy().to_string(),
                    line_number: (line_idx + 1) as u32,
                    line_content: line.to_string(),
                    match_start: m.start() as u32,
                    match_length: m.len() as u32,
                });
            }
        }
    }

    Ok(results)
}

use regex::RegexBuilder;
