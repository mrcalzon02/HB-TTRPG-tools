"""Named mix recall, tray actions and a one-step A/B return to the previous mix."""
import copy
import json
from pathlib import Path
from PySide6.QtWidgets import QCheckBox, QComboBox, QDialog, QFileDialog, QHBoxLayout, QInputDialog, QLabel, QPushButton, QVBoxLayout
from .scenes import capture_scene, validate_scene, apply_scene_settings
from .channels import LAYOUTS

class SceneController:
    def __init__(self, window):
        self.window = window
        self.previous = None
        self.dialog = None

    @property
    def catalog(self):
        return self.window.settings.data.setdefault('scenes', {})

    def show(self):
        if self.dialog is None:
            self.dialog = SceneDialog(self)
        self.dialog.refresh()
        self.dialog.show()
        self.dialog.raise_()
        self.dialog.activateWindow()

    def capture(self):
        return capture_scene(self.window.settings, self.window.backend.devices(), self.window.mutes)

    def store(self, name, value):
        name = name.strip()
        if not name or len(name)>80:
            raise ValueError('Use a scene name from 1 to 80 characters')
        value = validate_scene(value)
        if name not in self.catalog and len(self.catalog)>=64:
            raise ValueError('The 64-scene limit has been reached')
        self.catalog[name] = copy.deepcopy(value)
        self.window.settings.save()
        self.changed()

    def changed(self):
        self.window.tray_signature = None
        if self.dialog:
            self.dialog.refresh()

    def apply(self, name=None, value=None):
        window = self.window
        if window.setup_process:
            raise RuntimeError('Wait for audio driver setup before switching scenes')
        if value is None and name not in self.catalog:
            raise RuntimeError('That saved scene is no longer available')
        scene = validate_scene(value if value is not None else self.catalog[name])
        available = {d.id: d for d in window.devices}
        for identifier, item in scene['devices'].items():
            if identifier in available and item['kind'] != available[identifier].kind:
                raise ValueError('Scene device type does not match current hardware')
        previous = self.capture()
        was_running, old_layout = window.running, window.capture_layout()
        self.previous = previous
        window.retry_budget.reset()
        window.fallback_attempted.clear()
        window.release_fallback()
        apply_scene_settings(window.settings, scene, window.settings.data.get('scene_restore_inputs', False))
        adapted = 0
        for identifier, item in scene['devices'].items():
            device = available.get(identifier)
            if device and device.kind == 'output':
                config = window.settings.output(identifier)
                if config['mode'] != 'Auto' and len(LAYOUTS[config['mode']]) > len(device.channels):
                    config['mode'] = 'Auto'
                    adapted += 1
            if item['muted'] is not None and window.mutes.active(item['kind']):
                window.mutes.state[item['kind']]['before'][identifier] = item['muted']
            if not device and item['config'].get('selected'):
                window.returns.expect_missing(identifier)
        for control, value in ((window.layout, scene['layout']), (window.bypass_eq, scene['bypass_eq']), (window.system_delay, round(scene['system_delay_ms']))):
            control.blockSignals(True)
            control.setCurrentText(value) if control is window.layout else control.setChecked(value) if control is window.bypass_eq else control.setValue(value)
            control.blockSignals(False)
        window.system_delay_label.setText(f"{round(scene['system_delay_ms'])} ms")
        window.settings.save()
        self.changed()
        if was_running and window.capture_layout() != old_layout:
            window.stop()
            window.toggle()
        else:
            window.save_and_apply()
            if was_running:
                window.engine.retry_outputs([key for key, cfg in window.configurations().items() if cfg['selected']], window.configurations())
                if window.settings.data.get('scene_restore_inputs', False):
                    window.engine.retry_inputs(list(window.input_configurations()), window.input_configurations())
        errors = []
        for identifier, item in scene['devices'].items():
            device = available.get(identifier)
            if not device:
                continue
            try:
                if item['volume'] is not None:
                    window.backend.volume(device, item['volume'])
                if item['muted'] is not None:
                    window.backend.mute(device, item['muted'] or window.mutes.active(device.kind))
            except Exception as exc:
                errors.append(device.name+': '+str(exc))
        window.refresh(True)
        from .eq_ui import EqDialog
        from .settings import eq_profile
        for dialog in window.findChildren(EqDialog):
            if dialog.device.id in scene['devices']:
                dialog.apply(eq_profile(window.settings.device(dialog.device)))
        missing = sum(identifier not in available for identifier in scene['devices'])
        message = ('Applied '+name if name else 'Restored previous mix')+'.'
        if missing:
            message += f' {missing} saved devices are offline; reapply when connected to restore their native levels.'
        if adapted:
            message += f' {adapted} output layouts adapted to current channel counts.'
        if errors:
            message += ' Some endpoint controls failed: '+'; '.join(errors)
        if not window.running:
            message += ' Audio routing is stopped.'
        window.status.setText(message)

    def restore_previous(self):
        if self.previous is None:
            raise RuntimeError('Apply a scene first to capture the previous mix')
        self.apply(value=self.previous)

