"""UI acceptance on two fresh virtual phones. Only synthetic chat text is reported."""
import os
import sys
import time
from pathlib import Path

import cubechat_android_qa as ui
import cubechat_android_two_qa as phones

HOST, GUEST = phones.HOST, phones.GUEST
NEW = ".github/cubechat-candidate/CubeChat.apk"
PREVIOUS = "QueuedBeforeUpgrade"
LIVE = "ReplyAfterUpgrade"
ALPHA = "FieldTeam"
BETA = "Workshop"
DRAFT = "AlphaDraft"
SECOND = "BetaDraft"
SHARED = "ShareSuggestion"

def click(label):
    ui.tap(ui.named(label))

def field():
    return ui.wait_for(lambda n: n.get("class") == "android.widget.EditText", "Editable field")

def type_text(txt, replace=False):
    ui.tap(field())
    if replace:
        ui.shell("input","keyevent","KEYCODE_MOVE_END")
        ui.shell("input","keyevent",*(["67"]*32))
    ui.shell("input", "text", txt)

def hide_keyboard():
    ime=ui.shell("dumpsys","input_method")
    if "mInputShown=true" in ime or "isInputViewShown=true" in ime:
        ui.shell("input","keyevent","KEYCODE_BACK")

def draft_is(text):
    ui.wait_for(lambda n: n.get("class")=="android.widget.EditText" and n.get("text")==text,
                "Expected synthetic composer contents")

def card():
    node=ui.wait_for(lambda n:n.get("content-desc")=="CubeChat pairing QR code","QR on real screen")
    code=ui.decode_card(node)
    click("Close")
    return code

def import_card(value):
    ui.shell("am","start","--user","0","-W","-a","android.intent.action.VIEW","-c",
             "android.intent.category.BROWSABLE","-d",value,"-p",ui.APP,label="Import a synthetic physical card")

def upgrade():
    response=ui.run(["adb","install","-r", NEW],"Update installed APK in place")
    if b"Success" not in response or "versionCode=3" not in ui.shell("dumpsys","package",ui.APP):
        raise ui.CheckFailed("In-place Android build 3 upgrade failed")
    ui.launch("0")

def rename(label):
    click("Conversations"); click("Rename contact"); type_text(label,replace=True)
    hide_keyboard(); click("Save"); ui.named(label)

def switch(label):
    click("Conversations"); click(label)
    # A previous conversation also has a Ping button. Wait for this selection.
    ui.named("Ping"); ui.named(label)

def connected():
    ui.wait_for(lambda n:n.get("text","").startswith("Connected"),
                "An authenticated session to the selected contact",timeout=75)

def send_shared():
    ui.shell("am","start","--user","0","-W","-a","android.intent.action.SEND","-t","text/plain",
             "--es","android.intent.extra.TEXT",SHARED,"-p",ui.APP,label="Share using the public Android intent")
    ui.named("Share to CubeChat")
    click(ALPHA)
    ui.named("Keep your current draft?")

def screenshot(name):
    nodes=ui.tree()
    if any("CUBECHAT2." in str(n.attrib) or n.get("content-desc")=="CubeChat pairing QR code" for n in nodes):
        raise ui.CheckFailed("Cannot export an invitation screen")
    png=ui.run(["adb","exec-out","screencap","-p"],"Capture synthetic UI")
    if not png.startswith(b"\x89PNG"): raise ui.CheckFailed("Invalid capture")
    Path(os.environ["RUNNER_TEMP"],"CubeChat-012-"+name+".png").write_bytes(png)

def screen_blanked():
    # Compare the actual PNG's central content area, excluding the system bars.
    path=Path(os.environ["RUNNER_TEMP"],"CubeChatBlackFrame.java")
    if not path.is_file():
        path.write_text("""import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
class CubeChatBlackFrame {
    public static void main(String[] args) throws Exception {
        BufferedImage image=ImageIO.read(System.in);
        for(int y=image.getHeight()/8;y<image.getHeight()*7/8;y+=2)
            for(int x=image.getWidth()/10;x<image.getWidth()*9/10;x+=2){
                int c=image.getRGB(x,y);
                if(((c>>16)&255)>=20 || ((c>>8)&255)>=20 || (c&255)>=20){System.out.print("visible");return;}
            }
        System.out.print("hidden");
    }
}
""")
    png=ui.run(["adb","exec-out","screencap","-p"],"Check protected screen")
    return ui.run(["java","-Djava.awt.headless=true",str(path)],"Inspect rendered capture",data=png)==b"hidden"

