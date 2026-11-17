"""Exercise the signed Android build through its real lock, pairing and system data-clear flows."""
import os
import io
import struct
import subprocess
import re
from pathlib import Path
import sys
import time

import cubechat_android_qa as ui
import cubechat_android_two_qa as phones
import cubechat_013_acceptance as files

HOST, GUEST = phones.HOST, phones.GUEST
APK = ".github/cubechat-security-candidate/CubeChat.apk"
USER = "FieldOperator"
NORMAL = "Ordinary8941QA"
DURESS = "DrillOnly7219QA"
SEED = "BeforeSecurityUpgrade"
AFTER = "AfterNormalUnlock"
FILE = "cubechat-security-drill.bin"

def open_app():
    ui.shell("am","start","--user","0","-W","-n",ui.MAIN,label="Open CubeChat")

def diagnose_screen():
    # Report packages and known public UI controls only. Never print user text or a key-card URI.
    nodes=ui.tree()
    packages=sorted({n.get("package","") for n in nodes if n.get("package")})
    labels={"Pair two phones","Show my invite","Unlock","Security","Wait","Close app",
            "System UI isn't responding","CubeChat isn't responding","Pairing","Create profile",
            "Accept file","Not now","Retry","Close","Incorrect username or password."}
    controls=sorted({n.get("text","") for n in nodes if n.get("text","") in labels})
    focus=ui.shell("dumpsys","window","windows",required=False)
    current=re.search(r"mCurrentFocus=Window\{[^}]*? u\d+ ([A-Za-z0-9._/$]+)",focus)
    current=current.group(1) if current else "(no activity)"
    ui.report(f"Android UI on {os.environ.get('ANDROID_SERIAL','device')}: focused {current}; packages {packages}; known controls {controls}; CubeChat running={bool(ui.shell('pidof',ui.APP,required=False))}.")

def launcher_anr(nodes):
    # These fresh installations have no conversation or key card. Read only the ANR
    # process and reason from the last incident, never the complete device dump.
    last = ui.shell("dumpsys", "activity", "lastanr", required=False)
    process = re.search(r"\bANR in ([\w.:/-]+)", last)
    reason = re.search(r"^\s*Reason:\s*([^\r\n]+)", last, re.MULTILINE)
    events = ui.shell("logcat", "-b", "events", "-d", "-t", "800", "-s", "am_anr:I", required=False)
    records = re.findall(r"am_anr\s*:\s*\[\d+,\d+,([^,]+),\d+,([^\n]+)\]", events)
    package = process.group(1) if process else records[-1][0] if records else "unknown"
    cause = reason.group(1) if reason else records[-1][1] if records else "unavailable"
    cause = re.sub(r"\b\w+://\S+", "[URI]", cause)[:300]
    current = any("cubechat" in n.get("text", "").casefold() and "respond" in n.get("text", "").casefold() for n in nodes)
    ui.report(f"Startup ANR on {os.environ.get('ANDROID_SERIAL','device')}: last process={package}, reason={cause}.")
    return current or package == ui.APP or package.startswith(ui.APP + ":")

def start_empty_install(version):
    # This recovery is restricted to empty installations before pairing or enrollment.
    # Data-bearing upgrades, credential entry and the system clear still run once.
    app_warnings = 0
    for attempt in range(2):
        ui.shell("input","keyevent","KEYCODE_WAKEUP")
        ui.shell("wm","dismiss-keyguard",required=False)
        ui.shell("cmd","statusbar","collapse",required=False)
        ui.shell("input","keyevent","82")
        # Do not let am -W hide an ANR from the UI polling loop.
        ui.shell("am", "start", "--user", "0", "-n", ui.MAIN, label="Start the empty CubeChat installation")
        deadline=time.monotonic()+35
        while time.monotonic()<deadline:
            nodes=ui.tree()
            wait=next((n for n in nodes if n.get("package")=="android" and
                       (n.get("resource-id")=="android:id/aerr_wait" or n.get("text")=="Wait")),None)
            if wait is not None:
                if launcher_anr(nodes):
                    app_warnings += 1
                    if app_warnings > 1:
                        raise ui.CheckFailed(f"Persistent CubeChat startup ANR on signed {version}")
                ui.tap(wait)
            elif any(n.get("package")==ui.APP and n.get("text")=="Pair two phones" for n in nodes):
                ui.report(f"Fresh signed {version} ready on {os.environ.get('ANDROID_SERIAL','device')}.")
                return
            time.sleep(.3)
        diagnose_screen()
        if attempt == 0: phones.stop()
    raise ui.CheckFailed(f"The fresh signed {version} launch did not reach its pairing screen after bounded wake/relaunch")

