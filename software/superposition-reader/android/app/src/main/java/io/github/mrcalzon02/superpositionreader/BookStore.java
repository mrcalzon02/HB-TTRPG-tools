package io.github.mrcalzon02.superpositionreader;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Comparator;

/** Local private archive, no runtime storage or network permissions. */
public final class BookStore {
    private final Context context;
    private final File folder;
    private final SharedPreferences prefs;

    public BookStore(Context context) {
        this.context=context;
        folder=new File(context.getFilesDir(),"books");
        if(!folder.exists()&&!folder.mkdirs())throw new IllegalStateException("Cannot open private book archive");
        prefs=context.getSharedPreferences("spr-reader",Context.MODE_PRIVATE);
    }
    public BookDocument save(String name,byte[] data) throws Exception {
        String id=sourceId(data);
        File target=new File(folder,id+".json");
        BookDocument book;
        if(target.isFile()){
            book=BookDocument.fromJson(new JSONObject(new String(
                    Files.readAllBytes(target.toPath()),StandardCharsets.UTF_8)));
        }else{
            book=BookDocument.fromBytes(name,data);
            File temp=new File(folder,book.id+".partial");
            try(FileOutputStream stream=new FileOutputStream(temp)){
                stream.write(book.toJson().toString().getBytes(StandardCharsets.UTF_8));
                stream.getFD().sync();
            }
            if(!temp.renameTo(target))throw new IllegalStateException("Cannot commit book import");
        }
        setSelected(book.id);
        return book;
    }
    private static String sourceId(byte[] data) throws Exception {
        byte[] hash=java.security.MessageDigest.getInstance("SHA-256").digest(data);
        StringBuilder id=new StringBuilder();
        for(int i=0;i<8;i++)id.append(String.format(java.util.Locale.ROOT,"%02x",hash[i]&0xff));
        return id.toString();
    }
    public ArrayList<BookDocument> library(){
        ArrayList<BookDocument> books=new ArrayList<>();
        File[] files=folder.listFiles((dir,name)->name.matches("[a-f0-9]{16}\\.json"));
        if(files==null)return books;
        for(File f:files){
            try{
                byte[] data=Files.readAllBytes(f.toPath());
                books.add(BookDocument.fromJson(new JSONObject(new String(data,StandardCharsets.UTF_8))));
            }catch(Exception ignored){
                // A damaged book should not prevent opening the other books.
            }
        }
        books.sort(Comparator.comparing(b->b.title.toLowerCase()));
        return books;
    }
    public String selected(){return prefs.getString("book-id","");}
    public void setSelected(String id){prefs.edit().putString("book-id",id).apply();}
    public int position(BookDocument book){
        int saved=prefs.getInt("position:"+book.id,0);
        return Math.max(0,Math.min(saved,book.passages.size()-1));
    }
    public void setPosition(BookDocument book,int index){
        prefs.edit().putInt("position:"+book.id,index).apply();
    }
    public String engine(){return prefs.getString("tts-engine","");}
    public void setEngine(String pkg){prefs.edit().putString("tts-engine",pkg).apply();}
    public String voice(String engine){return prefs.getString("tts-voice:"+engine,"");}
    public void setVoice(String engine,String name){
        prefs.edit().putString("tts-voice:"+engine,name).apply();
    }
    public float rate(){return prefs.getFloat("speech-rate",1.0f);}
    public void setRate(float rate){prefs.edit().putFloat("speech-rate",rate).apply();}
}
