from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import QComboBox, QDialog, QHBoxLayout, QLabel, QPushButton, QScrollArea, QSlider, QVBoxLayout, QWidget
from .app_mixer import AppMixer

class AppMixerController:
    def __init__(self,window):
        self.window=window
        self.mixer=AppMixer(window.backend)
        self.dialog=None
        self.error=''
        self.timer=QTimer(window)
        self.timer.timeout.connect(self.poll)
        if not window.screenshot:
            self.timer.start(3000)

    def poll(self):
        try:
            self.mixer.enumerate()
            self.mixer.saved_routes(self.window.settings,self.window.bus if self.window.running else None,self.window.devices)
            self.error=''
            if self.dialog and self.dialog.isVisible():
                self.dialog.refresh()
        except Exception as exc:
            self.error=str(exc)
            if self.dialog and self.dialog.isVisible():
                self.dialog.message.setText(self.error)

    def show(self):
        if self.dialog is None:
            self.dialog=AppMixerDialog(self)
        self.poll()
        self.dialog.refresh()
        self.dialog.show()
        self.dialog.raise_()

class AppMixerDialog(QDialog):
    def __init__(self,controller):
        super().__init__(controller.window)
        self.controller=controller
        self.setWindowTitle('Per-app mixer and destinations')
        self.resize(780,500)
        layout=QVBoxLayout(self)
        note=QLabel('Apps appear while they have an audio session. Volume and mute affect native app sessions. Physical destinations bypass manager EQ/delay/solo; Manager mix sends through the selected outputs. Some apps need playback restarted after routing changes.')
        note.setWordWrap(True)
        layout.addWidget(note)
        refresh=QPushButton('Refresh apps')
        refresh.clicked.connect(controller.poll)
        layout.addWidget(refresh)
        scroll=QScrollArea()
        scroll.setWidgetResizable(True)
        self.body=QWidget()
        self.rows=QVBoxLayout(self.body)
        scroll.setWidget(self.body)
        layout.addWidget(scroll,1)
        self.message=QLabel()
        self.message.setWordWrap(True)
        layout.addWidget(self.message)

    def refresh(self):
        if any(w.hasFocus() for w in self.body.findChildren(QComboBox)) or any(w.isSliderDown() or w.hasFocus() for w in self.body.findChildren(QSlider)):
            return
        while self.rows.count():
            self.rows.takeAt(0).widget().deleteLater()
        for key,item in self.controller.mixer.items.items():
            box=QWidget()
            row=QHBoxLayout(box)
            row.addWidget(QLabel(item['name']))
            slider=QSlider(Qt.Orientation.Horizontal)
            slider.setRange(0,100)
            slider.setValue(round(item['volume']*100))
            slider.valueChanged.connect(lambda value,k=key:self.act(lambda:self.controller.mixer.volume(k,value/100)))
            row.addWidget(slider,1)
            mute=QPushButton('Unmute' if item['muted'] else 'Mute')
            mute.clicked.connect(lambda _,k=key,m=not item['muted']:self.act(lambda:self.controller.mixer.mute(k,m)))
            row.addWidget(mute)
            choice=QComboBox()
            choice.addItem('System default',None)
            choice.addItem('Manager mix','__manager__')
            for device in self.controller.window.devices:
                if device.kind=='output':
                    choice.addItem(self.controller.window.display_name(device),device.id)
            saved=self.controller.window.settings.data.get('app_routes',{}).get(key)
            if saved not in (None,'__manager__') and choice.findData(saved)<0:
                choice.addItem('Saved output (disconnected)',saved)
            index=choice.findData(saved)
            if index>=0:
                choice.setCurrentIndex(index)
            choice.setEnabled(bool(item['pids']) if self.controller.window.backend.windows else True)
            row.addWidget(choice)
            apply=QPushButton('Assign')
            apply.setEnabled(choice.isEnabled())
            apply.clicked.connect(lambda _,k=key,c=choice:self.assign(k,c.currentData()))
            row.addWidget(apply)
            self.rows.addWidget(box)
        self.message.setText(self.controller.error or '\n'.join([*self.controller.mixer.enumeration_errors,*self.controller.mixer.route_errors.values()]) or ('No audio sessions yet. Start playback in an app.' if not self.controller.mixer.items else 'Saved destinations are reapplied when new app streams appear.'))

    def act(self,action):
        try:
            action()
            self.controller.poll()
        except Exception as exc:
            self.message.setText(str(exc))

    def assign(self,key,target):
        def action():
            endpoint=self.controller.window.bus if target=='__manager__' and self.controller.window.running else target
            if endpoint=='__manager__':
                raise RuntimeError('Start manager routing before assigning its mix')
            self.controller.mixer.route(key,endpoint)
            self.controller.window.settings.data.setdefault('app_routes',{})[key]=target
            self.controller.window.settings.save()
            self.controller.mixer.attempted.clear()
            item=self.controller.mixer.items[key]
            handles=item['pids'] if self.controller.window.backend.windows else item['handles']
            self.controller.mixer.attempted.add((key,tuple(sorted(handles)),endpoint))
        self.act(action)
