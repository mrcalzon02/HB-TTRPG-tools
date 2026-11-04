package io.github.mrcalzon02.superpositionreader;

import android.text.Html;
import android.util.Xml;

import org.json.JSONArray;
import org.json.JSONObject;
import org.xmlpull.v1.XmlPullParser;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/** Private, reflowed book text: one source hash, real EPUB spine chapters and TTS passages. */
public final class BookDocument {
    public static final int MAX_SOURCE_BYTES = 16 * 1024 * 1024;
    private static final int MAX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024;
    private static final int MAX_ZIP_ENTRIES = 3000;

    public final String id;
    public final String title;
    public final ArrayList<String> passages;
    public final ArrayList<Chapter> chapters;

    public static final class Chapter {
        public final String title;
        public final int start;
        public final int end;
        public Chapter(String title, int start, int end) {
            this.title = title; this.start = start; this.end = end;
        }
    }
    private static final class Section {
        final String title;
        final String text;
        Section(String title, String text) { this.title=title; this.text=text; }
    }
    private BookDocument(String id, String title, ArrayList<String> passages,
                         ArrayList<Chapter> chapters) {
        this.id=id; this.title=title; this.passages=passages; this.chapters=chapters;
    }

    public static BookDocument fromBytes(String name, byte[] source) throws Exception {
        if (source == null || source.length == 0 || source.length > MAX_SOURCE_BYTES)
            throw new IllegalArgumentException("Book must be between 1 byte and 16 MiB");
        String filename = name == null ? "Document.txt" : name.replace('\\','/');
        filename=filename.substring(filename.lastIndexOf('/')+1);
        if (filename.length()>160) filename=filename.substring(0,160);
        String lower=filename.toLowerCase(Locale.ROOT);
        ArrayList<Section> sections;
        if (lower.endsWith(".epub")) sections=epub(source);
        else if (lower.endsWith(".docx")) sections=docx(source);
        else if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown"))
            sections=single("Complete document", new String(source, StandardCharsets.UTF_8));
        else if (lower.endsWith(".htm") || lower.endsWith(".html"))
            sections=single("Complete document", html(new String(source, StandardCharsets.UTF_8)));
        else throw new IllegalArgumentException(
                "Use EPUB, TXT, Markdown, HTML or DOCX. Android PDF text extraction is not implemented.");
        String hash=hex(MessageDigest.getInstance("SHA-256").digest(source)).substring(0,16);
        ArrayList<String> passages=new ArrayList<>();
        ArrayList<Chapter> chapters=new ArrayList<>();
        for (int i=0; i<sections.size(); i++) {
            Section section=sections.get(i);
            List<String> chunks=PassageSplitter.split(section.text, 420);
            if (chunks.isEmpty()) continue;
            int start=passages.size();
            passages.addAll(chunks);
            chapters.add(new Chapter(section.title, start, passages.size()));
        }
        if (passages.isEmpty()) throw new IllegalArgumentException("Document has no readable text");
        return new BookDocument(hash, filename, passages, chapters);
    }

    private static ArrayList<Section> single(String title,String text) {
        ArrayList<Section> result=new ArrayList<>();
        result.add(new Section(title,text));
        return result;
    }

    public int chapterFor(int index) {
        for (int i=0;i<chapters.size();i++)
            if (index>=chapters.get(i).start && index<chapters.get(i).end) return i;
        return 0;
    }
    public String chapterText(int number) {
        Chapter chapter=chapters.get(number);
        StringBuilder sb=new StringBuilder();
        for (int i=chapter.start;i<chapter.end;i++) {
            if (i>chapter.start) sb.append("\n\n");
            sb.append(passages.get(i));
        }
        return sb.toString();
    }
    public int offsetInChapter(int chapter, int passage) {
        int result=0;
        for (int i=chapters.get(chapter).start;i<passage;i++)
            result+=passages.get(i).length()+2;
        return result;
    }

