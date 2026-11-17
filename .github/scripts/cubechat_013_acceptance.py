"""Two Android devices exercise the signed APK, native radios, SAF pickers and approved exports."""
import hashlib
import os
from pathlib import Path
import re
import sys
import time

import cubechat_android_qa as ui
import cubechat_android_two_qa as phones

HOST, GUEST = phones.HOST, phones.GUEST
APK = ".github/cubechat-files-candidate/CubeChat.apk"
FILE = "cubechat-qafile.bin"
DECLINE = "cubechat-decline.bin"
LEGACY = "LegacyPeerChatOK"

def click(label):
    ui.tap(ui.named(label))

def connected():
    ui.wait_for(lambda n:n.get("text", "").startswith("Connected"), "Authenticated connection", 90)

def upgrade():
    result = ui.run(["adb","install","-r",APK], "Install signed candidate over 0.1.2")
    if b"Success" not in result or "versionCode=4" not in ui.shell("dumpsys","package",ui.APP):
        raise ui.CheckFailed("Candidate could not upgrade build 3 in place")
    ui.launch("0")

def picker_node(node):
    return node.get("package","").endswith("documentsui")

def briefly(predicate, seconds=5):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        node = next((n for n in ui.tree() if predicate(n)), None)
        if node is not None:
            return node
        time.sleep(.15)
    return None

def downloads():
    # Select DocumentsUI's actual Downloads location on the AOSP emulator.
    drawer = ui.wait_for(lambda n:picker_node(n) and
        any(s in n.get("content-desc","").lower() for s in ("show roots","open navigation drawer","show navigation drawer","open drawer")),
        "Android document picker navigation")
    ui.tap(drawer)
    root = ui.wait_for(lambda n:picker_node(n) and n.get("text","").casefold()=="downloads", "Downloads root")
    ui.tap(root)

def fixture(name, data):
    local = Path(os.environ["RUNNER_TEMP"],name)
    local.write_bytes(data)
    ui.shell("mkdir","-p","/sdcard/Download")
    target = "/sdcard/Download/" + name
    ui.run(["adb","push",str(local),target],"Stage synthetic picker input")
    ui.shell("am","broadcast","-a","android.intent.action.MEDIA_SCANNER_SCAN_FILE",
             "-d","file://" + target,label="Index test document for system picker")

def pick_file(name):
    click("Files"); click("Attach file")
    ui.wait_for(picker_node, "Android OPEN_DOCUMENT picker")
    target = briefly(lambda n:picker_node(n) and n.get("text")==name)
    if target is None:
        downloads()
        target = briefly(lambda n:picker_node(n) and n.get("text")==name,12)
    if target is None:
        # DownloadsProvider can filter files created directly by ADB. The
        # emulated storage root exposes the same fixture through SAF.
        ui.tap(ui.wait_for(lambda n:picker_node(n) and "show roots" in n.get("content-desc","").lower(),
                           "Storage navigation"))
        model = ui.shell("getprop","ro.product.model").strip()
        storage = ui.wait_for(lambda n:picker_node(n) and (n.get("text","") == model
                              or n.get("text","").lower().startswith(("sdk_gphone","android sdk built","internal storage"))),
                              "Device storage root")
        ui.tap(storage)
        click("Download")
        target = ui.wait_for(lambda n:picker_node(n) and n.get("text")==name, "Staged binary in local storage")
    ui.tap(target)
    # Some picker configurations select the document first, then expose Open.
    ok = briefly(lambda n:picker_node(n) and n.get("class")=="android.widget.Button"
                  and n.get("text","").casefold()=="open",2)
    if ok is not None:
        ui.tap(ok)
    ui.named(name)

def save_and_compare(name, expected):
    click("Save file")
    ui.wait_for(picker_node, "Android CREATE_DOCUMENT picker")
    downloads()
    button = ui.wait_for(lambda n:picker_node(n) and n.get("text","").casefold()=="save"
                         and n.get("enabled")=="true", "Document save action")
    ui.tap(button)
    digest = hashlib.sha256(expected).hexdigest()
    deadline = time.monotonic()+35
    while time.monotonic()<deadline:
        data = ui.run(["adb","exec-out","cat","/sdcard/Download/"+name],"Read explicitly exported binary",required=False)
        if len(data)==len(expected) and hashlib.sha256(data).hexdigest()==digest:
            return digest
        time.sleep(.5)
    raise ui.CheckFailed("Exported destination bytes did not match the original after Save")

def no_public_copy(name):
    result = ui.shell("ls","/sdcard/Download/"+name,required=False)
    if result == "/sdcard/Download/"+name:
        raise ui.CheckFailed("Received file appeared in Downloads before explicit export")

def screenshot(label):
    nodes=ui.tree()
    if any("CUBECHAT2." in str(n.attrib) or n.get("content-desc")=="CubeChat pairing QR code" for n in nodes):
        raise ui.CheckFailed("Refused to capture a key")
    png=ui.run(["adb","exec-out","screencap","-p"],"Capture synthetic attachment UI")
    if not png.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ui.CheckFailed("Invalid attachment screenshot")
    Path(os.environ["RUNNER_TEMP"],"CubeChat-013-"+label+".png").write_bytes(png)