class SceneDialog(QDialog):
    def __init__(self, controller):
        super().__init__(controller.window)
        self.controller = controller
        self.setWindowTitle('Audio scenes')
        self.resize(640, 310)
        layout = QVBoxLayout(self)
        note = QLabel('Save and recall output selection, native volumes/mutes, EQ, delays, PCM layout and backup output. Waveform choices, mute groups, startup and recovery settings stay separate. Routing keeps its current on/off state.')
        note.setWordWrap(True)
        layout.addWidget(note)
        self.choice = QComboBox()
        layout.addWidget(self.choice)
        self.inputs = QCheckBox('Also restore microphone Listen / Meter switches')
        self.inputs.setChecked(controller.window.settings.data.get('scene_restore_inputs', False))
        self.inputs.setToolTip('Off preserves your current capture switches. Turning it on lets a recalled scene enable microphone capture or monitoring.')
        self.inputs.toggled.connect(self.input_policy)
        layout.addWidget(self.inputs)
        row = QHBoxLayout()
        self.apply_button = QPushButton('Apply scene')
        self.apply_button.clicked.connect(lambda: self.perform(lambda: controller.apply(self.choice.currentText())))
        row.addWidget(self.apply_button)
        save = QPushButton('Save / update current')
        save.clicked.connect(self.save_current)
        row.addWidget(save)
        self.previous_button = QPushButton('Previous mix')
        self.previous_button.clicked.connect(lambda: self.perform(controller.restore_previous))
        row.addWidget(self.previous_button)
        layout.addLayout(row)
        tools = QHBoxLayout()
        self.selection_tools = []
        for text, action in (('Rename', self.rename), ('Delete', self.delete), ('Import scene', self.import_scene), ('Export scene', self.export_scene)):
            button = QPushButton(text)
            button.clicked.connect(action)
            tools.addWidget(button)
            if text != 'Import scene':
                self.selection_tools.append(button)
        layout.addLayout(tools)
        self.summary = QLabel()
        self.summary.setWordWrap(True)
        layout.addWidget(self.summary)
        self.choice.currentTextChanged.connect(self.describe)
        self.refresh()

    def input_policy(self, enabled):
        self.controller.window.settings.data['scene_restore_inputs'] = enabled
        self.controller.window.settings.save()

    def perform(self, action):
        self.controller.window.perform(action)
        self.refresh()
        self.summary.setText(self.controller.window.status.text())

    def refresh(self):
        selected = self.choice.currentText()
        self.choice.blockSignals(True)
        self.choice.clear()
        self.choice.addItems(sorted(self.controller.catalog, key=str.casefold))
        if selected in self.controller.catalog:
            self.choice.setCurrentText(selected)
        self.choice.blockSignals(False)
        self.apply_button.setEnabled(bool(self.controller.catalog))
        for button in self.selection_tools:
            button.setEnabled(bool(self.controller.catalog))
        self.previous_button.setEnabled(self.controller.previous is not None)
        self.describe()

    def describe(self, *_):
        value = self.controller.catalog.get(self.choice.currentText())
        if value:
            try:
                scene = validate_scene(value)
                names = [d['name'] for d in scene['devices'].values() if d['kind']=='output' and d['config']['selected']]
                self.summary.setText('Play here: '+(', '.join(names) or 'No outputs selected')+' · '+scene['layout'])
            except ValueError as exc:
                self.summary.setText(str(exc))
        else:
            self.summary.setText('Configure your mix, then save your first scene.')

    def save_current(self):
        name, accepted = QInputDialog.getText(self, 'Save current mix', 'Scene name (an existing name updates that scene)', text=self.choice.currentText())
        if accepted:
            self.perform(lambda: self.controller.store(name, self.controller.capture()))
            self.choice.setCurrentText(name.strip())

    def rename(self):
        old = self.choice.currentText()
        if old not in self.controller.catalog:
            return
        name, accepted = QInputDialog.getText(self, 'Rename scene', 'New name', text=old)
        if accepted and name.strip() != old:
            def change():
                if not name.strip() or len(name.strip())>80:
                    raise ValueError('Use a scene name from 1 to 80 characters')
                if name.strip() in self.controller.catalog:
                    raise ValueError('That scene name already exists')
                self.controller.catalog[name.strip()] = validate_scene(self.controller.catalog[old])
                self.controller.catalog.pop(old)
                self.controller.window.settings.save()
                self.controller.changed()
            self.perform(change)
            self.choice.setCurrentText(name.strip())

    def delete(self):
        name = self.choice.currentText()
        if name in self.controller.catalog:
            self.controller.catalog.pop(name)
            self.controller.window.settings.save()
            self.controller.changed()

    def import_scene(self):
        path, _ = QFileDialog.getOpenFileName(self, 'Import audio scene', '', 'Audio scene (*.json)')
        if path:
            def load():
                file = Path(path)
                if file.stat().st_size>2*1024*1024:
                    raise ValueError('Scene file exceeds 2 MiB')
                data = json.loads(file.read_text(encoding='utf-8'))
                name = file.stem[:80]
                index = 2
                while name in self.controller.catalog:
                    name = file.stem[:70]+f' ({index})'
                    index += 1
                self.controller.store(name, data)
            self.perform(load)

    def export_scene(self):
        name = self.choice.currentText()
        if name not in self.controller.catalog:
            return
        path, _ = QFileDialog.getSaveFileName(self, 'Export audio scene', 'audio-scene.json', 'Audio scene (*.json)')
        if path:
            self.perform(lambda: Path(path).write_text(json.dumps(validate_scene(self.controller.catalog[name]), indent=2), encoding='utf-8'))
