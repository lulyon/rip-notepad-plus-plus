use crate::models::{FindInFilesParams, SearchMatch};
use crate::search::finder;

#[tauri::command]
pub async fn find_in_files(params: FindInFilesParams) -> Result<Vec<SearchMatch>, String> {
    finder::find_in_files(
        &params.root_dir,
        &params.query,
        params.is_regex,
        params.case_sensitive,
        params.whole_word,
        params.file_pattern.as_deref(),
        params.max_results,
    )
}