    public JSONObject toJson() throws Exception {
        JSONObject out=new JSONObject();
        out.put("id",id);out.put("title",title);
        JSONArray chunks=new JSONArray();
        for(String text:passages)chunks.put(text);
        out.put("passages", chunks);
        JSONArray group=new JSONArray();
        for(Chapter c:chapters){
            JSONObject o=new JSONObject();
            o.put("title",c.title);o.put("start",c.start);o.put("end",c.end);
            group.put(o);
        }
        out.put("chapters",group);
        return out;
    }
    public static BookDocument fromJson(JSONObject json) throws Exception {
        String id=json.getString("id");
        if (!id.matches("[a-f0-9]{16}")) throw new IllegalArgumentException("Invalid book ID");
        ArrayList<String> chunks=new ArrayList<>(), titles=new ArrayList<>();
        JSONArray raw=json.getJSONArray("passages"), groups=json.getJSONArray("chapters");
        for(int i=0;i<raw.length();i++) chunks.add(raw.getString(i));
        ArrayList<Chapter> chapters=new ArrayList<>();
        int last=0;
        for(int i=0;i<groups.length();i++){
            JSONObject c=groups.getJSONObject(i);
            int start=c.getInt("start"), end=c.getInt("end");
            if(start!=last || end<=start || end>chunks.size())
                throw new IllegalArgumentException("Invalid chapter map");
            chapters.add(new Chapter(c.getString("title"),start,end));
            last=end;
        }
        if(chunks.isEmpty()||last!=chunks.size())throw new IllegalArgumentException("Incomplete book");
        return new BookDocument(id,json.getString("title"),chunks,chapters);
    }

    private static ArrayList<Section> epub(byte[] bytes) throws Exception {
        Map<String,byte[]> files=unzipped(bytes);
        byte[] container=files.get("META-INF/container.xml");
        if(container==null) throw new IllegalArgumentException("EPUB container.xml is missing");
        if(files.containsKey("META-INF/encryption.xml"))
            throw new IllegalArgumentException("Encrypted EPUBs are not supported");
        XmlPullParser p=parser(container);
        String opf=null;
        while(p.next()!=XmlPullParser.END_DOCUMENT){
            if(p.getEventType()==XmlPullParser.START_TAG && local(p.getName()).equals("rootfile")){
                opf=p.getAttributeValue(null,"full-path");break;
            }
        }
        if(opf==null)throw new IllegalArgumentException("EPUB package path is missing");
        opf=normalize("",opf);
        byte[] pkg=files.get(opf);
        if(pkg==null)throw new IllegalArgumentException("EPUB package was not found");
        String base=opf.contains("/")?opf.substring(0,opf.lastIndexOf('/')+1):"";
        Map<String,String> manifest=new HashMap<>();
        List<String> spine=new ArrayList<>();
        p=parser(pkg);
        while(p.next()!=XmlPullParser.END_DOCUMENT){
            if(p.getEventType()!=XmlPullParser.START_TAG)continue;
            String tag=local(p.getName());
            if(tag.equals("item")){
                String id=p.getAttributeValue(null,"id");
                String href=p.getAttributeValue(null,"href");
                String type=p.getAttributeValue(null,"media-type");
                if(id!=null && href!=null && ("application/xhtml+xml".equals(type) || "text/html".equals(type)))
                    manifest.put(id,normalize(base,href));
            }else if(tag.equals("itemref")){
                String id=p.getAttributeValue(null,"idref");
                if(id!=null)spine.add(id);
            }
        }
        ArrayList<Section> sections=new ArrayList<>();
        for(String id:spine){
            String path=manifest.get(id);
            if(path==null)continue;
            byte[] content=files.get(path);
            if(content==null)throw new IllegalArgumentException("EPUB spine file missing: "+path);
            String text=html(new String(content,StandardCharsets.UTF_8));
            if(text.isBlank())continue;
            String first=text.split("\\n",2)[0].trim();
            String title=first.length()>0 && first.length()<=95 && !first.matches(".*[.!?]$")
                    ? first : "Chapter "+(sections.size()+1);
            sections.add(new Section(title,text));
        }
        if(sections.isEmpty())throw new IllegalArgumentException("No EPUB spine chapters found");
        return sections;
    }

