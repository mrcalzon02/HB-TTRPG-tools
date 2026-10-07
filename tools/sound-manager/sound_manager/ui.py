from pathlib import Path
import queue
import subprocess
import sys
import traceback
import json
import time
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QAction, QColor, QIcon, QPainter, QPixmap, QShortcut, QKeySequence
from PySide6.QtWidgets import (QApplication, QCheckBox, QComboBox, QDialog, QFrame,
    QHBoxLayout, QLabel, QMainWindow, QMenu, QMessageBox, QPushButton, QScrollArea,
    QSlider, QSpinBox, QSystemTrayIcon, QTabWidget, QVBoxLayout, QWidget, QLineEdit, QInputDialog)
from .backend import Backend
from .dsp import FREQUENCIES, PRESETS
from .engine import Engine
from .settings import Settings, data_dir
from . import __version__
from .startup import is_enabled as login_enabled, set_enabled as set_login_enabled
from .timing import alignment_delays
from .waveform import WaveformWidget
from .channels import LAYOUTS
from .controls import MuteController
from .reliability import DeviceReturnTracker, RetryBudget
from .resume import ResumeEvents

STYLE = """
QWidget { background: #151922; color: #e9edf4; font-family: 'Segoe UI'; font-size: 14px; }
QLabel#title { font-size: 28px; font-weight: 700; }
QLabel#subtitle, QLabel#note { color: #a7b2c5; }
QFrame#card { background: #202632; border: 1px solid #333e50; border-radius: 12px; }
QFrame#card QLabel, QFrame#card QCheckBox { background: transparent; }
QPushButton { background: #303a4b; border: 1px solid #43516a; padding: 9px 15px; border-radius: 7px; }
QPushButton:hover { background: #40506a; }
QPushButton#primary { background: #64dbc2; color: #102923; font-weight: 700; border: none; }
QPushButton:disabled { color: #707c90; background: #252b35; }
QSlider::groove:horizontal { height: 5px; background: #414d60; border-radius: 2px; }
QSlider::handle:horizontal { width: 16px; margin: -6px 0; background: #64dbc2; border-radius: 8px; }
QSlider::groove:vertical { width: 5px; background: #414d60; }
QSlider::handle:vertical { height: 16px; margin: 0 -6px; background: #64dbc2; border-radius: 8px; }
QCheckBox { spacing: 9px; }
QCheckBox::indicator { width: 18px; height: 18px; border: 1px solid #667793; border-radius: 4px; background: #252e3c; }
QCheckBox::indicator:checked { background: #64dbc2; border-color: #64dbc2; }
QTabWidget::pane { border: none; }
QTabBar::tab { padding: 12px 24px; background: #202632; }
QTabBar::tab:selected { color: #64dbc2; border-bottom: 2px solid #64dbc2; }
QScrollArea { border: none; }
QComboBox { padding: 8px; background: #303a4b; border: 1px solid #43516a; }
QMenu { background: #202632; border: 1px solid #43516a; }
QMenu::item { padding: 8px 22px; }
QMenu::item:selected { background: #40506a; }
"""

def icon(size=64):
    from PySide6.QtSvg import QSvgRenderer
    source = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent.parent))/'app-icon.svg'
    renderer = QSvgRenderer(str(source))
    if not renderer.isValid():
        raise RuntimeError('Application icon asset is missing or invalid')
    pixmap = QPixmap(size, size)
    pixmap.fill(Qt.GlobalColor.transparent)
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    renderer.render(painter)
    painter.end()
    return QIcon(pixmap)

from .eq_ui import EqDialog

