package com.actiko.widget

import java.security.SecureRandom
import java.util.UUID

object UuidV7 {
    private val random = SecureRandom()

    fun generate(): String {
        val now = System.currentTimeMillis()
        // 48-bit timestamp | 4-bit version(7) | 12-bit random
        val msb = (now shl 16) or (0x7000L) or (random.nextLong() and 0x0FFFL)
        // 2-bit variant(10) | 62-bit random
        val lsb = (2L shl 62) or (random.nextLong() and 0x3FFFFFFFFFFFFFFFL)
        return UUID(msb, lsb).toString()
    }
}
