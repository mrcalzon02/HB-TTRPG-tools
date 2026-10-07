import sys
from PySide6.QtWidgets import QCheckBox, QDialog, QFormLayout, QLabel, QLineEdit, QPushButton, QVBoxLayout
from .hotkeys import ACTIONS, DesktopHotkeys, parse_key

class HotkeyController:
    def __init__(self,window):
        self.window=window
        self.dialog=None
        self.native=DesktopHotkeys(__import__('PySide6.QtWidgets',fromlist=['QApplication']).QApplication.instance(),lambda action:window.perform(lambda:window.dispatch_action(action)))
        self.errors=[]
        if not window.screenshot and window.settings.data.get('desktop_hotkeys_enabled',False):
            self.apply(True,window.settings.data.get('desktop_hotkeys',ACTIONS))

    def apply(self,enabled,bindings):
        for key in bindings.values():
            parse_key(key)
        self.errors=self.native.configure(bindings if enabled else {})
        self.window.settings.data.update(desktop_hotkeys_enabled=enabled,desktop_hotkeys=bindings)
        self.window.settings.save()

    def show(self):
        if self.dialog is None:
            self.dialog=HotkeyDialog(self)
        self.dialog.show()
        self.dialog.raise_()

class HotkeyDialog(QDialog):
    def __init__(self,controller):
        super().__init__(controller.window)
        self.setWindowTitle('Desktop shortcuts')
        layout=QVBoxLayout(self)
        note=QLabel('Opt-in shortcuts for output mute, microphone mute, output cycling and scenes. Use Ctrl/Alt/Shift plus one letter or digit. Conflicts are reported. On Wayland, bind the --action commands in desktop settings; automatic global registration is not used.')
        note.setWordWrap(True)
        layout.addWidget(note)
        enabled=QCheckBox('Enable desktop hotkeys')
        enabled.setChecked(controller.window.settings.data.get('desktop_hotkeys_enabled',False))
        layout.addWidget(enabled)
        form=QFormLayout()
        self.edits={}
        for action,default in ACTIONS.items():
            edit=QLineEdit(controller.window.settings.data.get('desktop_hotkeys',{}).get(action,default))
            self.edits[action]=edit
            form.addRow(action,edit)
        layout.addLayout(form)
        message=QLabel()
        message.setWordWrap(True)
        layout.addWidget(message)
        apply=QPushButton('Apply shortcuts')
        def save():
            try:
                controller.apply(enabled.isChecked(),{action:edit.text() for action,edit in self.edits.items()})
                message.setText('\n'.join(controller.errors) or 'Shortcut configuration applied.')
            except Exception as exc:
                message.setText(str(exc))
        apply.clicked.connect(save)
        layout.addWidget(apply)
        from .startup import launch_args
        command= '"'+launch_args()[0]+'"' if getattr(sys,'frozen',False) else 'simple-sound-manager'
        commands=QLabel('Desktop command bindings:\n'+'\n'.join(command+' --action '+action for action in ACTIONS))
        commands.setTextInteractionFlags(__import__('PySide6.QtCore',fromlist=['Qt']).Qt.TextInteractionFlag.TextSelectableByMouse)
        layout.addWidget(commands)