class DeviceCard(QFrame):
    def __init__(self, window, device):
        super().__init__()
        self.window, self.device = window, device
        self.setObjectName("card")
        box = QVBoxLayout(self)
        box.setContentsMargins(18, 10, 18, 10)
        top = QHBoxLayout()
        name = QLabel(window.display_name(device))
        name.setToolTip(device.name)
        name.setWordWrap(True)
        name.setStyleSheet("font-weight: 600; font-size: 16px;")
        top.addWidget(name, 1)
        self.default = QLabel("Default" if device.default else "")
        self.default.setStyleSheet("color: #64dbc2;")
        top.addWidget(self.default)
        favorite = QPushButton('Pinned' if window.settings.preference(device.id)['favorite'] else 'Pin')
        favorite.setCheckable(True)
        favorite.setChecked(window.settings.preference(device.id)['favorite'])
        favorite.toggled.connect(lambda value: window.favorite(device.id, value))
        top.addWidget(favorite)
        rename = QPushButton('Rename')
        rename.clicked.connect(lambda: window.rename(device))
        top.addWidget(rename)
        self.waveform_toggle = QCheckBox('Waveform')
        self.waveform_toggle.setChecked(window.settings.device(device).get('waveform', True))
        self.waveform_toggle.setToolTip('Show or hide this device’s waveform. Audio and Meter/Listen are unchanged.')
        self.waveform_toggle.toggled.connect(lambda enabled: window.set_waveform(device, enabled))
        top.addWidget(self.waveform_toggle)
        self.freeze_toggle = QCheckBox('Freeze')
        self.freeze_toggle.setChecked(device.id in window.waveform_freezes)
        self.freeze_toggle.setEnabled(self.waveform_toggle.isChecked())
        self.freeze_toggle.setToolTip('Hold this device’s waveform and readings for inspection. Audio keeps playing. Session only; no audio is saved.')
        self.freeze_toggle.toggled.connect(lambda enabled: window.set_waveform_frozen(device, enabled))
        top.addWidget(self.freeze_toggle)
        if device.kind == 'output':
            top.addWidget(QLabel(f'{len(device.channels)} channels'))
        box.addLayout(top)
        controls = QHBoxLayout()
        if device.kind == "output":
            self.selected = QCheckBox("Play here")
            self.selected.setChecked(window.selected(device))
            self.selected.toggled.connect(lambda checked: window.select(device.id, checked))
            controls.addWidget(self.selected)
        self.mute = QPushButton("Unmute" if device.muted else "Mute")
        self.mute.setEnabled(not window.mutes.active(device.kind))
        self.mute.clicked.connect(lambda: window.perform(lambda: window.backend.mute(self.device, not self.device.muted)))
        controls.addWidget(self.mute)
        self.volume = QSlider(Qt.Orientation.Horizontal)
        self.volume.setRange(0, 100)
        self.volume.setValue(round(device.volume*100))
        self.number = QLabel(f"{self.volume.value()}%")
        self.number.setMinimumWidth(42)
        self.volume.valueChanged.connect(lambda n: self.number.setText(f"{n}%"))
        self.volume.sliderReleased.connect(lambda: window.perform(lambda: window.backend.volume(self.device, self.volume.value()/100)))
        # Keyboard changes need to reach the device too.
        self.volume.actionTriggered.connect(lambda _: QTimer.singleShot(0, self.commit_volume))
        controls.addWidget(self.volume, 1)
        controls.addWidget(self.number)
        eq = QPushButton("Equalizer")
        eq.clicked.connect(lambda: EqDialog(window, self.device).exec())
        controls.addWidget(eq)
        default = QPushButton("Use as default")
        default.clicked.connect(lambda: window.perform(lambda: window.backend.set_default(self.device.id, self.device.kind)))
        if device.kind == "output":
            default.setEnabled(not window.running)
        controls.addWidget(default)
        box.addLayout(controls)
        timing = QHBoxLayout()
        if device.kind == 'input':
            self.listen = QCheckBox('Listen')
            self.listen.setChecked(window.settings.input(device.id)['monitor'])
            self.listen.setToolTip('Play this microphone through the selected outputs. Use headphones to avoid feedback.')
            self.listen.toggled.connect(lambda checked: window.monitor(device.id, checked))
            timing.addWidget(self.listen)
            self.meter = QCheckBox('Meter')
            self.meter.setChecked(window.settings.input(device.id)['meter'])
            self.meter.setToolTip('Capture this input for its waveform without playing it. Bluetooth microphones may switch into call mode.')
            self.meter.toggled.connect(lambda checked: window.meter_input(device.id, checked))
            timing.addWidget(self.meter)
        delay_label = QLabel('Output delay' if device.kind == 'output' else 'Monitor delay')
        timing.addWidget(delay_label)
        self.delay = QSlider(Qt.Orientation.Horizontal)
        self.delay.setRange(0, 2000)
        config = window.settings.output(device.id) if device.kind == 'output' else window.settings.input(device.id)
        self.delay.setValue(round(config['delay_ms']))
        self.delay_value = QSpinBox()
        self.delay_value.setRange(0, 2000)
        self.delay_value.setSuffix(' ms')
        self.delay_value.setValue(self.delay.value())
        self.delay_value.setMinimumWidth(100)
        self.delay.valueChanged.connect(self.delay_value.setValue)
        self.delay_value.valueChanged.connect(self.delay.setValue)
        self.delay_value.editingFinished.connect(lambda: window.set_delay(device, self.delay_value.value()))
        self.delay.sliderReleased.connect(lambda: window.set_delay(device, self.delay.value()))
        self.delay.actionTriggered.connect(lambda _: QTimer.singleShot(0, lambda: window.set_delay(device, self.delay.value()) if not self.delay.isSliderDown() else None))
        timing.addWidget(self.delay, 1)
        timing.addWidget(self.delay_value)
        reset_delay = QPushButton('Reset delay')
        reset_delay.clicked.connect(lambda: window.set_delay(device, 0))
        timing.addWidget(reset_delay)
        box.addLayout(timing)
        if device.kind == 'output':
            formats = QHBoxLayout()
            formats.addWidget(QLabel('Playback layout'))
            self.mode = QComboBox()
            self.mode.addItems(['Auto', *LAYOUTS])
            for i in range(1, self.mode.count()):
                self.mode.model().item(i).setEnabled(len(LAYOUTS[self.mode.itemText(i)]) <= len(device.channels))
            self.mode.setCurrentText(config['mode'])
            self.mode.setToolTip('Auto preserves the native channels. Stereo devices downmix surround. Additional speakers stay silent for stereo sources.')
            self.mode.currentTextChanged.connect(lambda mode: window.set_mode(device, mode))
            formats.addWidget(self.mode, 1)
            panel = QWidget()
            panel.setLayout(formats)
            panel.setVisible(window.settings.data.get('advanced_visible', False))
            box.addWidget(panel)
        self.waveform = WaveformWidget(window, device)
        box.addWidget(self.waveform)

    def commit_volume(self):
        if not self.volume.isSliderDown():
            self.window.perform(lambda: self.window.backend.volume(self.device, self.volume.value()/100))

    def sync(self, device):
        self.device = device
        self.default.setText("Default" if device.default else "")
        self.mute.setText("Unmute" if device.muted else "Mute")
        self.mute.setEnabled(not self.window.mutes.active(device.kind))
        if not self.volume.isSliderDown():
            self.volume.blockSignals(True)
            self.volume.setValue(round(device.volume*100))
            self.volume.blockSignals(False)
            self.number.setText(f"{self.volume.value()}%")
        if hasattr(self, "selected"):
            self.selected.blockSignals(True)
            self.selected.setChecked(self.window.selected(device))
            self.selected.blockSignals(False)
        config = self.window.settings.output(device.id) if device.kind == 'output' else self.window.settings.input(device.id)
        self.waveform_toggle.blockSignals(True)
        self.waveform_toggle.setChecked(config.get('waveform', True))
        self.waveform_toggle.blockSignals(False)
        self.freeze_toggle.blockSignals(True)
        self.freeze_toggle.setChecked(device.id in self.window.waveform_freezes)
        self.freeze_toggle.setEnabled(config.get('waveform', True))
        self.freeze_toggle.blockSignals(False)
        self.waveform.set_display_enabled(config.get('waveform', True))
        if not self.delay.isSliderDown() and not self.delay_value.hasFocus():
            self.delay.setValue(round(config['delay_ms']))
        if hasattr(self, 'listen'):
            self.listen.blockSignals(True)
            self.listen.setChecked(config['monitor'])
            self.listen.blockSignals(False)
            self.meter.blockSignals(True)
            self.meter.setChecked(config['meter'])
            self.meter.blockSignals(False)

