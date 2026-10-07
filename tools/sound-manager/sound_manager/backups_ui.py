"""Backup export and previewed restore, with a pre-restore safety snapshot."""
import json
import re
from pathlib import Path
import uuid
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QCheckBox, QComboBox, QDialog, QFileDialog, QFormLayout, QHBoxLayout, QLabel, QPushButton, QScrollArea, QVBoxLayout, QWidget
from .backups import MAX_FILE_BYTES, capture_backup, validate_backup, identities_for, suggest_mapping, remap_backup
from .settings import data_dir

def write_backup(path, value):
    text = json.dumps(validate_backup(value), indent=2, ensure_ascii=False, allow_nan=False)
    if len(text.encode('utf-8')) > MAX_FILE_BYTES:
        raise ValueError('Setup backup exceeds 16 MiB')
    path = Path(path)
    temp = path.with_name(path.name+'.'+uuid.uuid4().hex+'.tmp')
    temp.write_text(text, encoding='utf-8')
    temp.replace(path)

class BackupController:
    def __init__(self, window):
        self.window = window
        self.dialog = None
        self.last_safety = None
        saved = window.settings.data.get('last_backup_safety', '')
        if isinstance(saved, str) and re.fullmatch(r'before-restore-[a-f0-9]{32}\.json', saved):
            candidate = data_dir()/'backups'/saved
            if candidate.is_file():
                self.last_safety = candidate

    def capture(self):
        return capture_backup(self.window.settings, self.window.backend.devices(), self.window.mutes)

    def show(self):
        if self.dialog is None:
            self.dialog = BackupDialog(self)
        self.dialog.show()
        self.dialog.raise_()
        self.dialog.activateWindow()

    def restore(self, value, mapping, restore_capture=False):
        window = self.window
        if window.setup_process:
            raise RuntimeError('Wait for driver setup before restoring settings')
        restored = remap_backup(value, mapping, window.devices)
        # Validate everything and save the recoverable old setup first.
        safety = self.capture()
        folder = data_dir()/'backups'
        folder.mkdir(parents=True, exist_ok=True)
        safety_path = folder/('before-restore-'+uuid.uuid4().hex+'.json')
        write_backup(safety_path, safety)
        self.last_safety = safety_path
        window.settings.data['last_backup_safety'] = safety_path.name
        window.settings.data['profiles'] = restored['profiles']
        window.settings.data['scenes'] = restored['scenes']
        descriptions = identities_for(restored['current'], restored['scenes'])
        for identifier, display in restored['display'].items():
            kind = descriptions[identifier]['kind']
            config = window.settings.output(identifier) if kind=='output' else window.settings.input(identifier)
            config.update(waveform=display['waveform'], eq_view=display['eq_view'])
            window.settings.preference(identifier).update(alias=display['alias'], favorite=display['favorite'], hidden=display['hidden'], order=display['order'])
        window.settings.data.update(restored['preferences'])
        final_mic_policy = restored['preferences']['scene_restore_inputs'] if restore_capture else False
        window.settings.data['scene_restore_inputs'] = bool(restore_capture)
        window.waveform_freezes.clear()
        for control, key in ((window.auto_checkbox,'auto_start'), (window.reconnect_checkbox,'reconnect'), (window.advanced_button,'advanced_visible')):
            control.blockSignals(True)
            control.setChecked(window.settings.data[key])
            control.blockSignals(False)
        window.format_panel.setVisible(window.settings.data['advanced_visible'])
        window.settings.save()
        window.scenes.changed()
        try:
            window.scenes.apply(name='backup mix', value=restored['current'])
        finally:
            window.settings.data['scene_restore_inputs'] = final_mic_policy
            window.settings.save()
            if window.scenes.dialog:
                window.scenes.dialog.inputs.blockSignals(True)
                window.scenes.dialog.inputs.setChecked(final_mic_policy)
                window.scenes.dialog.inputs.blockSignals(False)
        if not window.settings.data['reconnect'] and not window.running:
            window.cancel_recovery()
        window.refresh(True)
        from .eq_ui import EqDialog
        for dialog in window.findChildren(EqDialog):
            config = window.settings.device(dialog.device)
            for control, checked in ((dialog.waveform_switch, config.get('waveform', True)), (dialog.freeze_switch, False)):
                control.blockSignals(True)
                control.setChecked(checked)
                control.blockSignals(False)
            dialog.freeze_switch.setEnabled(config.get('waveform', True))
            dialog.display_mode.blockSignals(True)
            dialog.display_mode.setCurrentIndex(1 if config.get('eq_view')=='Live waveform' else 0)
            dialog.display_mode.blockSignals(False)
            dialog.live_waveform.set_display_enabled(config.get('waveform', True))
            dialog.select_display(dialog.display_mode.currentIndex(), save=False)
        if window.updater.dialog:
            window.updater.dialog.automatic.blockSignals(True)
            window.updater.dialog.automatic.setChecked(window.settings.data['check_updates'])
            window.updater.dialog.automatic.blockSignals(False)
        window.status.setText('Setup restored. '+window.status.text()+f' Pre-restore copy: {self.last_safety}')
        return self.last_safety

