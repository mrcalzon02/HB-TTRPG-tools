"""Live per-output graphic / parametric EQ and reusable local profiles."""
import json
import math
from pathlib import Path
import numpy as np
from scipy.signal import sosfreqz
from PySide6.QtCore import Qt, QPointF, QPoint
from PySide6.QtGui import QPainter, QColor, QPen, QPolygonF
from PySide6.QtWidgets import (QCheckBox, QComboBox, QDialog, QDoubleSpinBox,
    QFileDialog, QFormLayout, QHBoxLayout, QInputDialog, QLabel, QPushButton,
    QScrollArea, QSlider, QStackedWidget, QStyle, QStyleOptionSlider, QTabWidget, QVBoxLayout, QWidget)
from .dsp import FREQUENCIES, CLASSIC_FREQUENCIES, PRESETS, FILTER_TYPES, filter_chain
from .settings import eq_profile, validate_profile
from .waveform import WaveformWidget
from .controls import EqHistory

class BandGrid(QWidget):
    """Graduated dB guides aligned to the slider handle travel, at any size."""
    def __init__(self, maximum, step):
        super().__init__()
        self.maximum, self.step = maximum, step
        self.reference_slider = None
        self.bands = QHBoxLayout(self)
        self.bands.setContentsMargins(44, 0, 8, 0)

    def paintEvent(self, event):
        super().paintEvent(event)
        slider = self.reference_slider
        if slider is None:
            return
        option = QStyleOptionSlider()
        slider.initStyleOption(option)
        positions = []
        for value in (slider.maximum(), slider.minimum()):
            option.sliderPosition = option.sliderValue = value
            handle = slider.style().subControlRect(QStyle.ComplexControl.CC_Slider, option, QStyle.SubControl.SC_SliderHandle, slider)
            positions.append(slider.mapTo(self, QPoint(0, handle.center().y())).y())
        top, bottom = positions
        painter = QPainter(self)
        for level in range(-self.maximum, self.maximum+1, self.step):
            y = bottom-(level+self.maximum)/(2*self.maximum)*(bottom-top)
            painter.setPen(QPen(QColor('#718197' if level == 0 else '#374357'), 1))
            painter.drawLine(QPointF(41, y), QPointF(self.width()-8, y))
            painter.setPen(QColor('#c6d0df' if level == 0 else '#96a5bc'))
            painter.drawText(1, round(y)+4, f'{level:+d}' if level else '0 dB')

class ResponseCurve(QWidget):
    def __init__(self, config):
        super().__init__()
        self.config = config
        self.setMinimumHeight(150)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        left, top, width, height = 44, 10, self.width()-62, self.height()-34
        def x(frequency):
            return left+math.log10(frequency/20)/3*width
        def y(gain):
            return top+(24-max(-24, min(24, gain)))/48*height
        painter.setPen(QPen(QColor('#3a4658'), 1))
        for gain in (-24, -12, 0, 12, 24):
            painter.setPen(QPen(QColor('#3a4658'), 1))
            painter.drawLine(QPointF(left, y(gain)), QPointF(left+width, y(gain)))
            painter.setPen(QColor('#a7b2c5'))
            painter.drawText(1, round(y(gain))+4, f'{gain:+d}')
        for frequency in (20, 100, 1000, 10000, 20000):
            painter.setPen(QPen(QColor('#3a4658'), 1))
            painter.drawLine(QPointF(x(frequency), top), QPointF(x(frequency), top+height))
            painter.setPen(QColor('#a7b2c5'))
            painter.drawText(round(x(frequency))-12, self.height()-3, str(frequency) if frequency<1000 else f'{frequency//1000}k')
        frequencies = np.geomspace(20, 20000, 512)
        _, response = sosfreqz(filter_chain(self.config), worN=frequencies, fs=48000)
        gains = 20*np.log10(np.maximum(abs(response), 1e-10))+self.config['preamp']
        if not self.config['eq']:
            gains = np.full_like(gains, self.config['preamp'])
        painter.setPen(QPen(QColor('#64dbc2'), 2))
        painter.drawPolyline(QPolygonF([QPointF(x(f), y(g)) for f, g in zip(frequencies, gains)]))