    private static ArrayList<Section> docx(byte[] bytes) throws Exception {
        byte[] xml=unzipped(bytes).get("word/document.xml");
        if(xml==null)throw new IllegalArgumentException("DOCX document.xml missing");
        XmlPullParser p=parser(xml);
        StringBuilder document=new StringBuilder(), paragraph=null;
        while(p.next()!=XmlPullParser.END_DOCUMENT){
            String tag=local(p.getName());
            if(p.getEventType()==XmlPullParser.START_TAG){
                if(tag.equals("p"))paragraph=new StringBuilder();
                else if(tag.equals("t") && paragraph!=null) paragraph.append(p.nextText());
            } else if(p.getEventType()==XmlPullParser.END_TAG && tag.equals("p") && paragraph!=null){
                if(!paragraph.toString().trim().isEmpty())document.append(paragraph).append("\n\n");
                paragraph=null;
            }
        }
        return single("Complete document", document.toString());
    }

    private static XmlPullParser parser(byte[] data) throws Exception {
        XmlPullParser p=Xml.newPullParser();
        p.setFeature(XmlPullParser.FEATURE_PROCESS_NAMESPACES,false);
        p.setInput(new InputStreamReader(new ByteArrayInputStream(data),StandardCharsets.UTF_8));
        return p;
    }
    private static String local(String tag) {
        if(tag==null)return "";
        int colon=tag.indexOf(':');
        return colon<0?tag:tag.substring(colon+1);
    }
    private static String normalize(String base,String href) throws Exception {
        String decoded=java.net.URLDecoder.decode(
                href.split("[?#]",2)[0].replace("+","%2B"),"UTF-8");
        if(decoded.isEmpty()||decoded.startsWith("/")||decoded.contains("\\")||decoded.contains(":"))
            throw new IllegalArgumentException("Unsafe EPUB path");
        ArrayList<String> segments=new ArrayList<>();
        for(String part:(base+decoded).split("/")){
            if(part.isEmpty()||part.equals("."))continue;
            if(part.equals("..")){
                if(segments.isEmpty())throw new IllegalArgumentException("EPUB path escapes archive");
                segments.remove(segments.size()-1);
            } else segments.add(part);
        }
        return String.join("/",segments);
    }
    private static String html(String raw) {
        String safe=raw.replaceAll("(?is)<(head|style|script|svg)\\b[^>]*>.*?</\\1>","");
        return Html.fromHtml(safe,Html.FROM_HTML_MODE_COMPACT).toString()
                .replace("\r","").replaceAll("[ \\t]+"," ")
                .replaceAll("\\n{3,}","\n\n").trim();
    }
    private static Map<String,byte[]> unzipped(byte[] bytes) throws Exception {
        Map<String,byte[]> entries=new HashMap<>();
        int total=0, count=0;
        try(ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(bytes))){
            ZipEntry entry;
            byte[] buffer=new byte[8192];
            while((entry=zip.getNextEntry())!=null){
                if(++count>MAX_ZIP_ENTRIES)throw new IllegalArgumentException("Too many archive entries");
                if(entry.isDirectory())continue;
                String name=normalize("",entry.getName());
                ByteArrayOutputStream output=new ByteArrayOutputStream();
                int got;
                while((got=zip.read(buffer))!=-1){
                    total+=got;
                    if(total>MAX_UNCOMPRESSED_BYTES || output.size()+got>8*1024*1024)
                        throw new IllegalArgumentException("Document archive exceeds safe size");
                    output.write(buffer,0,got);
                }
                entries.put(name,output.toByteArray());
            }
        }
        return entries;
    }
    private static String hex(byte[] bytes){
        StringBuilder sb=new StringBuilder();
        for(byte b:bytes)sb.append(String.format(Locale.ROOT,"%02x",b&0xff));
        return sb.toString();
    }
}