def old_client_received_only_text():
    visible=[]
    for node in ui.tree():
        children=list(node)
        if len(children)==2 and children[1].get("text","").startswith(("You · ","Peer · ")):
            visible.append(children[0].get("text",""))
    if visible != [LEGACY]:
        raise ui.CheckFailed("Old APK displayed unexpected conversation contents")

def proof():
    for phone in (HOST,GUEST):
        phones.select(phone); ui.launch("0"); ui.named("Pair two phones")
    transport = phones.choose_network()
    phones.select(HOST); click("Show my invite"); ui.named("Pairing invite")
    qr = ui.wait_for(lambda n:n.get("content-desc")=="CubeChat pairing QR code", "Real host QR")
    code=ui.decode_card(qr); click("Close")
    phones.select(GUEST)
    ui.shell("am","start","--user","0","-W","-a","android.intent.action.VIEW","-c","android.intent.category.BROWSABLE",
             "-d",code,"-p",ui.APP,label="Import synthetic key card")
    del code
    connected()
    phones.select(HOST); upgrade(); connected()
    data = bytes(range(256))*12288 + b'\x00CubeChat test tail\xff'
    fixture(FILE,data); fixture(DECLINE,bytes(range(256)))
    pick_file(FILE); click("Close")
    phones.send(LEGACY); phones.receipt(LEGACY,"Delivered")
    phones.select(GUEST); ui.named(LEGACY); old_client_received_only_text()
    upgrade()
    click("Review file offer"); ui.named(FILE); ui.named("Awaiting your decision"); ui.named("Accept file")
    no_public_copy(FILE)
    screenshot("offer")
    # Make the deliberate pause deterministic even on a very fast virtual LAN.
    phones.select(HOST); phones.stop()
    phones.select(GUEST); click("Accept file"); click("Pause"); ui.named("Paused")
    phones.stop(); ui.launch("0"); click("Files"); click(FILE); ui.named("Paused")
    no_public_copy(FILE)
    phones.select(HOST); ui.launch("0"); connected()
    phones.select(GUEST); click("Resume")
    ui.wait_for(lambda n:n.get("text")=="Verified","Full authenticated file verification",timeout=180)
    no_public_copy(FILE)
    screenshot("verified")
    digest=save_and_compare(FILE,data)
    ui.report("The 0.1.2 peer received normal readable text over "+transport+" while the new sender held its file offer. The upgraded peer explicitly accepted, persisted a pause across force-stop and verified "+str(len(data))+" bytes. Android Downloads stayed empty until Save. Export SHA-256: "+digest+".")
    # The verified details opened from Files; dismiss both to return to chat.
    click("Close"); click("Close")
    phones.select(HOST); pick_file(DECLINE); click("Close")
    phones.select(GUEST); click("Review file offer"); ui.named(DECLINE); click("Decline"); ui.named("Declined")
    no_public_copy(DECLINE)
    phones.select(HOST); click("Files"); click(DECLINE); ui.named("Declined")
    ui.report("A separately offered file was declined on the recipient. The sender displayed Declined and the recipient produced no file in Downloads.")
    return transport

def remove_test_bridge():
    # The mixed-version baseline can use a test-only bridge on isolated NAT
    # images. Remove every component before claiming a native radio result.
    phones.select(GUEST)
    uid = re.search(r"\buid:(\d+)\b",ui.shell("pm","list","packages","-U",ui.APP))
    if not uid: raise ui.CheckFailed("Could not identify test network rule")
    ui.shell("iptables","-w","-t","nat","-D","OUTPUT","-p","tcp","--dport",phones.APP_PORT,
             "-m","owner","--uid-owner",uid.group(1),"-j","REDIRECT","--to-ports",phones.BRIDGE_PORT)
    ui.run(["adb","reverse","--remove","tcp:"+phones.BRIDGE_PORT],"Remove baseline reverse")
    phones.select(HOST)
    lines=ui.run(["adb","forward","--list"],"Inspect scoped ADB forwards").decode().splitlines()
    for line in lines:
        fields=line.split()
        if len(fields)==3 and fields[0]==HOST and fields[2]=="tcp:"+phones.APP_PORT:
            ui.run(["adb","forward","--remove",fields[1]],"Remove baseline forward")

def restart_pair():
    for serial in (HOST,GUEST):
        phones.select(serial); phones.stop()
    for serial in (HOST,GUEST):
        phones.select(serial); ui.launch("0"); ui.named("Ping")

def radio_file(sender,receiver,name,data,expected_route):
    phones.select(sender); ui.named(expected_route)
    fixture(name,data); pick_file(name); click("Close")
    phones.select(receiver); ui.named(expected_route); click("Review file offer"); ui.named(name)
    click("Accept file")
    ui.wait_for(lambda n:n.get("text")=="Verified","Verified attachment on "+expected_route,100)
    no_public_copy(name)
    digest=save_and_compare(name,data)
    click("Close"); ui.named(expected_route)
    phones.select(sender); ui.named(expected_route)
    click("Files"); click(name); ui.named("Delivered")
    ui.report(expected_route+" transferred "+str(len(data))+" bytes between separate Android radios. Both clients showed the selected route, the sender received a delivery receipt, and the explicit Android export matched SHA-256 "+digest+".")

