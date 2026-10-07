import os
import unittest
from unittest.mock import patch

class HelpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['QT_QPA_PLATFORM']='offscreen'
        from PySide6.QtWidgets import QApplication
        cls.app=QApplication.instance() or QApplication([])

    def test_current_help_is_searchable_and_wraps_without_loading_network(self):
        from sound_manager.help_ui import HelpDialog
        from PySide6.QtGui import QTextCursor
        dialog=HelpDialog(None)
        try:
            self.assertIn('0.10.0',dialog.body.toPlainText())
            cursor=dialog.body.textCursor()
            cursor.movePosition(QTextCursor.MoveOperation.End)
            dialog.body.setTextCursor(cursor)
            dialog.search.setText('Solo')
            dialog.find_next()
            self.assertEqual(dialog.body.textCursor().selectedText().lower(),'solo')
            dialog.search.setText('NoSuchControlExistsHere')
            dialog.find_next()
            self.assertEqual(dialog.message.text(),'No matching text.')
        finally:
            dialog.close()
            dialog.deleteLater()

    def test_missing_help_is_reported_instead_of_old_embedded_documentation(self):
        from sound_manager.help_ui import HelpDialog
        with patch('sound_manager.help_ui.Path.exists',return_value=False):
            dialog=HelpDialog(None)
        self.assertIn('Help file is missing',dialog.body.toPlainText())
        dialog.close()
        dialog.deleteLater()
