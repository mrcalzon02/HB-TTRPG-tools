import struct
import unittest
import numpy as np
from sound_manager.channels import LAYOUTS, convert
from sound_manager.windows_format import packed_format
from sound_manager.dsp import Equalizer

class ChannelTests(unittest.TestCase):
    def test_identity_preserves_every_surround_channel(self):
        for roles in LAYOUTS.values():
            data = np.eye(len(roles), dtype=np.float32)
            np.testing.assert_array_equal(convert(data, roles, roles), data)

    def test_center_and_surround_are_audible_in_stereo_downmix(self):
        source = LAYOUTS['5.1']
        data = np.eye(6, dtype=np.float32)
        output = convert(data, source, LAYOUTS['Stereo'])
        self.assertGreater(output[2, 0], 0)
        self.assertEqual(output[2, 0], output[2, 1])
        self.assertGreater(output[4, 0], 0)
        self.assertEqual(output[4, 1], 0)
        np.testing.assert_array_equal(output[3], 0)  # Never dump LFE into headphones.
        self.assertLessEqual(abs(convert(np.ones((100, 6)), source, LAYOUTS['Stereo'])).max(), 1.00001)

    def test_stereo_does_not_generate_fake_rear_or_height_channels(self):
        data = np.array([[.1, .2]], dtype=np.float32)
        output = convert(data, LAYOUTS['Stereo'], LAYOUTS['7.1.4'])
        np.testing.assert_array_equal(output[:, :2], data)
        np.testing.assert_array_equal(output[:, 2:], 0)

    def test_mono_has_correct_front_delivery_without_lfe(self):
        data = np.ones((20, 1), dtype=np.float32)*.1
        stereo = convert(data, LAYOUTS['Mono'], LAYOUTS['Stereo'])
        np.testing.assert_array_equal(stereo[:, 0], stereo[:, 1])
        surround = convert(data, LAYOUTS['Mono'], LAYOUTS['5.1'])
        np.testing.assert_array_equal(surround[:, 2], data[:, 0])
        np.testing.assert_array_equal(surround[:, 3:], 0)

    def test_side_rear_alias_does_not_duplicate_surround(self):
        source = ('FL', 'FR', 'FC', 'LFE', 'SL', 'SR')
        output = convert(np.eye(6, dtype=np.float32), source, LAYOUTS['5.1'])
        self.assertEqual(output[4, 4], 1)
        seven = convert(np.eye(6, dtype=np.float32), LAYOUTS['5.1'], LAYOUTS['7.1'])
        np.testing.assert_array_equal(seven[:, 6:], 0)

    def test_packed_windows_format_has_correct_offsets_mask_and_size(self):
        for roles in LAYOUTS.values():
            raw = packed_format(roles)
            self.assertEqual(len(raw), 40)
            self.assertEqual(struct.unpack_from('<H', raw, 2)[0], len(roles))
            self.assertEqual(struct.unpack_from('<H', raw, 18)[0], 32)
            self.assertEqual(struct.unpack_from('<I', raw, 20)[0].bit_count(), len(roles))
            self.assertEqual(struct.unpack_from('<I', raw, 24)[0], 3)

    def test_eq_and_delay_processing_handle_twelve_channels(self):
        eq = Equalizer(channels=12)
        data = np.ones((960, 12))*.01
        result = eq.process(data, [0]*10)
        self.assertEqual(result.shape, data.shape)
        np.testing.assert_allclose(result[240:], data[240:], atol=1e-6)

    def test_height_channels_survive_surround_downmix(self):
        result = convert(np.eye(12, dtype=np.float32), LAYOUTS['7.1.4'], LAYOUTS['5.1'])
        self.assertGreater(result[8, 0], 0)
        self.assertGreater(result[9, 1], 0)
        self.assertGreater(result[10, 4], 0)
        self.assertGreater(result[11, 5], 0)
