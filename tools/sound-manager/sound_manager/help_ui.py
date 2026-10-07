"""Offline versioned help reference; search wraps without any network request."""
from pathlib import Path
import sys
from PySide6.QtGui import QTextCursor
from PySide6.QtWidgets import QDialog,QHBoxLayout,QLabel,QLineEdit,QPushButton,QTextBrowser,QVBoxLayout

class HelpDialog(QDialog):
    def __init__(self,parent):
        super().__init__(parent)
        self.setWindowTitle('Simple Sound Manager help')
        self.resize(900,700)
        layout=QVBoxLayout(self)
        row=QHBoxLayout()
        self.search=QLineEdit()
        self.search.setPlaceholderText('Find a control, function or topic…')
        self.search.returnPressed.connect(self.find_next)
        row.addWidget(self.search,1)
        next_button=QPushButton('Find next')
        next_button.clicked.connect(self.find_next)
        row.addWidget(next_button)
        layout.addLayout(row)
        self.body=QTextBrowser()
        self.body.setOpenExternalLinks(True)
        root=Path(sys.executable).parent if getattr(sys,'frozen',False) else Path(__file__).resolve().parents[1]
        path=root/'HELP.md'
        self.body.setMarkdown(path.read_text(encoding='utf-8') if path.exists() else 'Help file is missing. Reinstall the complete application package.')
        layout.addWidget(self.body,1)
        self.message=QLabel('Offline help. Press Enter to find the next match; search wraps to the start.')
        layout.addWidget(self.message)

    def find_next(self):
        query=self.search.text().strip()
        if not query:
            return
        found=self.body.find(query)
        if not found:
            cursor=self.body.textCursor()
            cursor.movePosition(QTextCursor.MoveOperation.Start)
            self.body.setTextCursor(cursor)
            found=self.body.find(query)
        self.message.setText('Match found.' if found else 'No matching text.')