class Window(QMainWindow):
    def __init__(self, screenshot=False, backend=None):
        super().__init__()
        self.setWindowTitle(f"Simple Sound Manager {__version__}")
        self.setWindowIcon(icon())
        self.resize(1000, 900)
        self.settings = Settings()
        self.mutes = MuteController(self.settings)
        self.eq_histories = {}
        self.waveform_freezes = {}
        self.backend = backend or Backend()
        self.engine = Engine(self.backend.sc)
        self.running = False
        self.quitting = False
        self.screenshot = screenshot
        self.cards = {}
        self.devices = []
        self.bus = None
        self.setup_process = None
        self.returns = DeviceReturnTracker()
        self.retry_budget = RetryBudget()
        self.audio_intent = False
        self.fallback_active = None
        self.fallback_attempted = set()
        self.fallback_mute_before = None
        self.transition = False
        self.route_started_at = None
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(26, 22, 26, 22)
        layout.setSpacing(14)
        title = QLabel(f"Simple Sound Manager {__version__}")
        title.setObjectName("title")
        layout.addWidget(title)
        subtitle = QLabel("Your sound. Every device. One menu.")
        subtitle.setObjectName("subtitle")
        layout.addWidget(subtitle)
        row = QHBoxLayout()
        self.start_button = QPushButton("Start multi-output audio")
        self.start_button.setObjectName("primary")
        self.start_button.clicked.connect(lambda: self.perform(self.toggle))
        row.addWidget(self.start_button)
        refresh = QPushButton("Refresh devices")
        refresh.clicked.connect(lambda: self.perform(lambda: self.refresh(True)))
        row.addWidget(refresh)
        retry = QPushButton('Retry selected')
        retry.clicked.connect(lambda: self.perform(self.retry_selected))
        row.addWidget(retry)
        sync = QPushButton('Auto sync delays')
        sync.setToolTip('Estimate output alignment using driver latency. Fine-tune Bluetooth manually if needed.')
        sync.clicked.connect(lambda: self.perform(self.auto_sync))
        row.addWidget(sync)
        advanced = QPushButton('Layout / backup')
        self.advanced_button = advanced
        advanced.setCheckable(True)
        advanced.setChecked(self.settings.data.get('advanced_visible', False))
        advanced.toggled.connect(self.set_advanced)
        row.addWidget(advanced)
        if self.backend.windows:
            setup = QPushButton("Windows audio setup")
            setup.clicked.connect(self.driver_setup)
            row.addWidget(setup)
        row.addStretch()
        layout.addLayout(row)
        preferences = QHBoxLayout()
        self.auto_checkbox = QCheckBox('Start sound automatically')
        self.auto_checkbox.setChecked(self.settings.data['auto_start'])
        self.auto_checkbox.toggled.connect(self.set_auto_start)
        preferences.addWidget(self.auto_checkbox)
        self.login_checkbox = QCheckBox('Start at login')
        self.login_checkbox.setChecked(login_enabled() if not screenshot else False)
        self.login_checkbox.toggled.connect(lambda enabled: self.perform(lambda: set_login_enabled(enabled)))
        preferences.addWidget(self.login_checkbox)
        self.reconnect_checkbox = QCheckBox('Reconnect automatically')
        self.reconnect_checkbox.setChecked(self.settings.data.get('reconnect', True))
        self.reconnect_checkbox.toggled.connect(self.set_reconnect)
        preferences.addWidget(self.reconnect_checkbox)
        self.cancel_recovery_button = QPushButton('Cancel retry')
        self.cancel_recovery_button.clicked.connect(self.cancel_recovery)
        self.cancel_recovery_button.hide()
        preferences.addWidget(self.cancel_recovery_button)
        self.update_button = QPushButton('Updates')
        self.update_button.clicked.connect(lambda: self.updater.show())
        preferences.addWidget(self.update_button)
        scenes_button = QPushButton('Scenes')
        scenes_button.clicked.connect(lambda: self.scenes.show())
        preferences.addWidget(scenes_button)
        backups_button = QPushButton('Backup / restore')
        backups_button.clicked.connect(lambda: self.backups.show())
        preferences.addWidget(backups_button)
        preferences.addStretch()
        layout.addLayout(preferences)
        quick = QHBoxLayout()
        self.panic_button = QPushButton()
        self.panic_button.clicked.connect(lambda: self.perform(lambda: self.group_mute('output', not self.mutes.active('output'))))
        self.mic_button = QPushButton()
        self.mic_button.clicked.connect(lambda: self.perform(lambda: self.group_mute('input', not self.mutes.active('input'))))
        quick.addWidget(self.panic_button)
        quick.addWidget(self.mic_button)
        self.search = QLineEdit()
        self.search.setPlaceholderText('Find devices by name or saved label…')
        self.search.textChanged.connect(self.filter_cards)
        quick.addWidget(self.search, 1)
        layout.addLayout(quick)
        convenience = QHBoxLayout()
        self.bypass_eq = QCheckBox('Bypass all EQ')
        self.bypass_eq.setChecked(self.settings.data.get('bypass_eq', False))
        self.bypass_eq.setToolTip('Compare without EQ/preamp/headroom processing on routed inputs and outputs. Saved EQ settings and timing stay unchanged.')
        self.bypass_eq.toggled.connect(self.set_eq_bypass)
        convenience.addWidget(self.bypass_eq)
        reset_timing = QPushButton('Reset all delays')
        reset_timing.setToolTip('Set output, microphone-monitor and system-input delays to zero, including saved disconnected devices.')
        reset_timing.clicked.connect(self.reset_all_delays)
        convenience.addWidget(reset_timing)
        reset_meters = QPushButton('Reset meter holds')
        reset_meters.setToolTip('Clear held peaks and clip counts without stopping audio. Frozen waveform shapes are retained.')
        reset_meters.clicked.connect(lambda: self.reset_meter_holds())
        convenience.addWidget(reset_meters)
        convenience.addStretch()
        layout.addLayout(convenience)
        for key, kind in (('Ctrl+Alt+P', 'output'), ('Ctrl+Alt+M', 'input')):
            shortcut = QShortcut(QKeySequence(key), self)
            shortcut.activated.connect(lambda selected=kind: self.perform(lambda: self.group_mute(selected, not self.mutes.active(selected))))
        self.panic_button.setToolTip('Mute all outputs. Ctrl+Alt+P works while this window is active.')
        self.mic_button.setToolTip('Mute all real microphones. Ctrl+Alt+M works while this window is active.')
        formats = QHBoxLayout()
        formats.addWidget(QLabel('System audio layout'))
        self.layout = QComboBox()
        self.layout.addItems(['Auto', *LAYOUTS])
        self.layout.setCurrentText(self.settings.data.get('layout', 'Auto'))
        self.layout.currentTextChanged.connect(lambda name: self.perform(lambda: self.set_layout(name)))
        formats.addWidget(self.layout)
        formats.addWidget(QLabel('PCM channels · 7.1.4 is a height layout, not a Dolby Atmos encoder'), 1)
        self.format_panel = QWidget()
        format_layout = QVBoxLayout(self.format_panel)
        format_layout.addLayout(formats)
        backup_row = QHBoxLayout()
        backup_row.addWidget(QLabel('Backup output'))
        self.fallback_choice = QComboBox()
        self.fallback_choice.currentIndexChanged.connect(self.choose_fallback)
        backup_row.addWidget(self.fallback_choice, 1)
        backup_row.addWidget(QLabel('Used only when selected outputs cannot play.'))
        format_layout.addLayout(backup_row)
        self.format_panel.setVisible(self.settings.data.get('advanced_visible', False))
        layout.addWidget(self.format_panel)
        self.status = QLabel("Ready — volume, mute, and default devices work immediately.")
        self.status.setWordWrap(True)
        self.status.setObjectName("note")
        layout.addWidget(self.status)
        self.signal_status = QLabel("Multi-output audio is stopped.")
        self.signal_status.setObjectName("note")
        self.signal_status.setWordWrap(True)
        layout.addWidget(self.signal_status)
        self.tabs = QTabWidget()
        self.groups = {}
        for kind, title_text in (("output", "Outputs"), ("input", "Inputs")):
            page = QWidget()
            page_layout = QVBoxLayout(page)
            if kind == "output":
                buttons = QHBoxLayout()
                for label, selected in (("Select all outputs", True), ("Clear selection", False)):
                    button = QPushButton(label)
                    button.clicked.connect(lambda _, value=selected: self.select_all(value))
                    buttons.addWidget(button)
                buttons.addStretch()
                page_layout.addLayout(buttons)
            else:
                system_row = QHBoxLayout()
                system_row.addWidget(QLabel('System audio input delay'))
                self.system_delay = QSlider(Qt.Orientation.Horizontal)
                self.system_delay.setRange(0, 2000)
                self.system_delay.setValue(round(self.settings.data.get('system_delay_ms', 0)))
                self.system_delay_label = QLabel(f'{self.system_delay.value()} ms')
                self.system_delay.valueChanged.connect(lambda v: self.system_delay_label.setText(f'{v} ms'))
                self.system_delay.sliderReleased.connect(self.set_system_delay)
                self.system_delay.actionTriggered.connect(lambda _: QTimer.singleShot(0, self.set_system_delay))
                system_row.addWidget(self.system_delay, 1)
                system_row.addWidget(self.system_delay_label)
                self.system_timing_panel = QWidget()
                self.system_timing_panel.setLayout(system_row)
                page_layout.addWidget(self.system_timing_panel)
            scroll = QScrollArea()
            scroll.setWidgetResizable(True)
            content = QWidget()
            self.groups[kind] = QVBoxLayout(content)
            self.groups[kind].setAlignment(Qt.AlignmentFlag.AlignTop)
            scroll.setWidget(content)
            page_layout.addWidget(scroll)
            self.tabs.addTab(page, title_text)
        layout.addWidget(self.tabs, 1)
        note = QLabel("Add delay to outputs that play early. Auto sync uses driver estimates; Bluetooth may need fine tuning.\nMicrophone delay applies to Listen monitoring here. Other apps keep their own input paths.")
        note.setWordWrap(True)
        note.setObjectName("note")
        layout.addWidget(note)
        self.tray = QSystemTrayIcon(icon(), self)
        self.tray.setToolTip("Simple Sound Manager")
        self.tray.activated.connect(lambda reason: self.show_window() if reason == QSystemTrayIcon.ActivationReason.Trigger else None)
        if not screenshot and QSystemTrayIcon.isSystemTrayAvailable():
            self.tray.show()
        from .scenes_ui import SceneController
        self.scenes = SceneController(self)
        from .backups_ui import BackupController
        self.backups = BackupController(self)
        self.refresh(True)
        available = {d.id for d in self.devices}
        for identifier, config in self.settings.data['outputs'].items():
            if config.get('selected') and identifier not in available:
                self.returns.expect_missing(identifier)
        for identifier, config in self.settings.data['inputs'].items():
            if (config.get('monitor') or config.get('meter')) and identifier not in available:
                self.returns.expect_missing(identifier)
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.tick)
        self.timer.start(2000)
        from .update_ui import UpdateController
        self.updater = UpdateController(self)
        self.resume_events = None if screenshot else ResumeEvents(QApplication.instance(), self.request_recovery)
        # A screenshot/probe never mutates the user's audio state.
        if not screenshot:
            self.perform(self.recover)
            if self.login_checkbox.isChecked():
                self.perform(lambda: set_login_enabled(True))  # Refresh the command after an app update.
            QTimer.singleShot(250, self.auto_start)
        if self.settings.warning:
            self.status.setText(self.settings.warning)

    def perform(self, operation):
        try:
            operation()
            if operation != self.refresh:
                self.refresh()
        except Exception as exc:
            self.status.setText(str(exc))
            traceback.print_exc()

    def configurations(self):
        return {d.id: self.processing_config(dict(self.settings.output(d.id, d.default), selected=self.selected(d) and not self.returns.settling(d.id), _native_roles=d.channels, _panic=self.mutes.active('output'))) for d in self.devices if d.kind == "output" and not d.virtual}

    def processing_config(self, config):
        result = dict(config)
        if self.settings.data.get('bypass_eq', False):
            result.update(eq=False, preamp=0, balance=0, protect=False)
        return result

    def set_waveform(self, device, enabled):
        self.settings.device(device)['waveform'] = enabled
        self.settings.save()
        for widget in self.findChildren(WaveformWidget):
            if widget.device.id == device.id:
                widget.set_display_enabled(enabled)
        card = self.cards.get(device.id)
        if card:
            card.waveform_toggle.blockSignals(True)
            card.waveform_toggle.setChecked(enabled)
            card.waveform_toggle.blockSignals(False)
            card.freeze_toggle.setEnabled(enabled)
        for dialog in self.findChildren(EqDialog):
            if dialog.device.id == device.id:
                dialog.waveform_switch.blockSignals(True)
                dialog.waveform_switch.setChecked(enabled)
                dialog.waveform_switch.blockSignals(False)
                dialog.freeze_switch.setEnabled(enabled)
                dialog.select_display(dialog.display_mode.currentIndex(), save=False)

    def set_waveform_frozen(self, device, enabled):
        if enabled:
            history = self.engine.history(device.id)
            points = history.snapshot() if history else []
            self.waveform_freezes[device.id] = dict(points=points, levels=history.levels() if history else (0, 0, 0), signal=bool(points))
        else:
            self.waveform_freezes.pop(device.id, None)
        for widget in self.findChildren(WaveformWidget):
            if widget.device.id == device.id:
                widget.set_display_enabled(not widget.isHidden())
                widget.update()
        card = self.cards.get(device.id)
        if card:
            card.freeze_toggle.blockSignals(True)
            card.freeze_toggle.setChecked(enabled)
            card.freeze_toggle.blockSignals(False)
        for dialog in self.findChildren(EqDialog):
            if dialog.device.id == device.id:
                dialog.freeze_switch.blockSignals(True)
                dialog.freeze_switch.setChecked(enabled)
                dialog.freeze_switch.blockSignals(False)

    def reset_meter_holds(self, identifier=None):
        identifiers = [identifier] if identifier else list({d.id for d in self.devices} | set(self.waveform_freezes))
        for key in identifiers:
            history = self.engine.history(key)
            if history:
                history.reset_levels()
            if key in self.waveform_freezes:
                frozen = self.waveform_freezes[key]
                frozen['levels'] = (0, frozen['levels'][1], 0)
        for widget in self.findChildren(WaveformWidget):
            if widget.device.id in identifiers:
                widget.update()
        self.status.setText('Peak and clip holds cleared. Audio and waveform shapes are unchanged.')

    def set_eq_bypass(self, enabled):
        self.settings.data['bypass_eq'] = enabled
        self.perform(self.save_and_apply)
        self.status.setText('All EQ bypassed. Saved EQ settings and timing are retained.' if enabled else 'Saved device EQ settings are active again.')

    def reset_all_delays(self):
        for kind in ('outputs', 'inputs'):
            for config in self.settings.data[kind].values():
                config['delay_ms'] = 0
        self.settings.data['system_delay_ms'] = 0
        self.system_delay.setValue(0)
        self.perform(self.save_and_apply)
        self.status.setText('All output, monitor and system-input delays reset to 0 ms. EQ settings are retained.')

    def selected(self, device):
        return self.settings.output(device.id, device.default)['selected'] or device.id==self.fallback_active

    def set_reconnect(self, enabled):
        self.settings.data['reconnect'] = enabled
        self.settings.save()
        if not enabled and not self.running:
            self.cancel_recovery()

    def cancel_recovery(self):
        self.audio_intent = False
        self.retry_budget.reset()
        self.cancel_recovery_button.hide()
        self.status.setText('Automatic recovery cancelled. Click Start when you want sound again.')

    def choose_fallback(self, *_):
        self.settings.data['fallback_id'] = self.fallback_choice.currentData()
        self.settings.save()

    def refresh_fallback_choices(self):
        signature = tuple((d.id, self.display_name(d)) for d in self.devices if d.kind=='output')
        if signature==getattr(self, 'fallback_signature', None):
            return
        self.fallback_signature = signature
        selected = self.settings.data.get('fallback_id')
        self.fallback_choice.blockSignals(True)
        self.fallback_choice.clear()
        self.fallback_choice.addItem('No automatic backup', None)
        for identifier, name in signature:
            self.fallback_choice.addItem(name, identifier)
        if selected and selected not in dict(signature):
            self.fallback_choice.addItem('Saved backup (disconnected)', selected)
        index = self.fallback_choice.findData(selected)
        self.fallback_choice.setCurrentIndex(max(0, index))
        self.fallback_choice.blockSignals(False)

    def retry_selected(self):
        self.audio_intent = True
        self.retry_budget.reset()
        self.fallback_attempted.clear()
        for device in self.devices:
            config = self.settings.device(device)
            if (config.get('selected') if device.kind=='output' else config.get('monitor') or config.get('meter')):
                self.returns.note_attempt(device.id)
        if not self.running:
            self.attempt_start()
            return
        selected = [d.id for d in self.devices if d.kind=='output' and self.settings.output(d.id)['selected']]
        retried = self.engine.retry_outputs(selected, self.configurations())
        self.engine.retry_inputs([d.id for d in self.devices if d.kind=='input'], self.input_configurations())
        self.status.setText(f'Retried {len(retried)} paused outputs. Healthy streams were kept open.')

    def start_fallback(self):
        identifier = self.settings.data.get('fallback_id')
        device = next((d for d in self.devices if d.kind=='output' and d.id==identifier), None)
        if not device or identifier in self.fallback_attempted or self.returns.settling(identifier):
            return False
        existing = self.engine.workers.get(identifier)
        if existing and existing.error and self.settings.output(identifier)['selected']:
            return False
        self.fallback_attempted.add(identifier)
        self.fallback_active = identifier
        self.fallback_mute_before = bool(device.muted)
        if not self.mutes.active('output'):
            self.backend.mute(device, False)
        if self.running:
            self.engine.retry_outputs([identifier], self.configurations())
        self.status.setText('Using backup output: '+self.display_name(device))
        return True

    def release_fallback(self):
        if self.fallback_active:
            device = next((d for d in self.devices if d.id==self.fallback_active), None)
            if device and self.fallback_mute_before is not None and not self.mutes.active('output'):
                self.backend.mute(device, self.fallback_mute_before)
            elif device and self.fallback_mute_before is not None and self.mutes.active('output'):
                self.mutes.state['output']['before'][device.id] = self.fallback_mute_before
                self.settings.save()
        self.fallback_active, self.fallback_mute_before = None, None

    def set_advanced(self, visible):
        self.settings.data['advanced_visible'] = visible
        self.settings.save()
        self.format_panel.setVisible(visible)
        self.refresh(True)

    def display_name(self, device):
        return self.settings.preference(device.id)['alias'].strip() or device.name

    def favorite(self, identifier, value):
        self.settings.preference(identifier)['favorite'] = value
        self.settings.save()
        self.refresh(True)

    def rename(self, device):
        alias, accepted = QInputDialog.getText(self, 'Device label', 'Name (leave blank to use the driver name)', text=self.settings.preference(device.id)['alias'])
        if accepted:
            self.settings.preference(device.id)['alias'] = alias.strip()[:100]
            self.settings.save()
            self.refresh(True)

    def filter_cards(self, *_):
        query = self.search.text().strip().casefold()
        for device in self.devices:
            card = self.cards.get(device.id)
            if card:
                card.setVisible(query in (self.display_name(device)+' '+device.name+' '+device.kind).casefold())

    def group_mute(self, kind, enabled):
        errors = self.mutes.set(kind, enabled, self.devices, self.backend.mute)
        self.save_and_apply()
        self.status.setText(('Outputs muted' if kind=='output' else 'Microphones muted') if enabled else 'Previous mute states restored')
        if errors:
            self.status.setText('Some devices could not be updated: '+'; '.join(errors))

    def set_mode(self, device, mode):
        self.settings.output(device.id)['mode'] = mode
        self.perform(self.save_and_apply)

    def set_layout(self, name):
        was_running = self.running
        if was_running:
            self.stop()
        self.settings.data['layout'] = name
        self.settings.save()
        if was_running:
            self.toggle()

    def capture_layout(self):
        name = self.settings.data.get('layout', 'Auto')
        if name != 'Auto':
            return name
        count = max((len(d.channels) for d in self.devices if d.kind=='output' and self.selected(d)), default=2)
        return next((name for name in reversed(LAYOUTS) if len(LAYOUTS[name])<=count), 'Stereo')

    def input_configurations(self):
        result = {}
        for device in self.devices:
            if device.kind=='input':
                config = self.processing_config(dict(self.settings.input(device.id), _muted=self.mutes.active('input')))
                if self.returns.settling(device.id):
                    config.update(monitor=False, meter=False)
                result[device.id] = config
        return result

    def set_auto_start(self, enabled):
        self.settings.data['auto_start'] = enabled
        self.perform(self.settings.save)
        if not enabled and not self.running:
            self.cancel_recovery()

    def auto_start(self):
        if self.screenshot or self.running or not self.settings.data['auto_start']:
            return
        self.audio_intent = True
        self.attempt_start()

    def attempt_start(self):
        if self.running or not self.audio_intent:
            return
        try:
            self.toggle()
            self.retry_budget.next_time = None
        except Exception as exc:
            retry = self.retry_budget.failed()
            self.status.setText(f'Audio not ready: {exc}. '+('A bounded retry is scheduled.' if retry else 'Automatic retries stopped. Click Retry selected when ready.'))
            print(self.status.text(), flush=True)
            if not retry:
                self.show_window()

    def request_recovery(self):
        if not self.audio_intent or self.screenshot or not self.settings.data.get('reconnect', True):
            return
        self.retry_budget.reset()
        if self.running:
            self.perform(lambda: self.stop(preserve_intent=True))
        self.retry_budget.failed()
        self.status.setText('System resumed. Audio recovery will try after devices settle.')

    def monitor(self, identifier, enabled):
        self.settings.input(identifier)['monitor'] = enabled
        self.perform(self.save_and_apply)

    def meter_input(self, identifier, enabled):
        self.settings.input(identifier)['meter'] = enabled
        self.perform(self.save_and_apply)

    def set_delay(self, device, value):
        config = self.settings.output(device.id) if device.kind == 'output' else self.settings.input(device.id)
        config['delay_ms'] = max(0, min(2000, value))
        self.perform(self.save_and_apply)

    def auto_sync(self):
        if not self.running:
            raise RuntimeError('Start sound before estimating synchronization.')
        aligned = False
        try:
            delays = alignment_delays(self.engine.latencies())
            for identifier, delay in delays.items():
                self.settings.output(identifier)['delay_ms'] = delay
            aligned = True
        except ValueError:
            pass
        latencies = {key: worker.latency_ms for key, worker in self.engine.inputs.items() if worker.is_alive() and worker.config['monitor']}
        latencies['system'] = self.engine.capture_latency_ms
        try:
            delays = alignment_delays(latencies)
            for identifier, delay in delays.items():
                if identifier == 'system':
                    self.settings.data['system_delay_ms'] = delay
                    self.system_delay.setValue(delay)
                else:
                    self.settings.input(identifier)['delay_ms'] = delay
            aligned = True
        except ValueError:
            pass
        if not aligned:
            raise RuntimeError('Auto sync needs two active outputs or monitored inputs with reported latency.')
        self.save_and_apply()
        self.status.setText('Delays aligned using driver estimates. Fine-tune any device that still plays early; Bluetooth codec delay may not be reported.')

    def set_system_delay(self):
        self.settings.data['system_delay_ms'] = self.system_delay.value()
        self.perform(self.save_and_apply)

    def refresh(self, rebuild=False):
        self.devices = [d for d in self.backend.devices() if not d.virtual]
        self.devices.sort(key=lambda d: (not self.settings.preference(d.id)['favorite'],
                                         not (self.settings.output(d.id, d.default)['selected'] if d.kind=='output' else d.default),
                                         self.display_name(d).casefold()))
        returned = self.returns.observe([d.id for d in self.devices]) if not self.transition else []
        self.fallback_attempted.difference_update(returned)
        if not self.screenshot:
            errors = self.mutes.sync(self.devices, self.backend.mute)
            if errors:
                self.status.setText('Mute update failed: '+'; '.join(errors))
        identifiers = {d.id for d in self.devices}
        if rebuild or identifiers != set(self.cards) or any(d.id in self.cards and d.channels != self.cards[d.id].device.channels for d in self.devices):
            for group in self.groups.values():
                while group.count():
                    item = group.takeAt(0)
                    item.widget().deleteLater()
            self.cards.clear()
            for d in self.devices:
                card = DeviceCard(self, d)
                self.cards[d.id] = card
                self.groups[d.kind].addWidget(card)
        else:
            for d in self.devices:
                self.cards[d.id].sync(d)
        self.panic_button.setText('Resume outputs' if self.mutes.active('output') else 'Mute all outputs')
        self.mic_button.setText('Restore microphones' if self.mutes.active('input') else 'Mute all microphones')
        self.panic_button.setStyleSheet('background: #883f49;' if self.mutes.active('output') else '')
        self.mic_button.setStyleSheet('background: #883f49;' if self.mutes.active('input') else '')
        self.filter_cards()
        self.refresh_fallback_choices()
        if self.running:
            self.engine.configure(self.configurations())
            self.engine.configure_inputs(self.input_configurations())
            self.engine.system_delay_ms = self.settings.data.get('system_delay_ms', 0)
            if returned and self.settings.data.get('reconnect', True):
                self.engine.retry_outputs(returned, self.configurations())
                self.engine.retry_inputs(returned, self.input_configurations())
                self.status.setText('A reconnected device settled; its selected stream was retried once.')
        elif returned and self.audio_intent and not self.transition and self.settings.data.get('reconnect', True):
            self.retry_budget.reset()
            self.attempt_start()
        self.tray_menu()

    def save_and_apply(self):
        self.settings.save()
        if self.running:
            self.engine.configure(self.configurations())
            self.engine.configure_inputs(self.input_configurations())
            self.engine.system_delay_ms = self.settings.data.get('system_delay_ms', 0)

    def select(self, identifier, selected):
        if identifier==self.fallback_active and not selected:
            self.release_fallback()
        self.settings.output(identifier)["selected"] = selected
        if self.running:
            device = next(d for d in self.devices if d.id == identifier)
            self.perform(lambda: self.backend.mute(device, not selected or self.mutes.active('output')))
        self.perform(self.save_and_apply)
        self.tray_menu()

    def select_all(self, selected):
        if not selected:
            self.release_fallback()
            for config in self.settings.data['outputs'].values():
                config['selected'] = False
        for d in self.devices:
            if d.kind == "output":
                self.settings.output(d.id, d.default)["selected"] = selected
                if self.running:
                    self.perform(lambda device=d: self.backend.mute(device, not selected or self.mutes.active('output')))
        self.perform(self.save_and_apply)

    def toggle(self):
        if self.running:
            self.stop()
            return
        self.transition = True
        try:
            self.start_routing()
        finally:
            self.transition = False

    def start_routing(self):
        if self.settings.data.get("restore"):
            self.recover()
        configs = self.configurations()
        if not any(config["selected"] for config in configs.values()):
            if not self.start_fallback():
                raise RuntimeError("Choose at least one connected output with Play here.")
            configs = self.configurations()
        self.audio_intent = True
        snapshot = self.backend.defaults()
        capture_layout = self.capture_layout()
        bus, source = self.backend.prepare_bus(capture_layout)
        self.bus = bus
        self.settings.data["restore"] = {"defaults": snapshot, "bus": bus, 'format':self.backend.format_restore}
        self.settings.save()
        QApplication.setOverrideCursor(Qt.CursorShape.WaitCursor)
        try:
            for d in self.devices:
                if d.kind == "output" and configs[d.id]["selected"] and not self.mutes.active('output'):
                    self.backend.mute(d, False)
            for identifier, config in configs.items():
                if config['selected']:
                    self.returns.note_attempt(identifier)
            backup = self.settings.data.get('fallback_id')
            self.engine.start(source, configs, LAYOUTS[capture_layout], self.backend.capture_roles, fallback_id=backup)
            if self.engine.fallback_active:
                self.fallback_active = self.engine.fallback_active
                self.fallback_attempted.add(self.fallback_active)
                device = next(d for d in self.devices if d.id==self.fallback_active)
                self.fallback_mute_before = device.muted
                if not self.mutes.active('output'):
                    self.backend.mute(device, False)
            self.backend.set_default(bus, "output")
            if not self.backend.windows:
                self.backend.move_streams(snapshot["output"], bus)
            self.running = True
            self.route_started_at = time.monotonic()
            self.engine.configure_inputs(self.input_configurations())
            self.status.setText("Running — selected outputs receive system audio with their own EQ. If an existing app stays silent, restart its playback.")
            print('Routing started', flush=True)
            self.start_button.setText("Stop multi-output audio")
            self.refresh(True)
        except Exception:
            self.engine.stop()
            self.recover()
            raise
        finally:
            QApplication.restoreOverrideCursor()

    def recover(self, release=True):
        if self.settings.data.get("driver_setup"):
            self.setup_defaults = self.settings.data["driver_setup"]
            self.restore_after_setup()
        record = self.settings.data.get("restore")
        if record:
            if record.get('format'):
                self.backend.format_restore = record['format']
            self.backend.restore_defaults(record["defaults"], record["bus"])
            if release:
                self.backend.release_bus()
                self.settings.data["restore"] = None
                self.settings.save()

    def stop(self, preserve_intent=False):
        self.transition = True
        try:
            self.stop_routing(preserve_intent)
        finally:
            self.transition = False

    def stop_routing(self, preserve_intent=False):
        # Restore system playback first, even if a broken device hangs on close.
        if not preserve_intent:
            self.audio_intent = False
            self.retry_budget.reset()
        self.running = False
        errors = []
        try:
            self.recover(release=False)
        except Exception as exc:
            errors.append(str(exc))
        try:
            self.engine.stop()
        except Exception as exc:
            errors.append(str(exc))
        if not errors:
            try:
                self.backend.release_bus()
                self.settings.data['restore'] = None
                self.settings.save()
            except Exception as exc:
                errors.append(str(exc))
        self.release_fallback()
        self.start_button.setText("Start multi-output audio")
        self.status.setText("Stopped — previous default output restored.")
        self.signal_status.setText("Multi-output audio is stopped.")
        print('Routing stopped; cleanup pending' if errors else 'Routing stopped; defaults restored', flush=True)
        self.refresh(True)
        if errors:
            raise RuntimeError('Audio cleanup pending: '+'; '.join(errors))

    def tick(self):
        if self.setup_process and self.setup_process.poll() is not None:
            process = self.setup_process
            self.setup_process = None
            self.perform(self.restore_after_setup)
            self.status.setText("Audio driver setup finished. Your previous default devices were restored. Restart Windows to finalize the driver installation." if process.returncode == 0 else "Audio setup failed or was cancelled. Check your connection and Windows permission, then try again.")
        if self.running and self.engine.error:
            error = self.engine.error
            self.perform(lambda: self.stop(preserve_intent=True))
            scheduled = self.retry_budget.failed() if self.settings.data.get('reconnect', True) and self.audio_intent else False
            self.status.setText('Capture stopped: '+error+('. Recovery scheduled.' if scheduled else '. Click Retry selected.'))
        try:
            message = self.engine.messages.get_nowait()
            self.status.setText(message)
            print(message, flush=True)
        except queue.Empty:
            pass
        self.perform(self.refresh)
        if self.running:
            if self.route_started_at and time.monotonic()-self.route_started_at>=60:
                self.retry_budget.reset()
            active = [w for w in self.engine.workers.values() if w.is_alive() and not w.error and w.config["selected"]]
            signal = "Receiving system sound" if self.engine.peak > .0001 else "Waiting for system sound — restart playback if the app stayed on its old output"
            self.signal_status.setText(f"{signal} · "+('all outputs muted' if self.mutes.active('output') else f'{len(active)} outputs active'))
            desired = any(c.get('selected', False) for c in self.settings.data['outputs'].values())
            if desired and not active and all(w.ready.is_set() for w in self.engine.workers.values()):
                if not self.start_fallback():
                    self.perform(lambda: self.stop(preserve_intent=True))
                    self.status.setText('Outputs unavailable. Previous default restored. Waiting for a stable reconnect or Retry selected.')
            elif self.fallback_active:
                originals = [w for key, w in self.engine.workers.items() if key!=self.fallback_active and w.is_alive() and not w.error and self.settings.output(key)['selected']]
                if originals:
                    self.release_fallback()
                    self.save_and_apply()
        if not self.running and self.audio_intent and self.retry_budget.due():
            self.attempt_start()
        self.cancel_recovery_button.setVisible(not self.running and self.audio_intent)
        if not self.screenshot:
            try:
                state = dict(version=__version__, running=self.running, source_peak=self.engine.peak,
                             output_mute=self.mutes.active('output'), microphone_mute=self.mutes.active('input'),
                             outputs={w.device_name: dict(active=w.is_alive(), error=w.error, latency_ms=w.latency_ms,
                                                          delay_ms=w.config.get('delay_ms', 0), selected=w.config['selected']) for w in self.engine.workers.values()})
                temp = data_dir()/'status.tmp'
                temp.write_text(json.dumps(state, indent=2), encoding='utf-8')
                temp.replace(data_dir()/'status.json')
            except OSError:
                pass

    def driver_setup(self):
        root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
        script = root / "windows-audio-setup.ps1"
        try:
            if self.setup_process:
                return
            self.setup_defaults = self.backend.defaults()
            self.settings.data["driver_setup"] = self.setup_defaults
            self.settings.save()
            self.setup_process = subprocess.Popen(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script)],
                             creationflags=subprocess.CREATE_NO_WINDOW)
            self.status.setText("Installing VB-CABLE from VB-Audio (donationware; donations welcome). Accept Windows permission, then restart Windows when setup finishes.")
        except Exception as exc:
            self.status.setText(str(exc))

    def restore_after_setup(self):
        current = self.backend.defaults()
        virtual_ids = {d.id for d in self.backend.devices() if d.virtual}
        for key, identifier in self.setup_defaults.items():
            if current.get(key) in virtual_ids:
                kind, _, role = key.partition(":")
                self.backend.set_default(identifier, kind, role or None)
        self.settings.data["driver_setup"] = None
        self.settings.save()

    def tray_menu(self):
        signature = (self.running, self.mutes.active('output'), self.mutes.active('input'), tuple(sorted(self.scenes.catalog)), tuple((d.id, self.display_name(d), self.settings.output(d.id, d.default)["selected"]) for d in self.devices if d.kind == "output"))
        if signature == getattr(self, "tray_signature", None):
            return
        if self.tray.contextMenu() and self.tray.contextMenu().isVisible():
            return
        self.tray_signature = signature
        menu = QMenu(self)
        menu.addAction("Open sound manager", self.show_window)
        menu.addAction("Stop multi-output audio" if self.running else "Start multi-output audio", lambda: self.perform(self.toggle))
        menu.addAction('Resume outputs' if self.mutes.active('output') else 'Mute all outputs', lambda: self.perform(lambda: self.group_mute('output', not self.mutes.active('output'))))
        menu.addAction('Restore microphones' if self.mutes.active('input') else 'Mute all microphones', lambda: self.perform(lambda: self.group_mute('input', not self.mutes.active('input'))))
        menu.addSeparator()
        for device in self.devices:
            if device.kind != "output":
                continue
            action = QAction(self.display_name(device), menu)
            action.setCheckable(True)
            action.setChecked(self.settings.output(device.id, device.default)["selected"])
            action.toggled.connect(lambda checked, identifier=device.id: self.select(identifier, checked))
            menu.addAction(action)
        menu.addSeparator()
        scene_menu = menu.addMenu('Audio scenes')
        scene_menu.addAction('Manage scenes', self.scenes.show)
        for name in sorted(self.scenes.catalog, key=str.casefold):
            scene_menu.addAction(name, lambda selected=name: self.perform(lambda: self.scenes.apply(selected)))
        scene_menu.addAction('Previous mix', lambda: self.perform(self.scenes.restore_previous)).setEnabled(self.scenes.previous is not None)
        menu.addAction('Backup / restore setup', self.backups.show)
        menu.addAction('Check for updates', lambda: self.updater.check(manual=True))
        menu.addAction("Quit", self.quit)
        previous = self.tray.contextMenu()
        self.tray.setContextMenu(menu)
        if previous:
            previous.deleteLater()

    def show_window(self):
        self.showNormal()
        self.raise_()
        self.activateWindow()

    def quit(self):
        if self.setup_process:
            self.status.setText("Wait for audio driver setup to finish before quitting.")
            self.show_window()
            return
        try:
            self.stop() if self.running else self.recover()
            self.settings.save()
        except Exception as exc:
            self.status.setText("Could not finish audio cleanup: "+str(exc))
            return
        self.quitting = True
        self.tray.hide()
        QApplication.instance().quit()

    def closeEvent(self, event):
        if self.quitting or self.screenshot:
            event.accept()
        elif self.tray.isVisible():
            self.hide()
            event.ignore()
        else:
            self.quit()
            event.accept() if self.quitting else event.ignore()
