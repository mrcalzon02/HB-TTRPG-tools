"""Responsive update checks; installation always requires an explicit click."""
import queue
import threading
import time
from PySide6.QtCore import QTimer, QUrl
from PySide6.QtGui import QDesktopServices
from PySide6.QtWidgets import QCheckBox, QDialog, QHBoxLayout, QLabel, QProgressBar, QPushButton, QTextEdit, QVBoxLayout
from . import __version__
from .settings import data_dir
from . import updates

class UpdateDialog(QDialog):
    def __init__(self, controller):
        super().__init__(controller.window)
        self.controller = controller
        self.setWindowTitle('Simple Sound Manager updates')
        self.resize(650, 440)
        layout = QVBoxLayout(self)
        layout.addWidget(QLabel(f'Installed version: {__version__}'))
        self.automatic = QCheckBox('Check for updates on startup')
        self.automatic.setChecked(controller.window.settings.data.get('check_updates', True))
        self.automatic.toggled.connect(controller.set_automatic)
        layout.addWidget(self.automatic)
        self.message = QLabel(controller.message)
        self.message.setWordWrap(True)
        layout.addWidget(self.message)
        self.notes = QTextEdit()
        self.notes.setReadOnly(True)
        self.notes.setPlainText(controller.release.notes if controller.release else '')
        layout.addWidget(self.notes, 1)
        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        layout.addWidget(self.progress)
        actions = QHBoxLayout()
        self.check_button = QPushButton('Check now')
        self.check_button.clicked.connect(lambda: controller.check(manual=True))
        actions.addWidget(self.check_button)
        self.update_button = QPushButton('Update')
        self.update_button.clicked.connect(controller.update)
        actions.addWidget(self.update_button)
        self.later = QPushButton('Not now')
        self.later.clicked.connect(self.close)
        actions.addWidget(self.later)
        layout.addLayout(actions)
        self.cancel = QPushButton('Cancel download')
        self.cancel.clicked.connect(controller.cancel.set)
        layout.addWidget(self.cancel)
        self.refresh()

    def refresh(self):
        controller = self.controller
        self.message.setText(controller.message)
        self.notes.setPlainText(controller.release.notes if controller.release else '')
        self.check_button.setEnabled(not controller.busy)
        self.update_button.setEnabled(bool(controller.release) and not controller.busy)
        self.update_button.setText('Install and restart' if controller.staged else 'Update')
        self.progress.setVisible(controller.downloading)
        self.progress.setValue(controller.percent)
        self.cancel.setVisible(controller.downloading)

class UpdateController:
    def __init__(self, window):
        self.window = window
        self.events = queue.Queue()
        self.cancel = threading.Event()
        self.busy = self.downloading = False
        self.release = self.staged = self.dialog = None
        self.percent = 0
        self.message = 'Check published Sound Manager releases on GitHub. Offline audio works without update checks.'
        self.manual = False
        self.timer = QTimer(window)
        self.timer.timeout.connect(self.poll)
        self.timer.start(150)
        if not window.screenshot:
            QTimer.singleShot(5000, self.startup_check)

    def set_automatic(self, enabled):
        self.window.settings.data['check_updates'] = enabled
        self.window.settings.save()

    def startup_check(self):
        settings = self.window.settings.data
        if not self.window.screenshot and settings.get('check_updates', True) and time.time()-settings.get('update_checked_at', 0) >= 86400:
            self.check()

    def show(self):
        if self.dialog is None:
            self.dialog = UpdateDialog(self)
        self.dialog.refresh()
        self.dialog.show()
        self.dialog.raise_()
        self.dialog.activateWindow()

    def check(self, manual=False):
        if self.busy:
            return
        self.manual = manual
        self.busy = True
        self.release = self.staged = None
        self.message = 'Checking Sound Manager releases…'
        if manual:
            self.show()
        self.window.settings.data['update_checked_at'] = time.time()
        self.window.settings.save()
        self.refresh()
        def work():
            try:
                self.events.put(('checked', updates.check(__version__)))
            except Exception as exc:
                self.events.put(('error', str(exc)))
        threading.Thread(target=work, daemon=True).start()

    def refresh(self):
        if self.dialog:
            self.dialog.refresh()
        self.window.update_button.setText(f'Update {self.release.version}' if self.release else 'Updates')

    def poll(self):
        while True:
            try:
                kind, value = self.events.get_nowait()
            except queue.Empty:
                break
            if kind == 'progress':
                self.percent = value
            else:
                self.busy = self.downloading = False
                if kind == 'checked':
                    self.release = value
                    self.message = f'Version {value.version} is available. Update downloads and verifies the package; installation needs a second click.' if value else 'You have the latest published stable Sound Manager release.'
                    if value:
                        self.show()
                elif kind == 'staged':
                    self.staged = value
                    self.message = 'Download verified. Install and restart will briefly stop routed audio, restore system devices, and reopen the updated app. Your settings are retained.'
                    self.show()
                else:
                    self.message = 'Update could not finish: '+value+'. Your audio and current installation are unchanged.'
            self.refresh()

    def update(self):
        if self.busy or not self.release:
            return
        if self.staged:
            self.install()
            return
        self.cancel.clear()
        self.busy = self.downloading = True
        self.percent = 0
        self.message = 'Downloading update. Your audio keeps playing until you choose Install and restart.'
        self.refresh()
        release = self.release
        def work():
            try:
                root = updates.download(release, data_dir()/'updates', lambda p: self.events.put(('progress', p)), self.cancel.is_set)
                self.events.put(('staged', root))
            except Exception as exc:
                self.events.put(('error', str(exc)))
        threading.Thread(target=work, daemon=True).start()

    def install(self):
        window = self.window
        if window.setup_process:
            self.message = 'Wait for audio driver setup to finish before installing.'
            self.refresh()
            return
        try:
            if window.running:
                window.stop()
            else:
                window.recover()
            window.settings.save()
            updates.handoff(self.staged, data_dir()/'updates'/'install.log')
        except Exception as exc:
            self.message = 'Installation did not start: '+str(exc)+'. Reopen or start audio when ready.'
            self.refresh()
            return
        # Helper waits for this process to exit before it touches the install.
        window.quitting = True
        window.tray.hide()
        from PySide6.QtWidgets import QApplication
        QApplication.instance().quit()