def find_visible(predicate, label, timeout=30):
    end=time.monotonic()+timeout
    tries=0
    while time.monotonic()<end:
        nodes=ui.tree()
        for node in nodes:
            if predicate(node):
                l,t,r,b=ui.bounds(node)
                if r>l and b>t: return node
        scroll=next((n for n in nodes if n.get("class")=="android.widget.ScrollView" and n.get("scrollable")=="true"),None)
        if scroll is not None and tries in (1,3,5,7,9,11):
            l,t,r,b=ui.bounds(scroll); x=int((l+r)/2)
            start=t+(b-t)*3//4;finish=t+(b-t)//4
            if tries in (7,9,11): start,finish=finish,start
            ui.shell("input","swipe",str(x),str(start),str(x),str(finish),"350")
        tries+=1
        time.sleep(.2)
    raise ui.CheckFailed(label+" did not appear")

def match(label, timeout=30):
    return find_visible(lambda n:n.get("text","").casefold()==label.casefold()
                        or n.get("content-desc","").casefold()==label.casefold(),label,timeout)

def tap(label):
    ui.tap(match(label))

def visible(label):
    return any(n.get("text","").casefold()==label.casefold() for n in ui.tree())

def field(label, value):
    def locate(n):
        return (n.get("class")=="android.widget.EditText" and
                label.casefold() in (n.get("text","").casefold(), n.get("content-desc","").casefold(),
                                     n.get("hint","").casefold()))
    e=find_visible(locate,"Input field "+label,35)
    ui.tap(e)
    ui.shell("input","text",value,label="Enter synthetic data")
    ime=ui.shell("dumpsys","input_method")
    if "mInputShown=true" in ime or "isInputViewShown=true" in ime:
        ui.shell("input","keyevent","KEYCODE_BACK")

def security():
    tap("Pairing"); tap("Security")

def lock():
    tap("Pairing"); tap("Lock now")
    match("Unlock")

def sign(value):
    field("Password",value); tap("Unlock")

def chat_preferences():
    tap("Pairing");tap("Chat preferences")
    tap("Large");tap("Enter sends a message");tap("Save")
    draft=ui.wait_for(lambda n:n.get("class")=="android.widget.EditText","Chat composer")
    ui.tap(draft);ui.shell("input","text","EnterKeyDelivery");ui.shell("input","keyevent","KEYCODE_ENTER")
    phones.receipt("EnterKeyDelivery","Delivered")
    ime=ui.shell("dumpsys","input_method")
    if "mInputShown=true" in ime or "isInputViewShown=true" in ime: ui.shell("input","keyevent","KEYCODE_BACK")
    tap("Pairing");tap("Chat preferences")
    for name in ("Large","Enter sends a message","Ask keyboard not to learn chat text"):
        if match(name).get("checked")!="true":
            raise ui.CheckFailed("Chat preference did not stick: "+name)
    screenshot("preferences")
    tap("Use defaults")

def enroll():
    security(); tap("Set up local profile")
    field("Username",USER); field("New password",NORMAL); field("Confirm password",NORMAL)
    tap("Create profile")
    settle_form("Set up local profile")
    if not visible("Pairing"):
        if visible("Close"): tap("Close")
        else: ui.shell("input","keyevent","KEYCODE_BACK")
    match("Pairing")
    security(); tap("PURGE password")
    field("Current password",NORMAL); field("PURGE password",DURESS); field("Confirm PURGE password",DURESS)
    tap("I understand this clears CubeChat on this phone"); tap("Enable PURGE password")
    settle_form("Enable PURGE password")
    if not visible("Pairing"):
        if visible("Close"): tap("Close")
        else: ui.shell("input","keyevent","KEYCODE_BACK")
    match("Pairing")

def settle_form(button):
    end=time.monotonic()+30
    while time.monotonic()<end:
        if not visible(button): return
    raise ui.CheckFailed("Credential form did not complete")

