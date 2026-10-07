# Third-party components

This app's own code is MIT licensed. Dependencies retain their own licenses:

* SoundCard: BSD 3-Clause, https://github.com/bastibe/SoundCard
* NumPy: BSD 3-Clause, https://numpy.org
* SciPy: BSD 3-Clause with bundled-library notices, https://scipy.org
* PySide6 / Qt: LGPLv3 / GPLv3 / commercial alternatives. This app uses the LGPL-compatible dynamically linked distribution. https://doc.qt.io/qtforpython-6/licenses.html
* pycaw: MIT, https://github.com/AndreMiras/pycaw
* comtypes: MIT, https://github.com/enthought/comtypes
* psutil: BSD 3-Clause, https://github.com/giampaolo/psutil (Windows process matching, included through pycaw)
* cffi: MIT, https://cffi.readthedocs.io
* PyInstaller bootloader: GPL with an exception for generated applications, https://pyinstaller.org

Windows routing uses a separately installed VB-CABLE driver from https://vb-audio.com/Cable/index.htm. It is third-party donationware, not part of this app's MIT source. No payment is required for the base cable download. The original driver package is not included in app distributions. See the publisher's license in its downloaded package.

Before distributing a binary, preserve the dependency license files collected beside it, supply this app's source and build instructions, and retain the replaceable shared Qt libraries. Do not remove the bundled library notices.

The independent Windows app-routing ABI binding was researched against EarTrumpet's MIT-licensed interface declarations: https://github.com/File-New-Project/EarTrumpet/tree/master/EarTrumpet/Interop/MMDeviceAPI. EarTrumpet is Copyright (c) 2015 Rafael Rivera, David Golden, and contributors. This app does not bundle EarTrumpet. Windows' internal policy interface is not a stable public API; failures are surfaced to the user.