def proof():
    for phone in (HOST,GUEST):
        phones.select(phone); ui.launch("0"); ui.named("Pair two phones")
    transport=phones.choose_network()
    phones.select(HOST); click("Show my invite"); first=card(); phones.stop()
    phones.select(GUEST); import_card(first)
    ui.wait_for(lambda n:n.get("text","").startswith("Peer "),"Previous app paired")
    phones.send(PREVIOUS); phones.receipt(PREVIOUS,"Queued")
    upgrade(); phones.receipt(PREVIOUS,"Queued")
    phones.select(HOST); ui.launch("0"); ui.named(PREVIOUS)
    phones.select(GUEST); phones.receipt(PREVIOUS,"Delivered")
    click("Ping")
    ui.wait_for(lambda n:n.get("text","").startswith("No reply on"),"Previous app cannot answer a current ping",35)
    ui.report("0.1.1 upgraded in place with a pending message. The 0.1.2 sender delivered that same message to 0.1.1 over "+transport+". A 0.1.1 peer did not generate a false positive ping.")
    phones.select(HOST); upgrade(); ui.named(PREVIOUS)
    phones.send(LIVE); phones.receipt(LIVE,"Delivered")
    phones.select(GUEST); ui.named(LIVE); click("Ping")
    ui.wait_for(lambda n:"Peer replied over" in n.get("text","") and "ms" in n.get("text",""),"Fresh peer reply with route and RTT")
    phones.select(HOST); rename(ALPHA)
    type_text(DRAFT); hide_keyboard()
    click("Conversations"); click("Add contact"); click("Create new invite")
    second=card()
    if second==first: raise ui.CheckFailed("Second card reused first credentials")
    rename(BETA); type_text(SECOND); hide_keyboard()
    switch(ALPHA); draft_is(DRAFT); ui.named(PREVIOUS)
    phones.stop(); ui.launch("0"); draft_is(DRAFT)
    switch(BETA); draft_is(SECOND)
    if any(n.get("text")==PREVIOUS for n in ui.tree()): raise ui.CheckFailed("Chat history crossed conversations")
    send_shared(); click("Keep draft"); draft_is(DRAFT)
    send_shared(); click("Replace"); draft_is(SHARED)
    connected()
    # The draft itself is expected to display this text. An outgoing message
    # with the same text would also appear as a separate non-editable bubble.
    if any(n.get("text")==SHARED and n.get("class")=="android.widget.TextView" for n in ui.tree()):
        raise ui.CheckFailed("Shared text entered the outbox before Send")
    phones.select(GUEST)
    connected()
    if any(n.get("text")==SHARED for n in ui.tree()): raise ui.CheckFailed("Android share transmitted without Send")
    phones.select(HOST); click("Send"); phones.receipt(SHARED,"Delivered")
    phones.select(GUEST); ui.named(SHARED)
    import_card(second); ui.named("Conversation 2")
    import_card(first); ui.named("Conversation 1"); ui.named(SHARED)
    click("Conversations")
    rows=ui.tree()
    if sum(n.get("resource-id")=="android:id/text1" and n.get("text","").startswith("Conversation ") for n in rows)!=2:
        raise ui.CheckFailed("Expected exactly two contact rows after rescanning")
    click("Close")
    ui.report("Two distinct cards coexisted. A repeated card reopened the original history. Encrypted drafts survived switching and force-stop. Android sharing respected Keep draft and Replace and sent only on Send.")
    phones.select(HOST); click("Pairing"); click("Find in conversation")
    type_text("QueuedBefore"); hide_keyboard()
    ui.wait_for(lambda n:n.get("text","").startswith("1 match in the latest"),"Local search found one matching message")
    result=ui.wait_for(lambda n:PREVIOUS in n.get("text","") and " · " in n.get("text",""),"Specific search result")
    ui.tap(result); ui.named(PREVIOUS)
    click("Pairing"); click("Screen privacy"); click("Turn on"); time.sleep(.8)
    if not screen_blanked(): raise ui.CheckFailed("Screen privacy failed to hide conversation")
    click("Pairing"); click("Show my invite")
    ui.named("Pairing invite")
    if not screen_blanked(): raise ui.CheckFailed("Screen privacy failed to hide physical key card")
    click("Close")
    phones.stop(); ui.launch("0"); ui.named("Ping")
    if not screen_blanked(): raise ui.CheckFailed("Screen privacy lost after restart")
    click("Pairing"); click("Screen privacy"); click("Turn off"); time.sleep(.8)
    if screen_blanked(): raise ui.CheckFailed("Could not restore normal screen display")
    connected(); click("Ping")
    ui.wait_for(lambda n:"Peer replied over" in n.get("text",""),"New positive ping after reconnect")
    screenshot("chat")
    click("Conversations"); ui.named(BETA); screenshot("contacts")
    ui.report("Positive end-client ping with RTT, local message search and screen privacy passed. Android capture blanked both the conversation and the open QR, persisted after restart and returned to normal on opt-out.")

if __name__=="__main__":
    try: proof()
    except ui.CheckFailed as error:
        print("Acceptance failed: "+str(error),file=sys.stderr);sys.exit(1)
