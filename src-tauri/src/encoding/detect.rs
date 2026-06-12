/// Detect the encoding of a byte buffer.
/// Returns (encoding_name, detected_by_bom).
pub fn detect_encoding(data: &[u8]) -> (String, bool) {
    // Check BOM first
    if let Some((encoding, _)) = encoding_rs::Encoding::for_bom(data) {
        return (encoding.name().to_string(), true);
    }

    // Use chardetng for statistical detection
    let mut detector = chardetng::EncodingDetector::new();
    detector.feed(data, true);
    let (encoding, _confident) = detector.guess_assess(None, true);
    (encoding.name().to_string(), false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_utf8() {
        let data = "Hello, world!".as_bytes();
        let (enc, _) = detect_encoding(data);
        assert_eq!(enc, "UTF-8");
    }

    #[test]
    fn test_detect_utf8_bom() {
        let data = b"\xEF\xBB\xBFHello";
        let (enc, bom) = detect_encoding(data);
        assert_eq!(enc, "UTF-8");
        assert!(bom);
    }

    #[test]
    fn test_detect_utf16le_bom() {
        let data = b"\xFF\xFEH\x00e\x00l\x00l\x00o\x00";
        let (enc, bom) = detect_encoding(data);
        assert_eq!(enc, "UTF-16LE");
        assert!(bom);
    }
}
