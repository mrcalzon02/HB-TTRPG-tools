from PySide6.QtCore import QTimer
from PySide6.QtWidgets import QCheckBox, QDialog, QHBoxLayout, QLabel, QListWidget, QPushButton, QTextEdit, QVBoxLayout
from .health import report

class EverydayDialog(QDialog):
    def __init__(self, window):
        super().__init__(window)
        self.window = window
        self.setWindowTitle('Device health and organization')
        self.resize(800, 650)
        layout = QVBoxLayout(self)
        layout.addWidget(QLabel('Hide affects only the menu. It does not disable audio. Move devices with the arrows; ordering is saved.'))
        self.list = QListWidget()
        layout.addWidget(self.list)
        row = QHBoxLayout()
        for text, action in (('Move up',lambda:self.move(-1)),('Move down',lambda:self.move(1)),('Hide / show selected',self.hide_device),('Refresh health',self.refresh)):
            button = QPushButton(text)
            button.clicked.connect(action)
            row.addWidget(button)
        layout.addLayout(row)
        self.text = QTextEdit()
        self.text.setReadOnly(True)
        layout.addWidget(self.text,1)
        self.timer = QTimer(self)
        self.timer.timeout.connect(lambda:self.text.setPlainText(report(window)))
        self.timer.start(2000)
        self.refresh()

    def refresh(self):
        index = self.list.currentRow()
        self.list.clear()
        self.ids = [d.id for d in self.window.devices]
        for d in self.window.devices:
            pref = self.window.settings.preference(d.id)
            self.list.addItem(d.kind.title()+' · '+self.window.display_name(d)+(' [hidden]' if pref.get('hidden',False) else ''))
        self.list.setCurrentRow(max(0,min(index,len(self.ids)-1)))
        self.text.setPlainText(report(self.window))

    def move(self, delta):
        index=self.list.currentRow()
        if 0<=index<len(self.ids) and 0<=index+delta<len(self.ids):
            self.window.move_device(self.ids[index],delta)
            self.refresh()
            self.list.setCurrentRow(index+delta)

    def hide_device(self):
        index=self.list.currentRow()
        if 0<=index<len(self.ids):
            pref=self.window.settings.preference(self.ids[index])
            pref['hidden']=not pref.get('hidden',False)
            self.window.settings.save()
            self.window.filter_cards()
            self.refresh()

    def closeEvent(self,event):
        self.timer.stop()
        super().closeEvent(event)