def upgrade():
    if b"Success" not in ui.run(["adb","install","-r",APK],"In-place upgrade to signed build 5"):
        raise ui.CheckFailed("Signed APK could not upgrade in place")
    if "versionCode=5" not in ui.shell("dumpsys","package",ui.APP):
        raise ui.CheckFailed("Version code 5 is missing")
    open_app()

def connected_within(seconds):
    try:
        ui.wait_for(lambda n:n.get("text","").startswith("Connected"),
                    "Authenticated conversation",seconds)
        return True
    except ui.CheckFailed:
        return False

def reopen_card(card):
    ui.shell("am","start","--user","0","-W","-a","android.intent.action.VIEW","-c","android.intent.category.BROWSABLE",
             "-d",card,"-p",ui.APP,label="Open the original physical test card")
    ui.wait_for(lambda n:n.get("package")==ui.APP and n.get("text","").startswith("Peer "),
                "Scanned guest fingerprint",25)

def inspect_carrier():
    phones.select(HOST)
    sockets=ui.shell("ss","-ltn",required=False)
    listener=bool(re.search(r":47743\s",sockets))
    host=ui.shell("ip","-4","-o","addr","show","dev","wlan0",required=False)
    ip=re.search(r"\binet (\d+\.\d+\.\d+\.\d+)/",host)
    phones.select(GUEST)
    ping=ui.shell("ping","-c","1","-W","1",ip.group(1),required=False) if ip else ""
    fingerprint=any(n.get("text","").startswith("Peer ") for n in ui.tree())
    ui.report(f"Carrier check: host listening on 47743={listener}, guest Wi-Fi echo received={'bytes from' in ping}, guest imported a fingerprint={fingerprint}.")
    return listener

