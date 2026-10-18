package org.beckenburg;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.function.IntConsumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Independent Beckenburg update channel; never consults repository-wide /releases/latest. */
public final class BeckenburgUpdates {
    public static final String REPOSITORY="mrcalzon02/HB-TTRPG-tools";
    public static final String PREFIX="beckenburg-v";
    public static final String API="https://api.github.com/repos/"+REPOSITORY+"/releases";
    private static final long MAX_INSTALLER=750L*1024*1024, MAX_FEED=4L*1024*1024;
    private static final Pattern VERSION=Pattern.compile("(0|[1-9][0-9]{0,5})\\.(0|[1-9][0-9]{0,5})\\.(0|[1-9][0-9]{0,5})");
    private static final Pattern CHECKSUM=Pattern.compile("([0-9a-fA-F]{64})[ \\t]+\\*?(.+)");
    private static final HttpClient HTTP=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15))
        .followRedirects(HttpClient.Redirect.NEVER).build();
    private BeckenburgUpdates() { }

    public record Release(String version,String tag,String notes,String page,String installerUrl,
                          String installerName,long size,String digest,String sumsUrl) { }

    public static String installedVersion(){
        try(InputStream src=BeckenburgUpdates.class.getResourceAsStream("/org/beckenburg/release.properties")){
            if(src==null)return "0.0.0"; // Local non-release build.
            Properties p=new Properties();p.load(src);
            return parsedVersion(p.getProperty("version")).toString();
        }catch(Exception invalid){return "0.0.0";}
    }
    private record Version(int major,int minor,int patch) implements Comparable<Version> {
        @Override public int compareTo(Version v){
            int c=Integer.compare(major,v.major);if(c!=0)return c;
            c=Integer.compare(minor,v.minor);return c!=0?c:Integer.compare(patch,v.patch);
        }
        @Override public String toString(){return major+"."+minor+"."+patch;}
    }
    private static Version parsedVersion(String raw){
        Matcher m=VERSION.matcher(raw==null?"":raw);
        if(!m.matches())throw new IllegalArgumentException("Invalid Beckenburg version");
        return new Version(Integer.parseInt(m.group(1)),Integer.parseInt(m.group(2)),Integer.parseInt(m.group(3)));
    }
    private static Map<?,?> object(Object o){
        if(!(o instanceof Map<?,?> m))throw new IllegalArgumentException("Invalid release JSON object");
        return m;
    }
    private static String string(Object v){return v instanceof String s?s:"";}
    private static boolean available(Object v){return "uploaded".equals(v);}
    private static boolean trustedAsset(String url,String tag,String filename){
        return url.equals("https://github.com/"+REPOSITORY+"/releases/download/"+tag+"/"+filename);
    }
    /** Pure selection for offline regression tests: unrelated repo releases are ignored. */
    public static Release select(String response,String installed){
        Version current=parsedVersion(installed),best=current;
        Object parsed=new Json(response).parse();
        if(!(parsed instanceof List<?> list))throw new IllegalArgumentException("Invalid releases array");
        Release selected=null;
        for(Object item:list){
            Map<?,?> r=object(item);
            if(Boolean.TRUE.equals(r.get("draft"))||Boolean.TRUE.equals(r.get("prerelease")))continue;
            String tag=string(r.get("tag_name"));
            if(!tag.startsWith(PREFIX))continue;
            Version candidate;
            try{candidate=parsedVersion(tag.substring(PREFIX.length()));}
            catch(IllegalArgumentException ex){continue;}
            if(candidate.compareTo(best)<=0)continue;
            String version=candidate.toString();
            String file="Beckenburg-"+version+"-Windows-x64.exe";
            String sums="SHA256SUMS.txt";
            String exeUrl="",sumUrl="",digest="";
            long size=-1;
            Object items=r.get("assets");
            if(!(items instanceof List<?> assets))continue;
            for(Object asset:assets){
                Map<?,?> a=object(asset);
                if(!available(a.get("state")))continue;
                String name=string(a.get("name")),link=string(a.get("browser_download_url"));
                if(name.equals(file)){
                    if(!trustedAsset(link,tag,file))throw new IllegalArgumentException("Untrusted Beckenburg installer URL");
                    exeUrl=link;
                    if(!(a.get("size") instanceof Number n))throw new IllegalArgumentException("Bad installer size");
                    size=n.longValue();digest=string(a.get("digest"));
                    if(!digest.isEmpty()&&!digest.matches("sha256:[0-9a-fA-F]{64}"))
                        throw new IllegalArgumentException("Bad installer digest");
                }else if(name.equals(sums)){
                    if(!trustedAsset(link,tag,sums))throw new IllegalArgumentException("Untrusted checksum URL");
                    sumUrl=link;
                }
            }
            if(exeUrl.isEmpty()||sumUrl.isEmpty()||size<32768||size>MAX_INSTALLER)
                continue; // Incomplete/draft-like product release must never be offered.
            best=candidate;
            selected=new Release(version,tag,string(r.get("body")),
                "https://github.com/"+REPOSITORY+"/releases/tag/"+tag,
                exeUrl,file,size,digest,sumUrl);
        }
        return selected;
    }
    public static Release check(String current)throws IOException,InterruptedException{
        // The Foundry hosts multiple independent products; compare only our tagged stable releases.
        Release newest=null;
        for(int page=1;page<=10;page++){
            String body=new String(fetch(API+"?per_page=100&page="+page,MAX_FEED),StandardCharsets.UTF_8);
            Object json=new Json(body).parse();
            if(!(json instanceof List<?> entries))throw new IOException("GitHub release feed malformed");
            Release candidate=select(body,newest==null?current:newest.version());
            if(candidate!=null)newest=candidate;
            if(entries.size()<100)return newest;
        }
        throw new IOException("Release feed page limit exceeded");
    }
    private static void allowedUri(URI uri)throws IOException{
        String host=uri.getHost();
        if(!"https".equalsIgnoreCase(uri.getScheme())||host==null||
           !(host.equals("api.github.com")||host.equals("github.com")||
             host.equals("release-assets.githubusercontent.com")||host.equals("objects.githubusercontent.com")))
            throw new IOException("Update URL left GitHub HTTPS");
        if(uri.getUserInfo()!=null||uri.getPort()!=-1)throw new IOException("Unexpected update URL authority");
    }
    private static InputStream open(String raw)throws IOException,InterruptedException{
        URI url=URI.create(raw);allowedUri(url);
        for(int redirects=0;redirects<6;redirects++){
            HttpRequest req=HttpRequest.newBuilder(url).timeout(Duration.ofMinutes(4))
                .header("User-Agent","Beckenburg-Windows-Updater")
                .header("Accept","application/vnd.github+json")
                .GET().build();
            HttpResponse<InputStream> response=HTTP.send(req,HttpResponse.BodyHandlers.ofInputStream());
            int code=response.statusCode();
            if(code==200)return response.body();
            response.body().close();
            if(code!=301&&code!=302&&code!=303&&code!=307&&code!=308)
                throw new IOException("GitHub update HTTP "+code);
            String location=response.headers().firstValue("location")
                .orElseThrow(()->new IOException("Missing release redirect"));
            url=url.resolve(location);allowedUri(url);
        }
        throw new IOException("Too many release redirects");
    }
    private static byte[] fetch(String url,long limit)throws IOException,InterruptedException{
        try(InputStream in=open(url)){
            byte[] bytes=in.readNBytes(Math.toIntExact(limit+1));
            if(bytes.length>limit)throw new IOException("Update feed exceeded size limit");
            return bytes;
        }
    }
    /** Download to user-private staging, hash-verify, then atomically expose an installer. */
    public static Path stage(Release release,Path directory,IntConsumer progress)throws Exception{
        if(release==null||!trustedAsset(release.installerUrl(),release.tag(),release.installerName()))
            throw new IllegalArgumentException("Untrusted installer");
        if(!trustedAsset(release.sumsUrl(),release.tag(),"SHA256SUMS.txt"))
            throw new IllegalArgumentException("Untrusted checksums");
        String contents=new String(fetch(release.sumsUrl(),65536),StandardCharsets.UTF_8);
        String expected="";
        for(String line:contents.split("\\R")){
            Matcher m=CHECKSUM.matcher(line.trim());
            if(m.matches()&&m.group(2).equals(release.installerName())){
                if(!expected.isEmpty())throw new IOException("Duplicate Beckenburg checksum entry");
                expected=m.group(1).toLowerCase(java.util.Locale.ROOT);
            }
        }
        if(expected.isEmpty())throw new IOException("Release has no installer checksum");
        if(!release.digest().isEmpty()&&!expected.equals(release.digest().substring(7).toLowerCase(java.util.Locale.ROOT)))
            throw new IOException("Release digest and checksum disagree");
        Files.createDirectories(directory);
        Path dest=directory.resolve(release.installerName()).toAbsolutePath().normalize();
        Path tmp=Files.createTempFile(directory.toAbsolutePath().normalize(),"beckenburg-update-",".part");
        try{
            MessageDigest digest=MessageDigest.getInstance("SHA-256");long read=0;
            try(InputStream src=open(release.installerUrl());java.io.OutputStream out=Files.newOutputStream(tmp)){
                byte[] buffer=new byte[65536];int n;
                while((n=src.read(buffer))!=-1){
                    read+=n;if(read>release.size()||read>MAX_INSTALLER)throw new IOException("Installer too large");
                    out.write(buffer,0,n);digest.update(buffer,0,n);
                    if(progress!=null)progress.accept((int)Math.min(100,read*100/release.size()));
                }
            }
            if(read!=release.size()||!MessageDigest.isEqual(
                digest.digest(),java.util.HexFormat.of().parseHex(expected)))
                throw new IOException("Installer size/checksum verification failed");
            Files.move(tmp,dest,StandardCopyOption.REPLACE_EXISTING);
            return dest;
        }finally{Files.deleteIfExists(tmp);}
    }
    public static Path updateDirectory(){
        String local=System.getenv("LOCALAPPDATA");
        return local!=null&&!local.isBlank() ? Path.of(local,"Beckenburg","Updates")
            :Path.of(System.getProperty("user.home"),".beckenburg","updates");
    }
    /** Strict, compact JSON decoder: no network dependencies and duplicate fields rejected. */
    private static final class Json {
        private final String s;private int p;
        Json(String s){this.s=s;}
        Object parse(){Object o=value();ws();if(p!=s.length())throw bad();return o;}
        void ws(){while(p<s.length()&&Character.isWhitespace(s.charAt(p)))p++;}
        IllegalArgumentException bad(){return new IllegalArgumentException("Bad releases JSON at "+p);}
        char take(){if(p>=s.length())throw bad();return s.charAt(p++);}
        Object value(){ws();char c=take();
            if(c=='{'){
                Map<String,Object> result=new HashMap<>();ws();if(p<s.length()&&s.charAt(p)=='}'){p++;return result;}
                while(true){ws();if(take()!='"')throw bad();String key=quoted();ws();if(take()!=':')throw bad();
                    Object v=value();if(result.containsKey(key))throw bad();result.put(key,v);ws();
                    char term=take();if(term=='}')return result;if(term!=',')throw bad();}
            }
            if(c=='['){List<Object> result=new ArrayList<>();ws();if(p<s.length()&&s.charAt(p)==']'){p++;return result;}
                while(true){result.add(value());ws();char term=take();if(term==']')return result;if(term!=',')throw bad();}
            }
            if(c=='"')return quoted();
            if(c=='t'&&s.startsWith("rue",p)){p+=3;return true;}
            if(c=='f'&&s.startsWith("alse",p)){p+=4;return false;}
            if(c=='n'&&s.startsWith("ull",p)){p+=3;return null;}
            if(c=='-'||c>='0'&&c<='9'){
                int start=p-1;while(p<s.length()&&"0123456789-.+eE".indexOf(s.charAt(p))>=0)p++;
                try{return new java.math.BigDecimal(s.substring(start,p));}catch(NumberFormatException ex){throw bad();}
            }
            throw bad();
        }
        String quoted(){StringBuilder b=new StringBuilder();while(true){char c=take();if(c=='"')return b.toString();
            if(c=='\\'){char x=take();switch(x){
                case '"','\\','/'->b.append(x);case 'n'->b.append('\n');case 'r'->b.append('\r');
                case 't'->b.append('\t');case 'b'->b.append('\b');case 'f'->b.append('\f');
                case 'u'->{if(p+4>s.length())throw bad();try{b.append((char)Integer.parseInt(s.substring(p,p+4),16));}
                    catch(NumberFormatException e){throw bad();}p+=4;}
                default->throw bad();}
            }else{if(c<32)throw bad();b.append(c);}}
        }
    }
}
