use encoding_rs::*;

/// Decode bytes into a Rust String using the specified encoding name.
pub fn decode_bytes(data: &[u8], encoding_name: &str) -> Result<String, String> {
    let encoding = Encoding::for_label(encoding_name.as_bytes())
        .ok_or_else(|| format!("Unknown encoding: {}", encoding_name))?;

    let (cow, _, had_errors) = encoding.decode(data);
    if had_errors {
        // Still return the content; non-decodable bytes are replaced with U+FFFD
        log::warn!("Encoding errors detected when decoding as {}", encoding_name);
    }
    Ok(cow.into_owned())
}

/// Encode a string into bytes using the specified encoding name.
pub fn encode_string(content: &str, encoding_name: &str) -> Result<Vec<u8>, String> {
    let encoding = Encoding::for_label(encoding_name.as_bytes())
        .ok_or_else(|| format!("Unknown encoding: {}", encoding_name))?;

    let (cow, _encoding_used, had_errors) = encoding.encode(content);
    if had_errors {
        log::warn!("Encoding errors detected when encoding as {}", encoding_name);
    }
    Ok(cow.into_owned())
}

/// Convert bytes from one encoding to another.
pub fn convert_encoding(data: &[u8], from_enc: &str, to_enc: &str) -> Result<Vec<u8>, String> {
    // Decode from source encoding to string
    let decoded = decode_bytes(data, from_enc)?;

    // Encode to target encoding
    encode_string(&decoded, to_enc)
}

/// Get a list of all supported encodings grouped by category.
/// encoding_rs supports many encodings; we list the most important ones here.
pub fn list_encodings() -> Vec<crate::models::EncodingInfo> {
    let names = ENCODING_NAMES;
    names
        .iter()
        .filter_map(|&name| {
            Encoding::for_label(name.as_bytes()).map(|enc| {
                crate::models::EncodingInfo {
                    name: enc.name().to_string(),
                    label: format_encoding_label(enc),
                    group: encoding_group(enc),
                    has_bom: supports_bom(enc),
                }
            })
        })
        .collect()
}

/// All common encoding names supported by encoding_rs.
const ENCODING_NAMES: &[&str] = &[
    // Unicode
    "UTF-8",
    "UTF-16LE",
    "UTF-16BE",
    // East Asian
    "GBK",
    "gb18030",
    "Big5",
    "Shift_JIS",
    "EUC-JP",
    "ISO-2022-JP",
    "EUC-KR",
    // Cyrillic
    "windows-1251",
    "KOI8-R",
    "KOI8-U",
    "IBM866",
    "x-mac-cyrillic",
    // Western European + other single-byte
    "windows-1252",
    "windows-1250",
    "windows-1253",
    "windows-1254",
    "windows-1255",
    "windows-1256",
    "windows-1257",
    "windows-1258",
    "windows-874",
    "macintosh",
    "x-mac-roman",
    // ISO 8859
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-3",
    "ISO-8859-4",
    "ISO-8859-5",
    "ISO-8859-6",
    "ISO-8859-7",
    "ISO-8859-8",
    "ISO-8859-9",
    "ISO-8859-10",
    "ISO-8859-11",
    "ISO-8859-13",
    "ISO-8859-14",
    "ISO-8859-15",
    "ISO-8859-16",
    // Other
    "US-ASCII",
    "x-user-defined",
];

fn format_encoding_label(enc: &'static Encoding) -> String {
    let name = enc.name();
    match name {
        "UTF-8" => "Unicode (UTF-8)".into(),
        "UTF-16LE" => "Unicode (UTF-16 LE)".into(),
        "UTF-16BE" => "Unicode (UTF-16 BE)".into(),
        "GBK" => "Chinese Simplified (GBK)".into(),
        "Big5" => "Chinese Traditional (Big5)".into(),
        "Shift_JIS" => "Japanese (Shift-JIS)".into(),
        "EUC-JP" => "Japanese (EUC-JP)".into(),
        "EUC-KR" => "Korean (EUC-KR)".into(),
        "windows-1251" => "Cyrillic (Windows-1251)".into(),
        "windows-1252" => "Western European (Windows-1252)".into(),
        "windows-1256" => "Arabic (Windows-1256)".into(),
        _ => format!("{} ({})", name, name),
    }
}

fn encoding_group(enc: &'static Encoding) -> String {
    let name = enc.name();
    if name.starts_with("UTF-") || name.starts_with("ISO-10646") {
        "Unicode".into()
    } else if ["GBK", "Big5", "EUC-KR", "Shift_JIS", "EUC-JP", "ISO-2022-JP", "gb18030"]
        .contains(&name)
    {
        "East Asian".into()
    } else if name == "windows-1251"
        || name == "KOI8-R"
        || name == "KOI8-U"
        || name == "IBM866"
        || name == "x-mac-cyrillic"
    {
        "Cyrillic".into()
    } else if name.starts_with("windows-125")
        || name == "x-mac-roman"
        || name == "macintosh"
        || name == "windows-874"
    {
        "Western European".into()
    } else if name.starts_with("ISO-8859") {
        "ISO 8859".into()
    } else {
        "Other".into()
    }
}

fn supports_bom(enc: &'static Encoding) -> bool {
    let name = enc.name();
    ["UTF-8", "UTF-16LE", "UTF-16BE", "UTF-32LE", "UTF-32BE"].contains(&name)
}
