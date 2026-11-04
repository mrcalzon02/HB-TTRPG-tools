package io.github.mrcalzon02.superpositionreader;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.text.style.BackgroundColorSpan;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.AdapterView;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * One native touch-first SPR reader for Android's installed speech engines.
 * This does not extract or ship third-party voices.
 */
public final class MainActivity extends Activity {
    private static final int PICK_BOOK = 70;
    private static final int EXPORT_CHAPTER_WAV = 71;
    private static final int BACK = 0xff121923;
    private static final int PANEL = 0xff1d2b3d;
    private static final int ACCENT = 0xff8bbdff;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    private BookStore store;
    private NarrationCache narrationCache;
    private BookDocument currentBook;
    private ArrayList<BookDocument> library = new ArrayList<>();
    private TextToSpeech tts;
    private boolean ttsReady = false, isPlaying = false;
    private boolean suppressSelection = false;
    private int engineSession = 0, passage = 0, shownChapter = -1, renderedChapter = -1;
    private BackgroundColorSpan currentHighlight;
    private String activeUtterance = "", activeEngine = "";
    private String lastSelectedVoice = "";
    private ArrayList<Voice> voices = new ArrayList<>();
    private ArrayList<String> enginePackages = new ArrayList<>();

    private Spinner bookPicker, enginePicker, voicePicker, chapterPicker;
    private TextView title, text, status, voiceInfo, rateInfo;
    private Button playButton, voiceToggle, renderButton, exportButton;
    private LinearLayout voicePanel;
    private ScrollView readingScroll;
    private SeekBar rateBar;
    private boolean rendering = false;
    private int renderIndex, renderEnd, renderDone, renderCreated, renderChapter;
    private File renderFolder;
    private BookDocument renderBook;
    private String activeRenderId = "";
    private String renderEngine = "", renderVoice = "";
    private float renderRate;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        store = new BookStore(this);
        narrationCache = new NarrationCache(getFilesDir());
        buildUi();
        loadLibraryAsync(true);
        initializeEngine(store.engine());
        if(getIntent()!=null && Intent.ACTION_VIEW.equals(getIntent().getAction())
                && getIntent().getData()!=null) importUri(getIntent().getData());
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if(intent!=null && Intent.ACTION_VIEW.equals(intent.getAction())
                && intent.getData()!=null) importUri(intent.getData());
    }

    private int dp(float n) {return (int)(n*getResources().getDisplayMetrics().density+0.5f);}
    private LinearLayout column() {
        LinearLayout v=new LinearLayout(this);
        v.setOrientation(LinearLayout.VERTICAL);
        return v;
    }
    private LinearLayout row(){
        LinearLayout v=new LinearLayout(this);
        v.setOrientation(LinearLayout.HORIZONTAL);
        v.setGravity(Gravity.CENTER_VERTICAL);
        return v;
    }
    private TextView label(String value, int size){
        TextView v=new TextView(this);
        v.setText(value);
        v.setTextColor(Color.WHITE);
        v.setTextSize(size);
        v.setPadding(dp(5),dp(3),dp(5),dp(3));
        return v;
    }
    private Button button(String value){
        Button b=new Button(this);
        b.setText(value);
        b.setAllCaps(false);
        b.setTextSize(14);
        b.setTextColor(Color.WHITE);
        b.setMinimumHeight(dp(48));
        b.setMinHeight(dp(48));
        b.setPadding(dp(6),0,dp(6),0);
        return b;
    }
    private void addButton(LinearLayout group, Button b){
        group.addView(b,new LinearLayout.LayoutParams(0,dp(50),1));
    }
    private Spinner spinner(LinearLayout host){
        Spinner v=new Spinner(this);
        v.setMinimumHeight(dp(49));
        v.setPadding(dp(6),dp(3),dp(6),dp(3));
        host.addView(v,new LinearLayout.LayoutParams(-1,dp(50)));
        return v;
    }
    private ArrayAdapter<String> adapter(List<String> names){
        ArrayAdapter<String> a=new ArrayAdapter<>(this,android.R.layout.simple_spinner_item,names);
        a.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        return a;
    }

    private void buildUi(){
        getWindow().setStatusBarColor(0xff151b2a);
        getWindow().setNavigationBarColor(0xff151b2a);
        LinearLayout root=column();
        root.setBackgroundColor(BACK);
        root.setPadding(dp(8),dp(3),dp(8),dp(8));
        setContentView(root);

        LinearLayout header=row();
        title=label("SuperPosition Reader",20);
        title.setTypeface(null,Typeface.BOLD);
        header.addView(title,new LinearLayout.LayoutParams(0,dp(52),1));
        Button importButton=button("Import");
        header.addView(importButton,new LinearLayout.LayoutParams(dp(106),dp(50)));
        root.addView(header);
        importButton.setOnClickListener(v->pickBook());

        bookPicker=spinner(root);
        bookPicker.setContentDescription("Books in local library");
        LinearLayout voiceHeader=row();
        voiceToggle=button("Voices & engine ▾");
        addButton(voiceHeader,voiceToggle);
        root.addView(voiceHeader);
        voicePanel=column();
        voicePanel.setBackgroundColor(PANEL);
        voicePanel.setPadding(dp(7),dp(5),dp(7),dp(5));
        root.addView(voicePanel);
        voiceToggle.setOnClickListener(v->{
            boolean showing=voicePanel.getVisibility()==View.VISIBLE;
            voicePanel.setVisibility(showing?View.GONE:View.VISIBLE);
            voiceToggle.setText(showing?"Voices & engine ▸":"Voices & engine ▾");
        });
        voicePanel.addView(label("Installed Android speech engine",13));
        enginePicker=spinner(voicePanel);
        voicePanel.addView(label("Voice (exact Android engine identifiers)",13));
        voicePicker=spinner(voicePanel);
        voiceInfo=label("Initializing Android speech engine…",12);
        voiceInfo.setTextColor(ACCENT);
        voicePanel.addView(voiceInfo);
        LinearLayout voicesRow=row();
        Button refresh=button("Refresh voices");
        Button manage=button("Android voice settings");
        addButton(voicesRow,refresh); addButton(voicesRow,manage);
        voicePanel.addView(voicesRow);
        refresh.setOnClickListener(v->{
            if(ttsReady)populateVoices();
            else initializeEngine(activeEngine);
        });
        manage.setOnClickListener(v->openVoiceSettings());
        Button shareVoices=button("Share exact voice inventory");
        voicePanel.addView(shareVoices,new LinearLayout.LayoutParams(-1,dp(50)));
        shareVoices.setOnClickListener(v->shareVoiceInventory());
        rateInfo=label("Speech rate",12);
        voicePanel.addView(rateInfo);
        rateBar=new SeekBar(this);
        rateBar.setMax(175);
        rateBar.setMin(50);
        rateBar.setProgress(Math.round(store.rate()*100));
        voicePanel.addView(rateBar);
        rateInfo.setText(String.format(Locale.ROOT,"Speech rate: %.2f×",store.rate()));
        rateBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            @Override public void onProgressChanged(SeekBar bar,int progress,boolean fromUser){
                float rate=progress/100f;
                rateInfo.setText(String.format(Locale.ROOT,"Speech rate: %.2f×",rate));
                if(fromUser){
                    cancelRender("Changing speech rate stopped chapter rendering; completed clips are retained.");
                    store.setRate(rate);
                    if(ttsReady)tts.setSpeechRate(rate);
                    updateAudioButtons();
                }
            }
            @Override public void onStartTrackingTouch(SeekBar bar){}
            @Override public void onStopTrackingTouch(SeekBar bar){}
        });
        if(!store.voice(store.engine()).isEmpty()){
            voicePanel.setVisibility(View.GONE);
            voiceToggle.setText("Voices & engine ▸");
        }

        LinearLayout controls=row();
        Button prev=button("◀◀");
        playButton=button("▶ Read");
        Button stop=button("■ Stop");
        Button next=button("▶▶");
        addButton(controls,prev);addButton(controls,playButton);
        addButton(controls,stop);addButton(controls,next);
        root.addView(controls);
        prev.setContentDescription("Previous passage");
        next.setContentDescription("Next passage");
        stop.setContentDescription("Stop narration");
        prev.setOnClickListener(v->move(-1));
        next.setOnClickListener(v->move(1));
        stop.setOnClickListener(v->stopNarration("Stopped. Press Read to restart this passage."));
        playButton.setOnClickListener(v->{
            if(isPlaying) stopNarration("Stopped. Press Read to restart this passage.");
            else startPassage();
        });
        chapterPicker=spinner(root);
        chapterPicker.setContentDescription("Chapter selection");
        LinearLayout renderControls=row();
        renderButton=button("Render chapter");
        exportButton=button("Export WAV");
        addButton(renderControls,renderButton);
        addButton(renderControls,exportButton);
        root.addView(renderControls);
        renderButton.setOnClickListener(v->{
            if(rendering)cancelRender("Chapter generation stopped. Finished clips remain cached.");
            else startRenderChapter();
        });
        exportButton.setOnClickListener(v->exportChapterWav());
        status=label("Choose a book to begin.",12);
        status.setTextColor(ACCENT);
        root.addView(status);

        readingScroll=new ScrollView(this);
        readingScroll.setFillViewport(true);
        text=label("Import an EPUB or TXT, or open one of the bundled stories.",18);
        text.setTextColor(0xffeeeeef);
        text.setLineSpacing(dp(4),1.12f);
        text.setPadding(dp(11),dp(14),dp(11),dp(24));
        readingScroll.addView(text);
        root.addView(readingScroll,new LinearLayout.LayoutParams(-1,0,1));

        bookPicker.setOnItemSelectedListener(selection((index)->{
            if(!suppressSelection&&index>=0&&index<library.size())openBook(library.get(index));
        }));
        chapterPicker.setOnItemSelectedListener(selection((index)->{
            if(!suppressSelection&&currentBook!=null&&index<currentBook.chapters.size()){
                cancelRender(null);
                stopNarration(null);
                passage=currentBook.chapters.get(index).start;
                store.setPosition(currentBook,passage);
                showCurrent(0,0);
                updateAudioButtons();
            }
        }));
        voicePicker.setOnItemSelectedListener(selection(index->{
            if(suppressSelection||!ttsReady||index<0||index>=voices.size())return;
            applyVoice(voices.get(index),true);
        }));
        enginePicker.setOnItemSelectedListener(selection(index->{
            if(suppressSelection||index<0||index>=enginePackages.size())return;
            String chosen=enginePackages.get(index);
            if(!chosen.equals(activeEngine)){
                store.setEngine(chosen);
                initializeEngine(chosen);
            }
        }));
    }

    private interface Selection {void onSelect(int position);}
    private AdapterView.OnItemSelectedListener selection(Selection listener){
        return new AdapterView.OnItemSelectedListener(){
            @Override public void onItemSelected(AdapterView<?> parent,View view,int index,long id){
                listener.onSelect(index);
            }
            @Override public void onNothingSelected(AdapterView<?> parent){}
        };
    }

    private void pickBook(){
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{
            "application/epub+zip","text/plain","text/markdown","text/html",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream"
        });
        startActivityForResult(intent,PICK_BOOK);
    }
    @Override protected void onActivityResult(int code,int result,Intent data){
        super.onActivityResult(code,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null)return;
        if(code==PICK_BOOK)importUri(data.getData());
        if(code==EXPORT_CHAPTER_WAV)writeChapterWav(data.getData());
    }
    private void importUri(Uri uri){
        setStatus("Importing document privately…");
        io.execute(()->{
            try{
                String name="Document.epub";
                try(Cursor c=getContentResolver().query(uri,null,null,null,null)){
                    if(c!=null&&c.moveToFirst()){
                        int col=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                        if(col>=0&&c.getString(col)!=null)name=c.getString(col);
                    }
                }
                ByteArrayOutputStream output=new ByteArrayOutputStream();
                try(InputStream input=getContentResolver().openInputStream(uri)){
                    if(input==null)throw new IllegalStateException("Cannot read document URI");
                    byte[] buffer=new byte[8192];int got;
                    while((got=input.read(buffer))!=-1){
                        if(output.size()+got>BookDocument.MAX_SOURCE_BYTES)
                            throw new IllegalArgumentException("Document exceeds 16 MiB limit");
                        output.write(buffer,0,got);
                    }
                }
                BookDocument imported=store.save(name,output.toByteArray());
                ui.post(()->loadLibraryAsync(false));
                ui.post(()->setStatus("Imported "+imported.title+" into the private SPR library."));
            }catch(Exception error){ui.post(()->setStatus("Import failed: "+error.getMessage()));}
        });
    }
    private void loadLibraryAsync(boolean seed){
        io.execute(()->{
            String previousSelection=store.selected();
            if(seed){
                for(String file:new String[]{"bdo-current.epub","nowhere-s1.epub",
                        "nowhere-s2.epub","nowhere-s3.epub"}){
                    try(InputStream input=getAssets().open("books/"+file)){
                        ByteArrayOutputStream output=new ByteArrayOutputStream();
                        byte[] buffer=new byte[8192];int n;
                        while((n=input.read(buffer))!=-1)output.write(buffer,0,n);
                        store.save(file,output.toByteArray());
                    }catch(Exception ignored){
                        // Source builds without generated book assets still import user books.
                    }
                }
                if(!previousSelection.isEmpty())store.setSelected(previousSelection);
            }
            ArrayList<BookDocument> available=store.library();
            String selected=store.selected();
            ui.post(()->{
                library=available;
                ArrayList<String> labels=new ArrayList<>();
                for(BookDocument book:library)labels.add(book.title);
                suppressSelection=true;
                bookPicker.setAdapter(adapter(labels));
                suppressSelection=false;
                if(!library.isEmpty()){
                    int index=0;
                    for(int i=0;i<library.size();i++)
                        if(library.get(i).id.equals(selected))index=i;
                    suppressSelection=true;
                    bookPicker.setSelection(index);
                    suppressSelection=false;
                    openBook(library.get(index));
                }else setStatus("Import a document to begin.");
            });
        });
    }
    private void openBook(BookDocument book){
        cancelRender(null);
        stopNarration(null);
        currentBook=book;
        store.setSelected(book.id);
        passage=store.position(book);
        ArrayList<String> labels=new ArrayList<>();
        for(int i=0;i<book.chapters.size();i++)
            labels.add((i+1)+" · "+book.chapters.get(i).title);
        suppressSelection=true;
        chapterPicker.setAdapter(adapter(labels));
        shownChapter=-1;
        renderedChapter=-1;
        currentHighlight=null;
        chapterPicker.setSelection(book.chapterFor(passage));
        suppressSelection=false;
        title.setText("SuperPosition Reader");
        showCurrent(0,0);
        setStatus(book.title+" · "+book.chapters.size()+" chapters · "+book.passages.size()+" passages");
        updateAudioButtons();
    }
    private void showCurrent(int rangeStart,int rangeEnd){
        if(currentBook==null)return;
        int chapter=currentBook.chapterFor(passage);
        if(chapter!=shownChapter){
            shownChapter=chapter;
            suppressSelection=true;
            chapterPicker.setSelection(chapter);
            suppressSelection=false;
        }
        if(chapter!=renderedChapter){
            renderedChapter=chapter;
            currentHighlight=null;
            text.setText(new SpannableStringBuilder(currentBook.chapterText(chapter)),
                    TextView.BufferType.SPANNABLE);
        }
        Spannable markup=(Spannable)text.getText();
        if(currentHighlight!=null)markup.removeSpan(currentHighlight);
        int offset=currentBook.offsetInChapter(chapter,passage);
        int start=Math.min(markup.length(),offset+Math.max(0,rangeStart));
        int spokenEnd=rangeEnd>rangeStart ? rangeEnd : currentBook.passages.get(passage).length();
        int end=Math.min(markup.length(),offset+spokenEnd);
        if(end>start){
            currentHighlight=new BackgroundColorSpan(0xff66501e);
            markup.setSpan(currentHighlight,start,end,android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
        if(rangeEnd==0){
            readingScroll.post(()->{
                if(text.getLayout()!=null){
                    int line=text.getLayout().getLineForOffset(
                            Math.min(start,text.length()));
                    int top=text.getLayout().getLineTop(line);
                    readingScroll.smoothScrollTo(0,Math.max(0,top-dp(40)));
                }
            });
        }
    }
    private void move(int delta){
        if(currentBook==null)return;
        cancelRender(null);
        stopNarration(null);
        passage=Math.max(0,Math.min(currentBook.passages.size()-1,passage+delta));
        store.setPosition(currentBook,passage);
        showCurrent(0,0);
        setStatus("Passage "+(passage+1)+" of "+currentBook.passages.size());
    }

    private void initializeEngine(String packageName){
        cancelRender(null);
        stopNarration(null);
        int token=++engineSession;
        ttsReady=false;
        if(tts!=null){tts.shutdown();tts=null;}
        activeEngine=packageName==null?"":packageName;
        setStatus("Initializing Android text-to-speech…");
        TextToSpeech instance=new TextToSpeech(this,result->ui.post(()->{
            if(token!=engineSession)return;
            if(result!=TextToSpeech.SUCCESS || tts==null){
                ttsReady=false;setStatus("Android speech engine failed to initialize.");
                return;
            }
            ttsReady=true;
            tts.setSpeechRate(store.rate());
            tts.setOnUtteranceProgressListener(progressListener());
            populateEngines();
            populateVoices();
        }),activeEngine.isEmpty()?null:activeEngine);
        tts=instance;
    }
    private void populateEngines(){
        if(tts==null)return;
        String selected=activeEngine.isEmpty()?tts.getDefaultEngine():activeEngine;
        List<TextToSpeech.EngineInfo> engines=tts.getEngines();
        ArrayList<String> labels=new ArrayList<>();
        enginePackages.clear();
        int position=0;
        for(TextToSpeech.EngineInfo engine:engines){
            if(engine.name.equals(selected))position=enginePackages.size();
            enginePackages.add(engine.name);
            labels.add(engine.label+" · "+engine.name);
        }
        suppressSelection=true;
        enginePicker.setAdapter(adapter(labels));
        if(!labels.isEmpty())enginePicker.setSelection(position);
        suppressSelection=false;
        activeEngine=selected==null?"":selected;
    }
    private void populateVoices(){
        if(tts==null||!ttsReady)return;
        Set<Voice> available=tts.getVoices();
        voices.clear();
        if(available!=null)voices.addAll(available);
        voices.sort(Comparator
            .comparingInt((Voice v)->{
                String name=v.getName().toLowerCase(Locale.ROOT);
                if(VoiceCatalog.expectedBritishVoices().containsKey(name))return 0;
                if(VoiceCatalog.isBritish(v.getLocale().getLanguage(),v.getLocale().getCountry()))return 1;
                return v.isNetworkConnectionRequired()?3:2;
            }).thenComparing(v->v.getLocale().toLanguageTag())
              .thenComparing(Voice::getName));
        ArrayList<String> labels=new ArrayList<>();
        Set<String> present=new HashSet<>();
        for(Voice v:voices){
            present.add(v.getName().toLowerCase(Locale.ROOT));
            boolean missing=v.getFeatures()!=null &&
                    v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED);
            labels.add(VoiceCatalog.label(v.getName())+" ["+v.getLocale().toLanguageTag()+"]"+
                    (missing?" · download needed":v.isNetworkConnectionRequired()?" · network":" · on-device"));
        }
        String saved=store.voice(activeEngine);
        String preferred=saved.isEmpty()?"en-gb-x-rjs-local":saved;
        int selected=-1;
        for(int i=0;i<voices.size();i++){
            Voice v=voices.get(i);
            if(v.getName().equalsIgnoreCase(preferred)){selected=i;break;}
        }
        if(selected<0 && tts.getVoice()!=null){
            for(int i=0;i<voices.size();i++)
                if(voices.get(i).getName().equals(tts.getVoice().getName())){selected=i;break;}
        }
        if(selected<0){
            for(int i=0;i<voices.size();i++)if(!voices.get(i).isNetworkConnectionRequired()){
                selected=i;break;
            }
        }
        suppressSelection=true;
        voicePicker.setAdapter(adapter(labels));
        if(selected>=0)voicePicker.setSelection(selected);
        suppressSelection=false;
        if(selected>=0)applyVoice(voices.get(selected),false);
        StringBuilder inventory=new StringBuilder("British voices: ");
        for(String key:VoiceCatalog.expectedBritishVoices().keySet()){
            if(inventory.length()>16)inventory.append("  ");
            inventory.append(VoiceCatalog.expectedBritishVoices().get(key)).append(present.contains(key)?" ✓":" —");
        }
        voiceInfo.setText(inventory.toString()+
                "\nOnly voices returned by the selected engine can be used; unavailable voices are not bundled.");
        setStatus("Android engine ready: "+activeEngine+" · "+voices.size()+" voices");
    }
    private void applyVoice(Voice voice,boolean userChoice){
        if(tts==null||!ttsReady)return;
        cancelRender(null);
        stopNarration(null);
        boolean download=voice.getFeatures()!=null &&
                voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED);
        if(tts.setVoice(voice)!=TextToSpeech.SUCCESS){
            setStatus("Engine refused "+voice.getName()+". Check Android voice settings.");
            return;
        }
        lastSelectedVoice=voice.getName();
        if(userChoice)store.setVoice(activeEngine,voice.getName());
        updateAudioButtons();
        if(download)setStatus("Voice needs downloading: "+voice.getName()+". Open Android voice settings.");
        else if(voice.isNetworkConnectionRequired())
            setStatus("Network-required Android voice selected: "+voice.getName());
        else setStatus("On-device Android voice selected: "+voice.getName());
    }
    private void shareVoiceInventory(){
        if(!ttsReady){
            setStatus("The Android voice engine is not initialized.");return;
        }
        StringBuilder report=new StringBuilder();
        report.append("SuperPosition Reader — Android TTS inventory\n")
              .append("Engine: ").append(activeEngine).append("\n");
        for(Voice voice:voices){
            boolean missing=voice.getFeatures()!=null &&
                voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED);
            report.append(voice.getName()).append(" | ")
                  .append(voice.getLocale().toLanguageTag()).append(" | ")
                  .append(missing?"download required":voice.isNetworkConnectionRequired()
                          ?"network required":"on-device").append("\n");
        }
        Intent send=new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT,report.toString());
        startActivity(Intent.createChooser(send,"Share Android TTS voice inventory"));
    }
    private void openVoiceSettings(){
        try{
            startActivity(new Intent("com.android.settings.TTS_SETTINGS"));
        }catch(ActivityNotFoundException error){
            try{startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA));}
            catch(ActivityNotFoundException ignored){
                setStatus("Open Android Settings → Accessibility → Text-to-speech output.");
            }
        }
    }
    private UtteranceProgressListener progressListener(){
        return new UtteranceProgressListener(){
            @Override public void onStart(String id){}
            @Override public void onDone(String id){ui.post(()->{
                if(rendering&&id.equals(activeRenderId)){
                    completedRenderSegment();
                    return;
                }
                if(!id.equals(activeUtterance)||!isPlaying||currentBook==null)return;
                if(passage+1>=currentBook.passages.size()){
                    stopNarration("Reached the end of the document.");
                }else{
                    passage++;
                    store.setPosition(currentBook,passage);
                    speakCurrent();
                }
            });}
            @Override public void onError(String id){ui.post(()->{
                if(rendering&&id.equals(activeRenderId))
                    cancelRender("The Android TTS engine failed to render passage "+(renderIndex+1));
                else if(id.equals(activeUtterance))
                    stopNarration("Android TTS could not speak this passage.");
            });}
            @Override public void onError(String id,int error){ui.post(()->{
                if(rendering&&id.equals(activeRenderId))
                    cancelRender("TTS render error "+error+" at passage "+(renderIndex+1)+
                            ". Previously rendered audio is retained.");
                else if(id.equals(activeUtterance))
                    stopNarration("Android TTS error "+error+
                        ". Check voice installation or choose another installed voice.");
            });}
            @Override public void onRangeStart(String id,int start,int end,int frame){
                ui.post(()->{
                    if(id.equals(activeUtterance)&&isPlaying&&currentBook!=null &&
                            start>=0&&end<=currentBook.passages.get(passage).length())
                        showCurrent(start,end);
                });
            }
        };
    }
    private void startPassage(){
        if(rendering){setStatus("Finish or cancel chapter rendering before reading.");return;}
        if(!ttsReady||tts==null){setStatus("No working Android speech engine is selected.");return;}
        if(currentBook==null){setStatus("Import or choose a book first.");return;}
        isPlaying=true;
        playButton.setText("■ Stop");
        speakCurrent();
    }
    private void speakCurrent(){
        if(!ttsReady||tts==null||currentBook==null)return;
        String passageText=currentBook.passages.get(passage);
        activeUtterance="read-"+System.nanoTime();
        showCurrent(0,0);
        int result=tts.speak(passageText,TextToSpeech.QUEUE_FLUSH,new Bundle(),activeUtterance);
        if(result!=TextToSpeech.SUCCESS)stopNarration("Android speech engine rejected the passage.");
        else setStatus("Reading "+currentBook.title+" · passage "+(passage+1)+
                " / "+currentBook.passages.size()+" · "+lastSelectedVoice);
    }
    private void stopNarration(String message){
        boolean wasReading=isPlaying;
        isPlaying=false;
        activeUtterance="";
        if(tts!=null&&wasReading)tts.stop();
        if(playButton!=null)playButton.setText("▶ Read");
        if(message!=null)setStatus(message);
    }
    private void updateAudioButtons(){
        if(renderButton==null||exportButton==null)return;
        renderButton.setEnabled(ttsReady&&currentBook!=null);
        renderButton.setText(rendering?"■ Cancel render":"Render chapter");
        boolean ready=false;
        if(!rendering&&currentBook!=null&&ttsReady){
            try {
                File folder=narrationCache.folder(currentBook,activeEngine,lastSelectedVoice,
                                                  store.rate());
                int ch=Math.max(0,chapterPicker.getSelectedItemPosition());
                ready=ch<currentBook.chapters.size()&&NarrationCache.completed(
                        folder,currentBook.chapters.get(ch));
            }catch(Exception ignored){}
        }
        exportButton.setEnabled(ready);
    }

    private void startRenderChapter(){
        if(!ttsReady||tts==null||currentBook==null){
            setStatus("Select a book and a working Android voice first.");return;
        }
        stopNarration(null);
        renderBook=currentBook;
        renderChapter=Math.max(0,chapterPicker.getSelectedItemPosition());
        if(renderChapter>=currentBook.chapters.size())return;
        BookDocument.Chapter chapter=currentBook.chapters.get(renderChapter);
        renderIndex=chapter.start;
        renderEnd=chapter.end;
        renderDone=renderCreated=0;
        renderEngine=activeEngine;
        renderVoice=lastSelectedVoice;
        renderRate=store.rate();
        try{
            renderFolder=narrationCache.folder(renderBook,renderEngine,renderVoice,renderRate);
            rendering=true;
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            updateAudioButtons();
            nextRenderSegment();
        }catch(Exception error){
            cancelRender("Cannot start chapter rendering: "+error.getMessage());
        }
    }
    private void nextRenderSegment(){
        if(!rendering)return;
        while(renderIndex<renderEnd && WavAssembler.isValid(
                NarrationCache.segment(renderFolder,renderIndex))){
            renderDone++;
            renderIndex++;
        }
        if(renderIndex>=renderEnd){
            rendering=false;
            activeRenderId="";
            getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            updateAudioButtons();
            setStatus("Chapter rendered: "+renderDone+" passages ("+renderCreated+
                    " newly generated). Export WAV is ready.");
            return;
        }
        File target=NarrationCache.segment(renderFolder,renderIndex);
        File temporary=new File(renderFolder,target.getName()+".partial.wav");
        if(temporary.exists())temporary.delete();
        activeRenderId="spr-render-"+System.nanoTime();
        int result=tts.synthesizeToFile(renderBook.passages.get(renderIndex),
                new Bundle(),temporary,activeRenderId);
        if(result!=TextToSpeech.SUCCESS){
            cancelRender("Android engine refused to render passage "+(renderIndex+1));
            return;
        }
        setStatus("Rendering chapter "+(renderChapter+1)+
                " · "+renderDone+"/"+(renderEnd-renderBook.chapters.get(renderChapter).start)+
                " complete · "+renderVoice);
    }
    private void completedRenderSegment(){
        File target=NarrationCache.segment(renderFolder,renderIndex);
        File temporary=new File(renderFolder,target.getName()+".partial.wav");
        if(!WavAssembler.isValid(temporary)){
            cancelRender("Engine did not produce valid PCM16 WAV audio for passage "+(renderIndex+1));
            return;
        }
        if(target.exists()&&!target.delete()){
            cancelRender("Cannot replace corrupted cached narration.");
            return;
        }
        if(!temporary.renameTo(target)){
            cancelRender("Unable to preserve rendered audio in the private cache.");
            return;
        }
        renderDone++;
        renderCreated++;
        renderIndex++;
        nextRenderSegment();
    }
    private void cancelRender(String message){
        if(rendering){
            rendering=false;
            activeRenderId="";
            if(tts!=null)tts.stop();
            getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
        updateAudioButtons();
        if(message!=null)setStatus(message);
    }
    private void exportChapterWav(){
        if(currentBook==null||rendering)return;
        try{
            File folder=narrationCache.folder(currentBook,activeEngine,lastSelectedVoice,store.rate());
            int chapter=Math.max(0,chapterPicker.getSelectedItemPosition());
            if(chapter>=currentBook.chapters.size()||
                    !NarrationCache.completed(folder,currentBook.chapters.get(chapter))){
                setStatus("Render every passage in the selected chapter before export.");
                return;
            }
            Intent choose=new Intent(Intent.ACTION_CREATE_DOCUMENT);
            choose.addCategory(Intent.CATEGORY_OPENABLE);
            choose.setType("audio/wav");
            choose.putExtra(Intent.EXTRA_TITLE,currentBook.id+"-chapter-"+
                    String.format(Locale.ROOT,"%03d",chapter+1)+".wav");
            startActivityForResult(choose,EXPORT_CHAPTER_WAV);
        }catch(Exception error){setStatus("Cannot prepare chapter export: "+error.getMessage());}
    }
    private void writeChapterWav(Uri uri){
        if(currentBook==null)return;
        BookDocument book=currentBook;
        int chapter=Math.max(0,chapterPicker.getSelectedItemPosition());
        String engine=activeEngine, voice=lastSelectedVoice;
        float rate=store.rate();
        setStatus("Writing full chapter WAV to selected document…");
        io.execute(()->{
            try{
                File folder=narrationCache.folder(book,engine,voice,rate);
                List<File> sources=NarrationCache.chapterFiles(folder,book.chapters.get(chapter));
                try(OutputStream out=getContentResolver().openOutputStream(uri,"w")){
                    if(out==null)throw new IllegalStateException("Cannot write chosen document");
                    WavAssembler.combine(sources,out);
                }
                ui.post(()->setStatus("Chapter WAV exported to the selected Android document."));
            }catch(Exception error){
                ui.post(()->setStatus("Chapter export failed: "+error.getMessage()));
            }
        });
    }
    private void setStatus(String message){if(status!=null)status.setText(message);}

    @Override public void onPause(){
        super.onPause();
        if(currentBook!=null)store.setPosition(currentBook,passage);
    }
    @Override public void onDestroy(){
        ++engineSession;
        cancelRender(null);
        stopNarration(null);
        if(tts!=null){tts.shutdown();tts=null;}
        io.shutdownNow();
        super.onDestroy();
    }
}
