"""Product-scoped GitHub Releases checks and verified, bounded ZIP staging."""
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile

REPOSITORY = 'mrcalzon02/HB-TTRPG-tools'
API = f'https://api.github.com/repos/{REPOSITORY}/releases'
TAG_PREFIX = 'simple-sound-manager-v'
MAX_DOWNLOAD = 512 * 1024 * 1024
MAX_EXPANDED = 1024 * 1024 * 1024

def version_tuple(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{1,6}\.\d{1,6}\.\d{1,6}', value):
        raise ValueError('Invalid sound manager version')
    return tuple(map(int, value.split('.')))

@dataclass(frozen=True)
class Release:
    version: str
    notes: str
    page: str
    url: str
    name: str
    size: int
    digest: str
    checksums_url: str

def asset_url(url, tag, name):
    expected = f'https://github.com/{REPOSITORY}/releases/download/{tag}/{name}'
    if url != expected:
        raise ValueError('Release download is outside the sound manager repository')
    return url

def select_release(releases, current, platform=None):
    """Ignore unrelated tools, drafts and previews; order versions numerically."""
    current_version = version_tuple(current)
    if not isinstance(releases, list):
        raise ValueError('Invalid release feed')
    candidates = []
    for release in releases:
        if not isinstance(release, dict) or release.get('draft') or release.get('prerelease'):
            continue
        tag = release.get('tag_name', '')
        if not isinstance(tag, str) or not tag.startswith(TAG_PREFIX):
            continue
        try:
            version = version_tuple(tag[len(TAG_PREFIX):])
        except ValueError:
            continue
        if version > current_version:
            candidates.append((version, release))
    if not candidates:
        return None
    _, release = max(candidates, key=lambda item: item[0])
    tag = release['tag_name']
    version = tag[len(TAG_PREFIX):]
    suffix = 'Windows-x64.zip' if (platform or sys.platform) == 'win32' else 'Source.zip'
    name = f'SimpleSoundManager-{version}-{suffix}'
    assets = release.get('assets', [])
    asset = next((a for a in assets if a.get('name') == name and a.get('state') == 'uploaded'), None)
    if not asset:
        raise ValueError(f'Sound Manager {version} is published but its download is not ready. Try again later.')
    size = asset.get('size')
    if type(size) is not int or not 0 < size <= MAX_DOWNLOAD:
        raise ValueError('Invalid update package size')
    digest = asset.get('digest') or ''
    if digest and not re.fullmatch(r'sha256:[0-9a-fA-F]{64}', digest):
        raise ValueError('Invalid published update checksum')
    checksums = next((a for a in assets if a.get('name') == 'SHA256SUMS.txt' and a.get('state') == 'uploaded'), None)
    checksums_url = asset_url(checksums['browser_download_url'], tag, 'SHA256SUMS.txt') if checksums else ''
    if not digest and not checksums_url:
        raise ValueError('This release has no verification checksum; update was not offered.')
    return Release(version, str(release.get('body') or '')[:16000],
                   f'https://github.com/{REPOSITORY}/releases/tag/{tag}',
                   asset_url(asset.get('browser_download_url'), tag, name), name, size,
                   digest.removeprefix('sha256:').lower(), checksums_url)

class TrustedRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        url = urllib.parse.urlsplit(newurl)
        if url.scheme != 'https' or url.hostname not in ('github.com', 'api.github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'):
            raise ValueError('Update redirected outside GitHub HTTPS')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def open_url(url):
    return urllib.request.build_opener(TrustedRedirects()).open(
        urllib.request.Request(url, headers={'Accept': 'application/vnd.github+json' if url.startswith(API) else 'application/octet-stream',
                                             'User-Agent': 'SimpleSoundManager updater'}), timeout=15)

def read_bounded(url, limit):
    with open_url(url) as response:
        data = response.read(limit+1)
    if len(data) > limit:
        raise ValueError('Update response is too large')
    return data

def check(current, platform=None):
    releases = []
    # The Foundry publishes many independent tools; /latest is not this app.
    for page in range(1, 11):
        batch = json.loads(read_bounded(f'{API}?per_page=100&page={page}', 4*1024*1024))
        if not isinstance(batch, list):
            raise ValueError('Invalid GitHub release feed')
        releases.extend(batch)
        if len(batch) < 100:
            return select_release(releases, current, platform)
    raise ValueError('Release list exceeds the check limit. Open the releases page to check manually.')

def checksum_for(release):
    if release.digest:
        return release.digest
    text = read_bounded(release.checksums_url, 65536).decode('utf-8')
    for line in text.splitlines():
        match = re.fullmatch(r'([0-9a-fA-F]{64})\s+\*?(.+)', line)
        if match and match[2] == release.name:
            return match[1].lower()
    raise ValueError('The release checksum does not include this package')

def extract_package(archive, destination, platform=None):
    destination = Path(destination).resolve()
    expected_root = 'SimpleSoundManager' if (platform or sys.platform) == 'win32' else 'sound-manager'
    with zipfile.ZipFile(archive) as package:
        entries = package.infolist()
        if len(entries) > 5000 or sum(item.file_size for item in entries) > MAX_EXPANDED:
            raise ValueError('Update archive exceeds extraction limits')
        seen = set()
        for item in entries:
            name = item.filename
            path = PurePosixPath(name)
            if ('\\' in name or ':' in name or path.is_absolute() or '..' in path.parts
                    or not path.parts or path.parts[0] != expected_root
                    or stat.S_ISLNK(item.external_attr >> 16)):
                raise ValueError('Unsafe update archive path')
            normalized = name.rstrip('/').casefold()
            if normalized in seen:
                raise ValueError('Duplicate update archive path')
            seen.add(normalized)
            if not destination.joinpath(*path.parts).resolve().is_relative_to(destination):
                raise ValueError('Update archive escapes its folder')
        package.extractall(destination)
    root = destination/expected_root
    required = ('install-windows.ps1', 'dist/SimpleSoundManager/SimpleSoundManager.exe', 'dist/launcher/SimpleSoundManagerLauncher.exe') if (platform or sys.platform) == 'win32' else ('install-linux.sh', 'run.py', 'sound_manager/__init__.py')
    if any(not (root/name).is_file() for name in required):
        raise ValueError('Update archive is missing its installer or application')
    return root

def download(release, updates_dir, progress=lambda value: None, cancelled=lambda: False, platform=None):
    """No audio changes or installer execution occur during staging."""
    expected = checksum_for(release)
    Path(updates_dir).mkdir(parents=True, exist_ok=True)
    folder = Path(tempfile.mkdtemp(prefix=release.version+'-', dir=updates_dir))
    archive = folder/release.name
    digest, received = hashlib.sha256(), 0
    try:
        with open_url(release.url) as response, archive.open('wb') as output:
            while True:
                if cancelled():
                    raise InterruptedError('Update download cancelled')
                block = response.read(256*1024)
                if not block:
                    break
                received += len(block)
                if received > release.size or received > MAX_DOWNLOAD:
                    raise ValueError('Update package is larger than advertised')
                output.write(block)
                digest.update(block)
                progress(round(received*100/release.size))
        if received != release.size or digest.hexdigest() != expected:
            raise ValueError('Update package verification failed; nothing was installed')
        if cancelled():
            raise InterruptedError('Update download cancelled')
        root = extract_package(archive, folder/'unpacked', platform)
        if (platform or sys.platform) == 'win32' and (root/'dist/SimpleSoundManager/version.txt').read_text().strip() != release.version:
            raise ValueError('Downloaded application version does not match the release')
        return root
    finally:
        archive.unlink(missing_ok=True)

def handoff(root, log):
    """Launch trusted local helper; it waits for this process to finish cleanup."""
    helper_dir = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent.parent))
    if sys.platform == 'win32':
        command = [str(Path(os.environ['SystemRoot'])/'System32/WindowsPowerShell/v1.0/powershell.exe'), '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', str(helper_dir/'update-handoff.ps1'), '-AppProcessId', str(os.getpid()), '-PackageRoot', str(root), '-LogPath', str(log)]
        return subprocess.Popen(command, creationflags=subprocess.CREATE_NO_WINDOW, close_fds=True)
    return subprocess.Popen(['bash', str(helper_dir/'update-handoff.sh'), str(os.getpid()), str(root), str(log)], start_new_session=True, close_fds=True)
