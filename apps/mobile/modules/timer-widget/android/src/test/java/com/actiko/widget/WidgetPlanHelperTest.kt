package com.actiko.widget

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetPlanHelperTest {
    @Test
    fun timerConfigAllowsFirstFreeWidget() = assertFirstWidgetAllowed()

    @Test
    fun counterConfigAllowsFirstFreeWidget() = assertFirstWidgetAllowed()

    @Test
    fun checkConfigAllowsFirstFreeWidget() = assertFirstWidgetAllowed()

    @Test
    fun binaryConfigAllowsFirstFreeWidget() = assertFirstWidgetAllowed()

    @Test
    fun freePlanRejectsSecondUnconfiguredWidget() {
        assertFalse(WidgetPlanHelper.canConfigureWidget(false, setOf(10), 20))
    }

    @Test
    fun proToFreeKeepsOnlyLowestConfiguredWidgetId() {
        assertTrue(WidgetPlanHelper.isWidgetAllowed(false, setOf(30, 10, 20), 10))
        assertFalse(WidgetPlanHelper.isWidgetAllowed(false, setOf(30, 10, 20), 20))
        assertFalse(WidgetPlanHelper.isWidgetAllowed(false, setOf(30, 10, 20), 30))
    }

    private fun assertFirstWidgetAllowed() {
        assertTrue(WidgetPlanHelper.canConfigureWidget(false, emptySet(), 10))
    }
}