def bluetooth_status(phone):
    nodes=phone.tree()
    packages=sorted({n.get("package","") for n in nodes if n.get("package","")})
    display=[n.get("text","") for n in nodes if n.get("text","").lower().startswith(
        ("waiting for bluetooth","bluetooth waiting","bluetooth peer authentication","connected over bluetooth",
         "open connection to reconnect bluetooth","pairing request","pair with"))]
    # Only log known state strings. Never log QR data, names, addresses or PINs.
    states=[re.sub(r"(?:[\da-f]{2}:){5}[\da-f]{2}|\b\d{4,}\b","[redacted]",s,flags=re.I)[:110] for s in display]
    diag=phone.shell("dumpsys","bluetooth_manager")
    bonds=re.findall(r"(?im)^.*(?:bond.state.(?:change|transition)|bond_state_changed_callback)[^\n]*$",diag)
    events=phone.shell("logcat","-d","-t","1400",required=False).splitlines()
    categories=("BOND_BONDING","BOND_BONDED","BOND_NONE","bondStateChange","SMP_PAIR","authentication failed",
                "SDP_DISC_CMPL","RFCOMM_Open","read failed, socket might closed")
    tally={s:sum(s.casefold() in row.casefold() for row in events) for s in categories}
    ui.report(phone.serial+" Bluetooth state: windows="+",".join(packages)+" status="+str(states)+
              " bond state events="+str(len(bonds))+" stack event counts="+str(tally))

def connect_bluetooth(host,guest,bt):
    host.choose_bluetooth(); bt.wait_host_ready(host)
    ui.report("The card holder opened its Bluetooth listening service.")
    guest.choose_bluetooth(); bt.select_discovered_peer(guest,host)
    ui.report("The recipient chose the discoverable host in CubeChat.")
    try:
        bt.bond(host,guest)
    except ui.CheckFailed:
        for phone in (host,guest): bluetooth_status(phone)
        ui.report("The initial RFCOMM attempt timed out. Restarting the two virtual Bluetooth controllers and reopening the same chat.")
        for phone in (guest,host):
            phone.shell("am","force-stop",ui.APP)
            phone.shell("svc","bluetooth","disable")
        time.sleep(3)
        for phone in (host,guest): phone.shell("svc","bluetooth","enable")
        time.sleep(4)
        host.shell("am","start","-W","-n",ui.MAIN)
        host.choose_bluetooth(); bt.wait_host_ready(host)
        # The guest retained its chosen host. Resume the same route without
        # canceling an in-flight system bond by opening a second chooser.
        guest.shell("am","start","-W","-n",ui.MAIN)
        try:
            bt.bond(host,guest)
        except ui.CheckFailed:
            for phone in (host,guest): bluetooth_status(phone)
            raise

def radio_proof(baseline_route):
    import cubechat_wifidirect_qa as wifi
    import cubechat_bluetooth_qa as bt
    if baseline_route=="the ADB software TCP bridge":
        remove_test_bridge()
    restart_pair()
    phones.select(HOST); wifi.select_direct(); name=wifi.host_ready()
    phones.select(GUEST); wifi.select_direct(); wifi.choose_host(name)
    wifi.connected_pair(); wifi.verify_group()
    radio_file(GUEST,HOST,"cubechat-p2p.bin",bytes(range(256))*385+b"p2p",wifi.WIFI_STATUS)
    for serial in (HOST,GUEST):
        phones.select(serial); phones.stop()
        ui.shell("svc","wifi","disable"); ui.shell("svc","data","disable")
        ui.shell("svc","bluetooth","enable")
    restart_pair()
    host,guest=bt.Phone(HOST),bt.Phone(GUEST)
    connect_bluetooth(host,guest,bt)
    for phone in (host,guest):
        # Multi-SIM builds namespace their mobile-data setting by subscription.
        # Check the actual IP routes after disabling both services.
        routes = phone.shell("ip","-4","route","show","table","all") + "\n" + phone.shell("ip","-6","route","show","table","all")
        if phone.shell("settings","get","global","wifi_on")!="0" or re.search(
                r"(?m)^default\b[^\n]*\bdev\s+(?:wlan|rmnet|ccmni)\S*",routes):
            raise ui.CheckFailed("Bluetooth test requires Wi-Fi off and no Wi-Fi or cellular default route")
    radio_file(HOST,GUEST,"cubechat-rfcomm.bin",bytes(reversed(range(256)))*257+b"rfcomm",bt.RADIO_STATUS)

if __name__=="__main__":
    try:
        radio_proof(proof())
    except ui.CheckFailed as error:
        print("Attachment acceptance failed: "+str(error),file=sys.stderr)
        sys.exit(1)
