import unittest
from sound_manager.reliability import DeviceReturnTracker, RetryBudget

class ReliabilityTests(unittest.TestCase):
    def test_polling_does_not_retry_an_existing_failed_device(self):
        policy = DeviceReturnTracker()
        policy.observe(['bluetooth'], now=0)
        policy.note_attempt('bluetooth', now=0)
        for t in range(2, 100, 2):
            self.assertEqual(policy.observe(['bluetooth'], now=t), [])

    def test_reconnect_must_settle_and_obey_cooldown(self):
        policy = DeviceReturnTracker()
        policy.observe(['a'], now=0)
        policy.note_attempt('a', now=0)
        policy.observe([], now=2)
        policy.observe(['a'], now=4)
        self.assertFalse(policy.observe(['a'], now=8))
        self.assertFalse(policy.observe(['a'], now=10))
        self.assertEqual(policy.observe(['a'], now=30), ['a'])
        self.assertFalse(policy.observe(['a'], now=32))

    def test_flapping_resets_the_stability_period(self):
        policy = DeviceReturnTracker(cooldown=0)
        policy.observe(['a'], now=0)
        policy.observe([], now=2)
        policy.observe(['a'], now=4)
        policy.observe([], now=8)
        policy.observe(['a'], now=10)
        self.assertFalse(policy.observe(['a'], now=14))
        self.assertEqual(policy.observe(['a'], now=16), ['a'])

    def test_saved_missing_device_waits_before_first_open(self):
        policy = DeviceReturnTracker()
        policy.expect_missing('saved', now=0)
        policy.observe(['saved'], now=10)
        self.assertTrue(policy.settling('saved'))
        self.assertEqual(policy.observe(['saved'], now=16), ['saved'])
        self.assertFalse(policy.settling('saved'))

    def test_reconnect_attempts_are_bounded_in_time_window(self):
        policy = DeviceReturnTracker(settle=1, cooldown=1, max_attempts=2, window=100)
        policy.observe(['a'], now=0)
        for t in (2, 6):
            policy.observe([], now=t)
            policy.observe(['a'], now=t+1)
            self.assertEqual(policy.observe(['a'], now=t+2), ['a'])
        policy.observe([], now=10)
        policy.observe(['a'], now=11)
        self.assertEqual(policy.observe(['a'], now=12), [])
        self.assertEqual(policy.observe(['a'], now=112), ['a'])

    def test_bounded_restart_schedule_and_manual_cancel(self):
        budget = RetryBudget()
        self.assertTrue(budget.failed(now=0))
        self.assertFalse(budget.due(now=4))
        self.assertTrue(budget.due(now=5))
        self.assertTrue(budget.failed(now=5))
        self.assertEqual(budget.next_time, 20)
        self.assertTrue(budget.failed(now=20))
        self.assertFalse(budget.failed(now=50))
        self.assertFalse(budget.due(now=100))
        budget.reset()
        self.assertFalse(budget.due(now=100))