class EqDialog(QDialog):
    def __init__(self, window, device):
        super().__init__(window)
        self.window, self.device = window, device
        self.config = window.settings.device(device)
        self.history = window.eq_histories.setdefault(device.id, EqHistory(eq_profile(self.config)))
        self.history.record(eq_profile(self.config))
        self.replaying = False
        self.loading = True
        self.setWindowTitle('Equalizer — '+window.display_name(device))
        self.resize(1120, 850)
        layout = QVBoxLayout(self)
        heading = QLabel(window.display_name(device))
        heading.setStyleSheet('font-size: 18px; font-weight: 600;')
        layout.addWidget(heading)
        self.message = QLabel('Bass, mids, and treble for this device. Input EQ affects Listen monitoring and its meter.')
        if window.settings.data.get('bypass_eq', False):
            self.message.setText('Global EQ bypass is on. You can edit saved EQ here; turn off Bypass all EQ in the main window to hear it.')
        self.message.setWordWrap(True)
        self.message.setObjectName('note')
        layout.addWidget(self.message)
        editing = QHBoxLayout()
        self.undo_button, self.redo_button = QPushButton('Undo'), QPushButton('Redo')
        self.undo_button.clicked.connect(self.undo)
        self.redo_button.clicked.connect(self.redo)
        editing.addWidget(self.undo_button)
        editing.addWidget(self.redo_button)
        editing.addWidget(QLabel('Display'))
        self.display_mode = QComboBox()
        self.display_mode.addItems(['EQ controls', 'Live waveform'])
        self.display_mode.setToolTip('Switch the advanced EQ controls to a larger live waveform for this device.')
        editing.addWidget(self.display_mode)
        self.waveform_switch = QCheckBox('Waveform')
        self.waveform_switch.setChecked(self.config.get('waveform', True))
        self.waveform_switch.setToolTip('Saved for this device, including its main-window card. Does not enable microphone capture.')
        editing.addWidget(self.waveform_switch)
        editing.addStretch()
        layout.addLayout(editing)
        if device.kind == 'input':
            meter = QCheckBox('Live input meter')
            meter.setChecked(self.config['meter'])
            meter.setToolTip('Capture this microphone for its waveform. Bluetooth microphones may switch the headset into call mode.')
            meter.toggled.connect(lambda checked: window.meter_input(device.id, checked))
            layout.addWidget(meter)
        controls = QHBoxLayout()
        self.enabled = QCheckBox('EQ enabled')
        self.enabled.setChecked(self.config['eq'])
        self.enabled.toggled.connect(self.changed)
        controls.addWidget(self.enabled)
        self.protect = QCheckBox('Automatic headroom')
        self.protect.setChecked(self.config['protect'])
        self.protect.toggled.connect(self.changed)
        self.protect.setToolTip('Reduces level when boosted frequencies would exceed full scale.')
        controls.addWidget(self.protect)
        controls.addWidget(QLabel('Preamp'))
        self.preamp = self.spin(-24, 12, self.config['preamp'], .1, ' dB')
        self.preamp.valueChanged.connect(self.changed)
        controls.addWidget(self.preamp)
        controls.addWidget(QLabel('Balance L / R'))
        self.balance = self.spin(-100, 100, self.config['balance'], 1, '')
        self.balance.valueChanged.connect(self.changed)
        controls.addWidget(self.balance)
        layout.addLayout(controls)
        self.curve = ResponseCurve(self.config)
        layout.addWidget(self.curve)
        self.headroom = QLabel()
        self.headroom.setObjectName('note')
        layout.addWidget(self.headroom)
        tabs = QTabWidget()
        classic = QWidget()
        classic_layout = QVBoxLayout(classic)
        tone_row = QHBoxLayout()
        self.tone_values = []
        for name, gain in zip(('Bass', 'Mid', 'Treble'), self.config['tones']):
            tone_row.addWidget(QLabel(name))
            slider = QSlider(Qt.Orientation.Horizontal)
            slider.setRange(-120, 120)
            slider.setValue(round(gain*10))
            value = self.spin(-12, 12, gain, .1, ' dB')
            slider.valueChanged.connect(lambda n, spin=value: spin.setValue(n/10))
            value.valueChanged.connect(lambda n, control=slider: control.setValue(round(n*10)))
            value.valueChanged.connect(self.changed)
            self.tone_values.append(value)
            tone_row.addWidget(slider, 1)
            tone_row.addWidget(value)
        classic_layout.addLayout(tone_row)
        regions = QHBoxLayout()
        for name, count in (('Sub bass', 2), ('Bass', 4), ('Low mids', 2), ('Mids', 2), ('Upper mids', 2), ('Treble / brilliance', 3)):
            region = QLabel(name)
            region.setAlignment(Qt.AlignmentFlag.AlignCenter)
            regions.addWidget(region, count)
        classic_layout.addLayout(regions)
        self.classic_grid = BandGrid(12, 3)
        classic_row = self.classic_grid.bands
        self.classic_values = []
        for frequency, gain in zip(CLASSIC_FREQUENCIES, self.config['classic_gains']):
            column = QVBoxLayout()
            value = self.spin(-12, 12, gain, .1, '')
            value.setMinimumWidth(52)
            slider = QSlider(Qt.Orientation.Vertical)
            slider.setStyleSheet('QSlider { background: transparent; }')
            self.classic_grid.reference_slider = slider
            slider.setRange(-120, 120)
            slider.setValue(round(gain*10))
            slider.setTickInterval(30)
            slider.setTickPosition(QSlider.TickPosition.TicksBothSides)
            slider.setMinimumHeight(170)
            slider.valueChanged.connect(lambda n, spin=value: spin.setValue(n/10))
            value.valueChanged.connect(lambda n, control=slider: control.setValue(round(n*10)))
            value.valueChanged.connect(self.changed)
            self.classic_values.append(value)
            column.addWidget(value)
            column.addWidget(slider, 1, Qt.AlignmentFlag.AlignHCenter)
            label = QLabel(str(frequency) if frequency<1000 else f'{frequency/1000:g}k')
            label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            column.addWidget(label)
            classic_row.addLayout(column)
        classic_layout.addWidget(self.classic_grid, 1)
        tabs.addTab(classic, 'Classic equalizer')
        graphic = QWidget()
        graphic_layout = QVBoxLayout(graphic)
        self.graphic_grid = BandGrid(24, 6)
        row = self.graphic_grid.bands
        self.sliders, self.values = [], []
        for frequency, gain in zip(FREQUENCIES, self.config['gains']):
            column = QVBoxLayout()
            value = self.spin(-24, 24, gain, .1, ' dB')
            value.setMinimumWidth(72)
            slider = QSlider(Qt.Orientation.Vertical)
            slider.setStyleSheet('QSlider { background: transparent; }')
            self.graphic_grid.reference_slider = slider
            slider.setRange(-240, 240)
            slider.setValue(round(gain*10))
            slider.setTickInterval(60)
            slider.setMinimumHeight(145)
            slider.valueChanged.connect(lambda n, spin=value: spin.setValue(n/10))
            value.valueChanged.connect(lambda n, control=slider: control.setValue(round(n*10)))
            value.valueChanged.connect(self.changed)
            self.sliders.append(slider)
            self.values.append(value)
            column.addWidget(value)
            column.addWidget(slider, 1, Qt.AlignmentFlag.AlignHCenter)
            label = QLabel(str(frequency) if frequency<1000 else f'{frequency//1000}k')
            label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            column.addWidget(label)
            row.addLayout(column)
        graphic_layout.addWidget(self.graphic_grid, 1)
        tabs.addTab(graphic, 'Earlier band settings')
        parametric = QWidget()
        parametric_layout = QVBoxLayout(parametric)
        header = QHBoxLayout()
        header.setContentsMargins(9, 0, 9, 0)
        for text, width in (('On', 24), ('Filter type', 160), ('Frequency (Hz)', None), ('Gain (dB)', None), ('Q / bandwidth', None), ('', 90)):
            label = QLabel(text)
            if width:
                label.setFixedWidth(width)
                header.addWidget(label)
            else:
                header.addWidget(label, 1)
        parametric_layout.addLayout(header)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        content = QWidget()
        self.filter_layout = QVBoxLayout(content)
        self.filter_layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        self.filter_rows = []
        scroll.setWidget(content)
        parametric_layout.addWidget(scroll)
        add = QPushButton('Add filter')
        add.clicked.connect(lambda: self.add_filter())
        parametric_layout.addWidget(add)
        tabs.addTab(parametric, 'Parametric EQ')
        self.display_stack = QStackedWidget()
        self.display_stack.addWidget(tabs)
        live_page = QWidget()
        live_layout = QVBoxLayout(live_page)
        self.live_waveform = WaveformWidget(window, device)
        self.live_waveform.setMinimumHeight(280)
        self.waveform_hidden_note = QLabel('Waveform is hidden for this device. Turn on Waveform above to show it. Microphone capture still requires Meter or Listen.')
        self.waveform_hidden_note.setWordWrap(True)
        live_layout.addWidget(self.live_waveform, 1)
        live_layout.addWidget(self.waveform_hidden_note)
        self.display_stack.addWidget(live_page)
        layout.addWidget(self.display_stack, 1)
        self.display_mode.setCurrentIndex(1 if self.config.get('eq_view') == 'Live waveform' else 0)
        self.display_mode.currentIndexChanged.connect(self.select_display)
        self.waveform_switch.toggled.connect(self.show_waveform)
        self.select_display(self.display_mode.currentIndex(), save=False)
        for item in self.config['filters']:
            self.add_filter(item)
        presets = QHBoxLayout()
        self.presets = QComboBox()
        self.reload_presets()
        self.presets.activated.connect(lambda i: self.preset(self.presets.itemText(i)))
        presets.addWidget(self.presets, 1)
        for label, callback in (('Save profile', self.save_profile), ('Import', self.import_profile), ('Export', self.export_profile), ('Reset EQ', self.reset)):
            button = QPushButton(label)
            button.clicked.connect(callback)
            presets.addWidget(button)
        layout.addLayout(presets)
        copy_row = QHBoxLayout()
        self.destination = QComboBox()
        self.destination.addItem('Copy EQ to another device…', None)
        for output in window.devices:
            if output.id != device.id:
                self.destination.addItem(f'{output.kind.title()} · {output.name}', output)
        copy_row.addWidget(self.destination, 1)
        copy_button = QPushButton('Copy')
        copy_button.clicked.connect(self.copy_to_output)
        copy_row.addWidget(copy_button)
        done = QPushButton('Done')
        done.clicked.connect(self.accept)
        copy_row.addWidget(done)
        layout.addLayout(copy_row)
        self.loading = False
        self.update_curve()

    def select_display(self, index, save=True):
        self.display_stack.setCurrentIndex(index)
        self.curve.setVisible(index == 0)
        self.headroom.setVisible(index == 0)
        self.waveform_hidden_note.setVisible(not self.config.get('waveform', True))
        if save:
            self.config['eq_view'] = self.display_mode.currentText()
            self.window.settings.save()

    def show_waveform(self, enabled):
        self.window.set_waveform(self.device, enabled)
        self.waveform_hidden_note.setVisible(not enabled)

    @staticmethod
    def spin(low, high, value, step, suffix):
        spin = QDoubleSpinBox()
        spin.setRange(low, high)
        spin.setDecimals(3 if step < .1 else 1 if step < 1 else 0)
        spin.setSingleStep(step)
        spin.setSuffix(suffix)
        spin.setValue(value)
        return spin

    def changed(self, *_):
        if self.loading:
            return
        self.config.update(eq=self.enabled.isChecked(), protect=self.protect.isChecked(),
                           preamp=self.preamp.value(), balance=self.balance.value(),
                           gains=[spin.value() for spin in self.values],
                           classic_gains=[spin.value() for spin in self.classic_values], tones=[spin.value() for spin in self.tone_values],
                           filters=[dict(enabled=on.isChecked(), type=kind.currentText(), frequency=freq.value(), gain=gain.value(), q=q.value()) for _, on, kind, freq, gain, q in self.filter_rows])
        if not self.replaying:
            sender = self.sender()
            self.history.record(eq_profile(self.config), group=id(sender) if sender is not None else None)
        self.window.perform(self.window.save_and_apply)
        self.update_curve()

    def update_curve(self):
        self.undo_button.setEnabled(self.history.index>0)
        self.redo_button.setEnabled(self.history.index<len(self.history.items)-1)
        _, response = sosfreqz(filter_chain(self.config), worN=8192)
        peak = max(0, 20*math.log10(max(abs(response)))+max(0, self.config['preamp']))
        self.headroom.setText(f'Automatic level reduction: about {peak+1 if peak>.09 else 0:.1f} dB' if self.config['protect'] else 'Automatic headroom is off. The peak guard still prevents over-range samples.')
        self.curve.update()

    def undo(self):
        self.replaying = True
        try:
            self.apply(self.history.undo())
        finally:
            self.replaying = False

    def redo(self):
        self.replaying = True
        try:
            self.apply(self.history.redo())
        finally:
            self.replaying = False

    def add_filter(self, item=None):
        if len(self.filter_rows) >= 24:
            self.message.setText('This output already has 24 parametric filters.')
            return
        item = item or dict(enabled=True, type='Peak', frequency=1000, gain=0, q=1.4)
        row = QWidget()
        box = QHBoxLayout(row)
        on = QCheckBox()
        on.setFixedWidth(24)
        on.setChecked(item.get('enabled', True))
        kind = QComboBox()
        kind.setFixedWidth(160)
        kind.addItems(FILTER_TYPES)
        kind.setCurrentText(item.get('type', 'Peak'))
        frequency = self.spin(20, 20000, item.get('frequency', 1000), 1, '')
        gain = self.spin(-24, 24, item.get('gain', 0), .1, '')
        q = self.spin(.1, 20, item.get('q', 1.4), .01, '')
        box.addWidget(on)
        box.addWidget(kind)
        for control in (frequency, gain, q):
            box.addWidget(control, 1)
        remove = QPushButton('Remove')
        remove.setFixedWidth(90)
        remove.clicked.connect(lambda: self.remove_filter(row))
        box.addWidget(remove)
        self.filter_rows.append((row, on, kind, frequency, gain, q))
        self.filter_layout.addWidget(row)
        on.toggled.connect(self.changed)
        kind.currentTextChanged.connect(self.changed)
        gain.setEnabled(kind.currentText() in ('Peak', 'Low shelf', 'High shelf'))
        kind.currentTextChanged.connect(lambda text: gain.setEnabled(text in ('Peak', 'Low shelf', 'High shelf')))
        for control in (frequency, gain, q):
            control.valueChanged.connect(self.changed)
        self.changed()

    def remove_filter(self, widget):
        self.filter_rows = [row for row in self.filter_rows if row[0] != widget]
        self.filter_layout.removeWidget(widget)
        widget.deleteLater()
        self.changed()

    def reload_presets(self):
        self.presets.clear()
        self.presets.addItems(['Choose profile…', *PRESETS, *self.window.settings.data['profiles']])

    def apply(self, profile):
        profile = validate_profile(profile)
        self.loading = True
        self.config.update(profile)
        self.enabled.setChecked(profile['eq'])
        self.protect.setChecked(profile['protect'])
        self.preamp.setValue(profile['preamp'])
        self.balance.setValue(profile['balance'])
        for spin, gain in zip(self.values, profile['gains']):
            spin.setValue(gain)
        for spin, gain in zip(self.classic_values, profile['classic_gains']):
            spin.setValue(gain)
        for spin, gain in zip(self.tone_values, profile['tones']):
            spin.setValue(gain)
        for row in list(self.filter_rows):
            self.remove_filter(row[0])
        for item in profile['filters']:
            self.add_filter(item)
        self.loading = False
        self.changed()

    def preset(self, name):
        if name in PRESETS:
            gains = np.interp(np.log(CLASSIC_FREQUENCIES), np.log(FREQUENCIES), PRESETS[name]).tolist()
            self.apply(dict(classic_gains=gains))
        elif name in self.window.settings.data['profiles']:
            self.apply(self.window.settings.data['profiles'][name])

    def reset(self):
        self.apply(dict(gains=[0]*10))

    def save_profile(self):
        name, accepted = QInputDialog.getText(self, 'Save EQ profile', 'Profile name')
        if accepted and name.strip():
            if name.strip() in PRESETS:
                self.message.setText('Choose a name different from the built-in profiles.')
                return
            self.window.settings.data['profiles'][name.strip()] = eq_profile(self.config)
            self.window.perform(self.window.settings.save)
            self.reload_presets()

    def import_profile(self):
        name, _ = QFileDialog.getOpenFileName(self, 'Import EQ profile', '', 'EQ profiles (*.json)')
        if name:
            try:
                if Path(name).stat().st_size > 65536:
                    raise ValueError('Profile is too large')
                self.apply(json.loads(Path(name).read_text(encoding='utf-8')))
                self.message.setText('Imported EQ profile for this device.')
            except Exception as exc:
                self.message.setText(f'Could not import profile: {exc}')

    def export_profile(self):
        name, _ = QFileDialog.getSaveFileName(self, 'Export EQ profile', 'sound-manager-eq.json', 'EQ profiles (*.json)')
        if name:
            try:
                Path(name).write_text(json.dumps(eq_profile(self.config), indent=2), encoding='utf-8')
                self.message.setText('Exported EQ profile.')
            except Exception as exc:
                self.message.setText(f'Could not export profile: {exc}')

    def copy_to_output(self):
        device = self.destination.currentData()
        if device:
            self.window.settings.device(device).update(eq_profile(self.config))
            self.window.perform(self.window.save_and_apply)
            self.message.setText('Copied EQ. Output selection and delay were kept.')
