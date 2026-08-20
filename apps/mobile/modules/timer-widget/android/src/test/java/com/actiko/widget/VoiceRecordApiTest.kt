package com.actiko.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VoiceRecordApiTest {
    @Test
    fun `request fields include speech text and client date`() {
        assertEquals(
            mapOf(
                "speechText" to "30分走った",
                "clientDate" to "2026-07-20",
            ),
            VoiceRecordApi.requestFields("30分走った", "2026-07-20"),
        )
    }

    @Test
    fun `all 2xx responses are successful`() {
        assertTrue(VoiceRecordApi.isSuccessfulStatus(200))
        assertTrue(VoiceRecordApi.isSuccessfulStatus(201))
        assertFalse(VoiceRecordApi.isSuccessfulStatus(400))
    }
}
