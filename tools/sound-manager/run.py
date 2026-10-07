import argparse
import faulthandler
import json
import os
from pathlib import Path
import sys
import traceback

_CRASH_LOG = None

def configure_crash_logging():
    """Keep Python, Qt, and fatal-signal diagnostics in the per-user app log."""
    global _CRASH_LOG
    from sound_manager.settings import data_dir
    data_dir().mkdir(parents=True, exist_ok=True)
    _CRASH_LOG = (data_dir()/"app.log").open("a", encoding="utf-8", buffering=1)
    print("\n=== Simple Sound Manager launch ===", file=_CRASH_LOG)
    print(f"platform={sys.platform} python={sys.version.split()[0]} executable={sys.executable}", file=_CRASH_LOG)

    try:
        faulthandler.enable(file=_CRASH_LOG, all_threads=True)
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"Could not enable faulthandler: {exc}", file=_CRASH_LOG)

    previous_hook = sys.excepthook
    def log_exception(exc_type, exc, tb):
        print("Uncaught exception:", file=_CRASH_LOG)
        traceback.print_exception(exc_type, exc, tb, file=_CRASH_LOG)
        _CRASH_LOG.flush()
        if previous_hook is not sys.__excepthook__:
            previous_hook(exc_type, exc, tb)
    sys.excepthook = log_exception

    if sys.stdout is None:
        sys.stdout = _CRASH_LOG
    if sys.stderr is None:
        sys.stderr = _CRASH_LOG
    return _CRASH_LOG

def install_qt_message_logging():
    if _CRASH_LOG is None:
        return
    from PySide6.QtCore import qInstallMessageHandler
    def qt_message_handler(mode, context, message):
        location = ""
        if context is not None:
            file_name = getattr(context, "file", None)
            line = getattr(context, "line", 0)
            function = getattr(context, "function", None)
            details = ":".join(str(part) for part in (file_name, line, function) if part)
            location = f" [{details}]" if details else ""
        print(f"Qt {mode}: {message}{location}", file=_CRASH_LOG)
    qInstallMessageHandler(qt_message_handler)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", action="store_true", help="List audio endpoints without changing settings")
    parser.add_argument('--tray', action='store_true', help='Start minimized to the system tray')
    parser.add_argument("--screenshot", metavar="PNG", help="Render the actual UI offscreen, without audio changes")
    args = parser.parse_args()
    if not args.probe and not args.screenshot:
        from sound_manager.windows_identity import set_process_identity
        set_process_identity()
    if args.probe:
        from dataclasses import asdict
        from sound_manager.backend import Backend
        print(json.dumps([asdict(d) for d in Backend().devices()], indent=2))
        return
    if args.screenshot:
        os.environ["QT_QPA_PLATFORM"] = "offscreen"
    if not args.screenshot:
        configure_crash_logging()
    from PySide6.QtCore import QTimer, QLockFile, QStandardPaths
    from PySide6.QtWidgets import QApplication, QMessageBox
    from PySide6.QtGui import QFontDatabase
    if not args.screenshot:
        install_qt_message_logging()
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
                print("Startup audio initialization failed:", file=_CRASH_LOG)
                traceback.print_exc(file=_CRASH_LOG)
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