class BackupDialog(QDialog):
    def __init__(self, controller):
        super().__init__(controller.window)
        self.controller = controller
        self.loaded = None
        self.rows = {}
        self.setWindowTitle('Backup / restore setup')
        self.resize(760, 540)
        layout = QVBoxLayout(self)
        note = QLabel('Back up the current mix, EQ profiles, scenes, labels, pinned devices and display preferences. Restore replaces the saved scene/profile catalogs and applies the mapped mix. Review each device below. Login registration, driver setup, recovery records and mute groups are never imported.')
        note.setWordWrap(True)
        layout.addWidget(note)
        actions = QHBoxLayout()
        export = QPushButton('Export setup')
        export.clicked.connect(self.export)
        actions.addWidget(export)
        load = QPushButton('Load backup')
        load.clicked.connect(self.load)
        actions.addWidget(load)
        self.safety = QPushButton('Open pre-restore copy')
        self.safety.setEnabled(controller.last_safety is not None)
        self.safety.clicked.connect(lambda: self.load_path(controller.last_safety))
        actions.addWidget(self.safety)
        layout.addLayout(actions)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        self.mapping_body = QWidget()
        self.mapping_form = QFormLayout(self.mapping_body)
        scroll.setWidget(self.mapping_body)
        layout.addWidget(scroll, 1)
        self.microphones = QCheckBox('Restore saved microphone Listen / Meter switches')
        self.microphones.setToolTip('Off preserves current capture switches and resets scene mic-restore policy to off. On may enable saved microphone capture/monitoring and restore that policy.')
        layout.addWidget(self.microphones)
        self.restore_button = QPushButton('Restore reviewed setup')
        self.restore_button.setEnabled(False)
        self.restore_button.clicked.connect(self.restore)
        layout.addWidget(self.restore_button)
        self.message = QLabel('Load a backup to review device mappings. Nothing changes until you click Restore.')
        self.message.setTextFormat(Qt.TextFormat.PlainText)
        self.message.setWordWrap(True)
        layout.addWidget(self.message)

    def export(self):
        path, _ = QFileDialog.getSaveFileName(self, 'Export setup backup', 'sound-manager-backup.json', 'Setup backup (*.json)')
        if path:
            self.perform(lambda: write_backup(path, self.controller.capture()), 'Setup backup exported.')

    def load(self):
        path, _ = QFileDialog.getOpenFileName(self, 'Load setup backup', '', 'Setup backup (*.json)')
        if path:
            self.load_path(path)

    def load_path(self, path):
        if not path:
            return
        self.loaded = None
        self.restore_button.setEnabled(False)
        def load():
            file = Path(path)
            if file.stat().st_size > MAX_FILE_BYTES:
                raise ValueError('Backup exceeds 16 MiB')
            value = validate_backup(json.loads(file.read_text(encoding='utf-8-sig')))
            devices = self.controller.window.devices
            suggested = suggest_mapping(value, devices)
            while self.mapping_form.rowCount():
                self.mapping_form.removeRow(0)
            self.rows.clear()
            for identifier, description in identities_for(value['current'], value['scenes']).items():
                label = QLabel(description['kind'].title()+' · '+description['name'])
                label.setTextFormat(Qt.TextFormat.PlainText)
                label.setWordWrap(True)
                label.setToolTip(identifier)
                choice = QComboBox()
                choice.addItem('Skip this saved device', None)
                choice.addItem('Keep its saved ID (offline if missing)', identifier)
                for device in devices:
                    if device.kind==description['kind'] and not device.virtual and device.id!=identifier:
                        choice.addItem(self.controller.window.display_name(device), device.id)
                matching = next((d for d in devices if d.id==identifier and d.kind==description['kind']), None)
                if matching:
                    choice.setItemText(1, self.controller.window.display_name(matching)+' (same ID)')
                selected = suggested[identifier] if suggested[identifier] is not None else identifier
                choice.setCurrentIndex(next(i for i in range(choice.count()) if choice.itemData(i)==selected))
                choice.currentIndexChanged.connect(self.preview)
                self.rows[identifier] = choice
                self.mapping_form.addRow(label, choice)
            self.loaded = value
            self.microphones.setChecked(False)
            self.preview()
        self.perform(load)

    def preview(self, *_):
        if self.loaded is None:
            return
        try:
            mapped = remap_backup(self.loaded, self.mapping(), self.controller.window.devices)
            available = {d.id for d in self.controller.window.devices}
            connected = sum(key in available for key in mapped['current']['devices'])
            selected = sum(d['kind']=='output' and d['config']['selected'] for d in mapped['current']['devices'].values())
            self.message.setText(f'{connected} current-mix devices connected · {selected} saved outputs selected · {len(mapped["scenes"])} scenes · {len(mapped["profiles"])} EQ profiles. A local pre-restore copy will be saved. Unmatched IDs remain offline unless mapped or skipped.')
            self.restore_button.setEnabled(True)
        except ValueError as exc:
            self.message.setText(str(exc))
            self.restore_button.setEnabled(False)

    def mapping(self):
        return {identifier:choice.currentData() for identifier,choice in self.rows.items()}

    def restore(self):
        def restore():
            self.controller.restore(self.loaded, self.mapping(), self.microphones.isChecked())
            self.safety.setEnabled(True)
        self.perform(restore)

    def perform(self, action, success=None):
        try:
            action()
            if success:
                self.message.setText(success)
            elif action.__name__ == 'restore':
                self.message.setText(self.controller.window.status.text())
        except Exception as exc:
            self.message.setText(str(exc))
            self.safety.setEnabled(self.controller.last_safety is not None)
