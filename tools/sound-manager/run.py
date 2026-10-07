import argparse
import json
import os
from pathlib import Path
import sys

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", action="store_true", help="List audio endpoints without changing settings")
    parser.add_argument('--tray', action='store_true', help='Start minimized to the system tray')
    parser.add_argument("--screenshot", metavar="PNG", help="Render the actual UI offscreen, without audio changes")
    args = parser.parse_args()
    if args.probe:
        from dataclasses import asdict
        from sound_manager.backend import Backend
        print(json.dumps([asdict(d) for d in Backend().devices()], indent=2))
        return
    if args.screenshot:
        os.environ["QT_QPA_PLATFORM"] = "offscreen"
    if not args.screenshot:
        from sound_manager.settings import data_dir
        data_dir().mkdir(parents=True, exist_ok=True)
        log = (data_dir()/"app.log").open("a", encoding="utf-8", buffering=1)
        if sys.stdout is None:
            sys.stdout = log
        if sys.stderr is None:
            sys.stderr = log
    from PySide6.QtCore import QTimer, QLockFile, QStandardPaths
    from PySide6.QtWidgets import QApplication, QMessageBox
    from PySide6.QtGui import QFontDatabase
    from sound_manager.ui import Window, STYLE
    app = QApplication(sys.argv[:1])
    if args.screenshot and sys.platform == "win32":
        # The offscreen Qt plugin does not enumerate Windows system fonts.
        QFontDatabase.addApplicationFont(str(Path(os.environ.get("WINDIR", "C:/Windows"))/"Fonts"/"segoeui.ttf"))
    app.setApplicationName("Simple Sound Manager")
    app.setStyle("Fusion")
    app.setStyleSheet(STYLE)
    lock = None
    if not args.screenshot:
        lock = QLockFile(str(Path(QStandardPaths.writableLocation(QStandardPaths.StandardLocation.TempLocation))/"simple-sound-manager.lock"))
        if not lock.tryLock(100):
            from sound_manager.single_instance import reopen_existing
            if args.tray or reopen_existing():
                return
            QMessageBox.information(None, "Simple Sound Manager", "Another Sound Manager version is running but could not reopen its window. Quit the old version before installing this update, or restart Windows once. This version's pinned shortcut will reopen its running window directly.")
            return
    if args.screenshot:
        window = Window(screenshot=True)
    else:
        from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton
        from sound_manager.backend import Backend
        waiting = QWidget()
        waiting.setWindowTitle('Simple Sound Manager — audio startup')
        waiting.resize(560, 180)
        waiting_layout = QVBoxLayout(waiting)
        waiting_text = QLabel('Waiting for the audio system…')
        waiting_text.setWordWrap(True)
        waiting_layout.addWidget(waiting_text)
        retry = QPushButton('Try again')
        waiting_layout.addWidget(retry)
        state = dict(attempt=0, window=None, generation=0)
        def reopen_window():
            if state['window'] is not None:
                state['window'].show_window()
                if not state['window'].tray.isVisible():
                    from PySide6.QtWidgets import QSystemTrayIcon
                    if QSystemTrayIcon.isSystemTrayAvailable():
                        state['window'].tray.show()
            else:
                waiting.showNormal()
                waiting.raise_()
                waiting.activateWindow()
        from sound_manager.single_instance import InstanceServer
        instance_server = InstanceServer(reopen_window, app)
        def create_window(generation):
            if generation!=state['generation'] or state['window'] is not None:
                return
            try:
                backend = Backend()
                backend.devices()
                state['window'] = Window(backend=backend)
                if not args.tray or not state['window'].tray.isVisible():
                    state['window'].show()
                waiting.hide()
            except Exception as exc:
                delays = (1, 2, 4, 8, 16)
                attempt = state['attempt']
                waiting_text.setText(f'Audio system is not ready: {exc}\n'+(f'Retrying in {delays[attempt]} seconds.' if attempt<len(delays) else 'Automatic startup retries stopped. Start your audio service and click Try again.'))
                waiting.show()
                if attempt<len(delays):
                    state['attempt'] += 1
                    QTimer.singleShot(delays[attempt]*1000, lambda: create_window(generation))
        def manual_start():
            state.update(attempt=0, generation=state['generation']+1)
            create_window(state['generation'])
        retry.clicked.connect(manual_start)
        create_window(0)
        sys.exit(app.exec())
    if not args.tray or not window.tray.isVisible():
        window.show()
    if args.screenshot:
        def capture():
            window.grab().save(str(Path(args.screenshot).resolve()))
            app.quit()
        QTimer.singleShot(500, capture)
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
