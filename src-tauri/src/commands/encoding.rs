use crate::encoding;
use crate::models::{ConvertEncodingRequest, EncodingInfo};

#[tauri::command]
pub async fn detect_encoding(data: Vec<u8>) -> String {
    let (encoding, _) = encoding::detect::detect_encoding(&data);
    encoding
}

#[tauri::command]
pub async fn convert_encoding_command(req: ConvertEncodingRequest) -> Result<Vec<u8>, String> {
    encoding::convert::convert_encoding(&req.content, &req.from_encoding, &req.to_encoding)
}

#[tauri::command]
pub async fn list_encodings() -> Vec<EncodingInfo> {
    encoding::convert::list_encodings()
}

#[tauri::command]
pub async fn decode_with_encoding(data: Vec<u8>, encoding_name: String) -> Result<String, String> {
    encoding::convert::decode_bytes(&data, &encoding_name)
}

#[tauri::command]
pub async fn encode_with_encoding(content: String, encoding_name: String) -> Result<Vec<u8>, String> {
    encoding::convert::encode_string(&content, &encoding_name)
}