def rendered_card():
    # Both the raw capture and any enlarged crop must decode as a real CubeChat HTTPS QR.
    observations = []
    tmp = Path(os.environ['RUNNER_TEMP'])
    for delay in (0, .7, 1.5, 3, 4):
        time.sleep(delay)
        nodes = ui.tree()
        qr = next((n for n in nodes if n.get('package') == ui.APP and
                   n.get('content-desc') == 'CubeChat pairing QR code'), None)
        if qr is None:
            title = any(n.get('text') == 'Pairing invite' for n in nodes)
            observations.append(f'invite title={title}, QR view absent')
            continue
        box = ui.bounds(qr)
        png = ui.run(['adb','exec-out','screencap','-p'], 'Capture displayed synthetic QR')
        if not png.startswith(b'\x89PNG\r\n\x1a\n') or len(png) < 24:
            observations.append('invalid framebuffer PNG')
            continue
        width, height = struct.unpack('>II', png[16:24])
        left, top, right, bottom = box
        state = f'frame {width}x{height}, view {box}'
        if not (0 <= left < right <= width and 0 <= top < bottom <= height):
            observations.append(state + ', bounds outside framebuffer')
            continue
        attempts = [(png,box)]
        try:
            from PIL import Image, ImageOps
        except ImportError:
            state += ', contrast unavailable'
        else:
            crop = Image.open(io.BytesIO(png)).convert('L').crop(box)
            lo, hi = crop.getextrema()
            state += f', luminance range {lo}..{hi}'
            if hi-lo >= 80:
                threshold = (lo+hi)//2
                ink = crop.point(lambda x: 255 if x <= threshold else 0).getbbox()
                if ink:
                    binary = crop.crop(ink).point(lambda x: 255 if x > threshold else 0)
                    enlarged = binary.resize((binary.width*2,binary.height*2),Image.Resampling.NEAREST)
                    framed = ImageOps.expand(enlarged,border=max(32,enlarged.width//12),fill=255)
                    out = io.BytesIO(); framed.save(out,format='PNG')
                    attempts.append((out.getvalue(),[0,0,framed.width,framed.height]))
        for frame, bounds in attempts:
            cmd = ['java','-Djava.awt.headless=true','-cp',f'{tmp}:{tmp / "zxing-core.jar"}',
                   'CubeChatQrReader',*map(str,bounds)]
            result = subprocess.run(cmd,input=frame,capture_output=True,timeout=12,check=False)
            if result.returncode:
                # Never print the screen, signed invite, full device dumps or decoder output.
                kind = re.search(rb'\b(NotFoundException|ChecksumException|FormatException|RasterFormatException)\b',result.stderr)
                state += ', ' + (kind[1].decode() if kind else 'decoder failure')
                continue
            card = result.stdout.decode('ascii',errors='replace')
            if card.startswith(ui.PREFIX) and re.fullmatch(r'[A-Za-z0-9_-]+',card[len(ui.PREFIX):]):
                return card
            raise ui.CheckFailed('A QR code was read from the screen but it did not contain a CubeChat invite')
        observations.append(state)
    ui.report('QR framebuffer observations: ' + '; '.join(observations))
    windows = ui.shell('dumpsys','window','windows',required=False)
    ours = [w for w in re.split(r'(?m)^\s*Window #\d+ ',windows) if ui.APP in w.split('\n',1)[0]]
    secure = any(re.search(r'\bSECURE\b',window[:2400]) for window in ours)
    ui.report(f'CubeChat windows listed={len(ours)}, SECURE flag found={secure}.')
    launcher_anr(ui.tree())
    crashes = ui.shell('logcat','-b','events','-d','-t','600','-s','am_crash:I',required=False)
    classes = re.findall(r'am_crash\s*:\s*\[\d+,\d+,([\w.:]+),\d+,([\w.$]+),',crashes)
    ui.report('Recent Android crash process/class records: ' + repr(classes[-3:]))
    if os.environ.get('CUBECHAT_SECURITY_FOCUS') == '1':
        tap('Show invite text')
        node = ui.wait_for(lambda n:n.get('package') == ui.APP and n.get('text','').startswith(ui.PREFIX)
                           and bool(re.fullmatch(r'[A-Za-z0-9_-]+',n.get('text','')[len(ui.PREFIX):])),
                           'Exact native invitation for the focused security drill',20)
        ui.report('Focused security drill continued with the native text invitation after the QR decoder failed.')
        return node.get('text')
    raise ui.CheckFailed('No scannable CubeChat QR appeared in the invite after five displayed framebuffer captures')

def pairing(route):
    phones.select(HOST); tap("Show my invite"); match("Pairing invite")
    card=rendered_card(); tap("Close")
    phones.select(GUEST)
    # The repository's public 0.1.3 handles initial app links most reliably on a cold launch.
    phones.stop(); reopen_card(card)
    if connected_within(15): return route
    inspect_carrier()
    if route=="direct virtual Wi-Fi":
        phones.bridge()
        route="the explicitly configured ADB TCP test bridge"
        ui.report("The paired apps did not authenticate on the virtual access point. Both Android apps will use the guest-UID-scoped ADB TCP test bridge for this security drill.")
    # Establish a new native CubeChat socket with the original scanned keys; one stored contact.
    for attempt in range(2):
        phones.select(HOST); phones.stop(); open_app()
        ui.wait_for(lambda n:n.get("text")=="Conversations","Host restored the original chat",30)
        phones.select(GUEST); phones.stop(); reopen_card(card)
        if connected_within(30):
            ui.report("Both CubeChat clients restored the scanned pairing and opened an authenticated connection over "+route+".")
            return route
        inspect_carrier()
    raise ui.CheckFailed("CubeChat could not open an authenticated socket after two restarts on "+route)

def screenshot(label):
    nodes=ui.tree()
    if any("CUBECHAT2." in str(n.attrib) or n.get("password")=="true" for n in nodes):
        raise ui.CheckFailed("Unexpected private content on proof screen")
    data=ui.run(["adb","exec-out","screencap","-p"],"Capture synthetic test state")
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ui.CheckFailed("Screenshot is invalid")
    Path(os.environ["RUNNER_TEMP"],"CubeChat-014-"+label+".png").write_bytes(data)

def path_exists(path):
    return ui.shell("sh","-c","'if [ -e "+path+" ]; then echo present; fi'")=="present"

def expect_system_clear(submitted_at=None):
    # No pm clear, uninstall, test recovery or test-only API is used on the sender.
    end=time.monotonic()+22
    while time.monotonic()<end:
        if not ui.shell("pidof",ui.APP,required=False):break
        time.sleep(.2)
    else:raise ui.CheckFailed("Android did not stop the package after duress")
    exit_seconds = time.monotonic() - submitted_at if submitted_at is not None else None
    protected="/data/user/0/"+ui.APP
    old=("databases/cubechat-direct.db","databases/cubechat-direct.db-wal","shared_prefs","no_backup/cubechat-direct.db.purge-pending")
    while any(path_exists(protected+"/"+child) for child in old):
        if time.monotonic()>=end:raise ui.CheckFailed("Android clear left old app data behind")
        time.sleep(.25)
    open_app();match("Pair two phones");match("Create local profile")
    if visible("Unlock") or visible(SEED):
        raise ui.CheckFailed("Previously protected state reappeared after relaunch")
    return exit_seconds

def ready_unlock():
    return ui.wait_for(lambda n:n.get("package")==ui.APP and n.get("text","").casefold()=="unlock"
                       and n.get("enabled")=="true","Unlock after the vault is sealed",30)

def require_stopped_process(pid):
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        state=ui.shell("cat","/proc/"+pid+"/status",required=False)
        if re.search(r"^State:\s+T\s+\(stopped\)",state,re.MULTILINE): return
        time.sleep(.05)
    raise ui.CheckFailed("The receiving Android process did not remain stopped")

def purge_while_peer_stopped():
    # Prepare both secure lock forms before suspending the recipient. All application
    # threads in that PID then stop. Its already-established TCP connection stays open.
    phones.select(GUEST); ready_unlock()
    pid=ui.shell("pidof",ui.APP).strip()
    if not pid.isdigit(): raise ui.CheckFailed("Expected exactly one receiving CubeChat process")
    phones.select(HOST); files.connected(); lock(); ready_unlock()
    field("Password",DURESS); submit=ready_unlock()
    phones.select(GUEST)
    try:
        ui.shell("kill","-STOP",pid,label="Stop synthetic recipient before sender activation")
        require_stopped_process(pid)
        phones.select(HOST)
        submitted=time.monotonic()
        ui.tap(submit)
        exit_seconds=expect_system_clear(submitted)
        phones.select(GUEST)
        require_stopped_process(pid)
        ui.report(f"During the entire sender reset, recipient /proc/{pid}/status reported T (stopped) "
                  f"before the password tap and again after the sender returned to first launch. "
                  f"Observed sender process exit {exit_seconds:.2f} seconds after tap, including verification of the password and Android cleanup.")
    finally:
        phones.select(GUEST)
        ui.shell("kill","-CONT",pid,required=False,label="Resume the synthetic recipient")
    match("Unlock"); sign(NORMAL); notice(); match("ProtectedPeerRetainsHistory"); screenshot("locked-peer")
    ui.report("After SIGCONT and normal unlock, the receiver showed the queued PURGE announcement and preceding history. Its own profile survived.")

def notice():
    return ui.wait_for(lambda n:"purge protocol" in n.get("text","").lower() and
                       n.get("package")==ui.APP,"Peer's readable PURGE notice",40)

def drill():
    for device in (HOST,GUEST):
        phones.select(device)
        ui.run(["adb","root"],"Inspect ephemeral emulator private storage")
        ui.run(["adb","wait-for-device"],"Reconnect emulator")
        if ui.shell("id","-u")!="0":raise ui.CheckFailed("Android app-data inspection requires rooted test image")
        if 'versionCode=5' not in ui.shell('dumpsys','package',ui.APP):
            raise ui.CheckFailed('Signed build 5 must be installed on both devices before the security drill')
        start_empty_install('0.1.4')
    # Block only this disposable sender's reset marker. A file cannot replace a directory
    # by rename or be written at that pathname. The rest of the filesystem stays writable.
    phones.select(HOST); enroll(); phones.stop(); ui.shell("svc","wifi","disable")
    marker_base = "/data/user/0/" + ui.APP + "/no_backup/cubechat-direct.db.purge-"
    ui.shell("test", "-f", marker_base + "ready", label="Confirm the enrolled standby reset file")
    ui.shell("mkdir", marker_base + "pending", label="Obstruct only the disposable reset marker")
    open_app(); ready_unlock(); sign("WrongValue5342"); match("Incorrect username or password.")
    ready_unlock(); sign(NORMAL); security()
    match("Local profile · " + USER); match("PURGE password · Enabled")
    phones.stop(); open_app(); ready_unlock()
    ui.shell("test", "-d", marker_base + "pending", label="Confirm reset marker cannot be persisted")
    sign(DURESS); expect_system_clear()
    ui.report("With only the marker pathname blocked by a directory, a wrong password left the enrolled profile intact and normal offline sign-in still worked. After another cold start, the correct PURGE password cleared the offline sender and Android returned it to first launch.")

    ui.shell("svc","wifi","enable")
    route=pairing(phones.choose_network())
    phones.select(HOST); files.connected(); enroll()
    phones.select(GUEST); files.connected(); enroll(); files.connected()
    phones.send("ProtectedPeerRetainsHistory"); phones.receipt("ProtectedPeerRetainsHistory","Delivered"); lock()
    purge_while_peer_stopped()
    phones.select(HOST); screenshot("reset")
    ui.report("The stopped-recipient drill used "+route+".")

    if os.environ.get('CUBECHAT_SECURITY_FOCUS') == '1':
        ui.report('Focused 0.1.4 security acceptance completed for the suspended recipient and obstructed reset marker.')
        return

    # Reproduce the published upgrade on clean synthetic test installations, separately.
    public=str(Path(os.environ["RUNNER_TEMP"])/"CubeChat-previous.apk")
    for device in (HOST,GUEST):
        phones.select(device)
        ui.run(["adb","uninstall",ui.APP],"Remove the synthetic drill installation")
        ui.run(["adb","install",public],"Install the verified release for the populated migration test")
        ui.shell("svc","wifi","enable")
        start_empty_install("0.1.3")
    if route != "direct virtual Wi-Fi":
        # An Android uninstall can change the guest's UID; bind its new socket permissions.
        phones.bridge()
    else:
        route=phones.choose_network()
    route=pairing(route)
    phones.send(SEED); phones.receipt(SEED,"Delivered");phones.select(HOST);match(SEED)
    sample=b"Trusted synthetic attachment for the local security upgrade."
    files.fixture(FILE,sample);files.pick_file(FILE);tap("Close")
    upgrade();match(SEED);files.connected();chat_preferences();enroll()
    # Default immediately locks on leaving the app. Android Share must not expose the mailbox.
    ui.shell("input","keyevent","KEYCODE_HOME");time.sleep(1)
    ui.shell("am","start","--user","0","-W","-a","android.intent.action.SEND","-t","text/plain",
             "--es","android.intent.extra.TEXT","LockProbe","-p",ui.APP,label="External share while locked")
    match("Unlock")
    if visible(SEED) or visible("Conversations"):
        raise ui.CheckFailed("Message or conversation controls visible on locked share")
    phones.stop(); open_app();match("Unlock")
    sign("WrongValue5342")
    match("Incorrect username or password.")
    match("Unlock")
    if visible(SEED):raise ui.CheckFailed("Wrong credential exposed history")
    # A fresh process must still require the password, including when offline.
    phones.stop();ui.shell("svc","wifi","disable"); open_app();match("Unlock")
    sign(NORMAL);match(SEED)
    tap("Files");match(FILE);tap("Close")
    ui.shell("svc","wifi","enable");files.connected()
    phones.send(AFTER);phones.receipt(AFTER,"Delivered")
    ui.report("A populated 0.1.3 install upgraded to build 5. Locked Share and wrong credentials hid chat. Normal sign-in worked offline after a process restart, preserving history, the file and delivery after reconnect.")
    # Exercise the running, previously authenticated connection to an unmodified 0.1.3 receiver.
    if not path_exists("/data/user/0/"+ui.APP+"/databases/cubechat-direct.db"):
        raise ui.CheckFailed("Populated private sender store missing before activation")
    lock();sign(DURESS);expect_system_clear()
    shared=ui.run(["adb","exec-out","cat","/sdcard/Download/"+FILE],"Read external fixture after reset")
    if shared!=sample:raise ui.CheckFailed("External file was changed")
    screenshot("reset")
    phones.select(GUEST);notice();match(SEED);match(AFTER);screenshot("peer")
    ui.report("A real 0.1.3 peer received the readable PURGE announcement and retained its preceding messages over "+route+". Android cleared the sender's private database and preferences, kept the APK and external file, and showed first launch.")

if __name__=="__main__":
    try:
        drill()
    except ui.CheckFailed as error:
        try: diagnose_screen()
        except Exception: pass
        print("Android security acceptance failed: "+str(error),file=sys.stderr)
        sys.exit(1)
