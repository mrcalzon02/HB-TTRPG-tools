import hashlib
import io
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
import zipfile
from sound_manager import updates

def release(version, platform='win32', **extra):
    tag = updates.TAG_PREFIX+version
    name = f'SimpleSoundManager-{version}-'+('Windows-x64.zip' if platform == 'win32' else 'Source.zip')
    result = dict(tag_name=tag, draft=False, prerelease=False, body='New controls', assets=[dict(name=name, state='uploaded', size=10, digest='sha256:'+'a'*64, browser_download_url=f'https://github.com/{updates.REPOSITORY}/releases/download/{tag}/{name}')])
    result.update(extra)
    return result

def package_bytes(version='0.6.1', extra=None):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as z:
        for name in ('install-windows.ps1', 'dist/SimpleSoundManager/SimpleSoundManager.exe', 'dist/launcher/SimpleSoundManagerLauncher.exe'):
            z.writestr('SimpleSoundManager/'+name, 'fixture')
        z.writestr('SimpleSoundManager/dist/SimpleSoundManager/version.txt', version)
        if extra:
            z.writestr(extra, 'escape')
    return output.getvalue()

class UpdateTests(unittest.TestCase):
    def test_numeric_order_filters_other_tools_previews_and_drafts(self):
        feed = [release('0.9.0'), release('0.10.0'), release('99.0.0', prerelease=True), release('90.0.0', draft=True), release('0.12.0', tag_name='barotrauma-v0.12.0')]
        self.assertEqual(updates.select_release(feed, '0.6.1').version, '0.10.0')
        self.assertIsNone(updates.select_release(feed, '0.10.0'))

    def test_linux_chooses_source_and_asset_must_belong_to_repository(self):
        self.assertTrue(updates.select_release([release('0.6.1', 'linux')], '0.6.0', 'linux').name.endswith('Source.zip'))
        fixture = release('0.6.1')
        fixture['assets'][0]['browser_download_url'] = 'https://elsewhere.example/app.zip'
        with self.assertRaisesRegex(ValueError, 'outside'):
            updates.select_release([fixture], '0.6.0')

    def test_missing_or_unverified_new_download_is_reported(self):
        with self.assertRaisesRegex(ValueError, 'not ready'):
            updates.select_release([release('0.6.1', assets=[])], '0.6.0')
        fixture = release('0.6.1')
        fixture['assets'][0].pop('digest')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            updates.select_release([fixture], '0.6.0')

    def test_feed_pagination_searches_past_unrelated_releases(self):
        first = [dict(tag_name='another-tool')]*100
        import json
        with patch.object(updates, 'read_bounded', side_effect=[json.dumps(first).encode(), json.dumps([release('0.6.1')]).encode()]) as read:
            self.assertEqual(updates.check('0.6.0').version, '0.6.1')
            self.assertIn('page=2', read.call_args[0][0])

    def test_traversal_duplicates_and_symlinks_rejected_before_extract(self):
        for name in ('SimpleSoundManager/../../outside', '/SimpleSoundManager/absolute', 'SimpleSoundManager/C:escape', 'SimpleSoundManager/..\\outside', 'SimpleSoundManager/install-windows.ps1'):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as folder:
                with self.assertRaises(ValueError):
                    updates.extract_package(io.BytesIO(package_bytes(extra=name)), Path(folder)/'unpacked', 'win32')
                self.assertFalse((Path(folder)/'unpacked').exists())
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as z:
            item = zipfile.ZipInfo('SimpleSoundManager/link')
            item.external_attr = 0o120777 << 16
            z.writestr(item, '../../outside')
        with tempfile.TemporaryDirectory() as folder, self.assertRaises(ValueError):
            updates.extract_package(io.BytesIO(buffer.getvalue()), folder, 'win32')

    def test_download_verified_before_staging_and_never_executes_installer(self):
        content = package_bytes()
        fixture = release('0.6.1')
        fixture['assets'][0].update(size=len(content), digest='sha256:'+hashlib.sha256(content).hexdigest())
        chosen = updates.select_release([fixture], '0.6.0')
        with tempfile.TemporaryDirectory() as folder, patch.object(updates, 'open_url', return_value=io.BytesIO(content)), patch.object(updates.subprocess, 'Popen') as execute:
            staged = updates.download(chosen, folder, platform='win32')
            self.assertTrue((staged/'install-windows.ps1').exists())
            execute.assert_not_called()
        fixture['assets'][0]['digest'] = 'sha256:'+'0'*64
        chosen = updates.select_release([fixture], '0.6.0')
        with tempfile.TemporaryDirectory() as folder, patch.object(updates, 'open_url', return_value=io.BytesIO(content)), self.assertRaisesRegex(ValueError, 'verification failed'):
            updates.download(chosen, folder, platform='win32')
            self.assertFalse(any(Path(folder).rglob('install-windows.ps1')))

    def test_cancel_never_extracts_or_executes(self):
        chosen = updates.select_release([release('0.6.1')], '0.6.0')
        with tempfile.TemporaryDirectory() as folder, patch.object(updates, 'open_url', return_value=io.BytesIO(b'fixture')), patch.object(updates, 'extract_package') as extract:
            with self.assertRaises(InterruptedError):
                updates.download(chosen, folder, cancelled=lambda: True)
            extract.assert_not_called()

    def test_checksum_file_fallback_matches_exact_asset_name(self):
        fixture = release('0.6.1')
        fixture['assets'][0].pop('digest')
        fixture['assets'].append(dict(name='SHA256SUMS.txt', state='uploaded', browser_download_url=f'https://github.com/{updates.REPOSITORY}/releases/download/{updates.TAG_PREFIX}0.6.1/SHA256SUMS.txt'))
        chosen = updates.select_release([fixture], '0.6.0')
        with patch.object(updates, 'read_bounded', return_value=('a'*64+'  '+chosen.name+'\n').encode()):
            self.assertEqual(updates.checksum_for(chosen), 'a'*64)
        with patch.object(updates, 'read_bounded', return_value=('a'*64+'  wrong.zip\n').encode()), self.assertRaises(ValueError):
            updates.checksum_for(chosen)
