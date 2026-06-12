export interface FileReadResult {
  content: string;
  encoding: string;
  detected_by_bom: boolean;
}

export interface EncodingInfo {
  name: string;
  label: string;
  group: string;
  has_bom: boolean;
}

export interface SearchMatch {
  path: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_length: number;
}

export interface FindInFilesParams {
  root_dir: string;
  query: string;
  is_regex: boolean;
  case_sensitive: boolean;
  whole_word: boolean;
  file_pattern?: string;
  max_results?: number;
}

export interface SessionData {
  open_tabs: SessionTab[];
  active_tab_id: string | null;
}

export interface SessionTab {
  path: string;
  encoding: string;
  language: string;
}

export interface MacroAction {
  action_type: string;
  payload: Record<string, unknown>;
}

export interface MacroEntry {
  name: string;
  actions: MacroAction[];
  created_at: string;
}

export interface SystemInfo {
  platform: string;
  locale: string;
}

export interface ConvertEncodingRequest {
  content: number[];
  from_encoding: string;
  to_encoding: string;
}

export interface CommandResult {
  exit_code: number;
  stdout: string;
  stderr: string;
}

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension: string | null;
}
