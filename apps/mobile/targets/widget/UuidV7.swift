import Foundation

/// UUID v7 generator with millisecond timestamp + random bits.
/// iOS port of Android's UuidV7.kt.
enum UuidV7 {
    static func generate() -> String {
        let now = UInt64(Date().timeIntervalSince1970 * 1000)

        // 48-bit timestamp | 4-bit version(7) | 12-bit random
        var randomBytes = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, 16, &randomBytes)

        // Bytes 0-5: 48-bit timestamp (big endian)
        randomBytes[0] = UInt8((now >> 40) & 0xFF)
        randomBytes[1] = UInt8((now >> 32) & 0xFF)
        randomBytes[2] = UInt8((now >> 24) & 0xFF)
        randomBytes[3] = UInt8((now >> 16) & 0xFF)
        randomBytes[4] = UInt8((now >> 8) & 0xFF)
        randomBytes[5] = UInt8(now & 0xFF)

        // Byte 6: version 7 (0111xxxx)
        randomBytes[6] = (randomBytes[6] & 0x0F) | 0x70

        // Byte 8: variant 10 (10xxxxxx)
        randomBytes[8] = (randomBytes[8] & 0x3F) | 0x80

        let uuid = NSUUID(uuidBytes: randomBytes)
        return uuid.uuidString.lowercased()
    }
}
