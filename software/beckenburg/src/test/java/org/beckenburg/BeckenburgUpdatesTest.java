package org.beckenburg;

/** Offline product-scoped release selection, version order and malformed release rejection. */
public final class BeckenburgUpdatesTest {
    private BeckenburgUpdatesTest() { }
    static String release(String tag,String version,boolean draft,String asset,String sum){
        return "{\"tag_name\":\""+tag+"\",\"draft\":"+draft+",\"prerelease\":false,\"body\":\"Notes\",\"assets\":["+
            "{\"name\":\"Beckenburg-"+version+"-Windows-x64.exe\",\"size\":90000000,\"state\":\"uploaded\",\"browser_download_url\":\""+asset+"\"},"+
            "{\"name\":\"SHA256SUMS.txt\",\"state\":\"uploaded\",\"browser_download_url\":\""+sum+"\"}]}";
    }
    static String item(String version,boolean draft){
        String tag="beckenburg-v"+version,link="https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/"+tag+"/";
        return release(tag,version,draft,link+"Beckenburg-"+version+"-Windows-x64.exe",link+"SHA256SUMS.txt");
    }
    public static void main(String[] args){
        String feed="["+item("0.3.9",false)+","+item("0.3.10",false)+","+
            item("0.4.0",true)+","+release("simple-sound-manager-v9.0.0","9.0.0",false,
            "https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/simple-sound-manager-v9.0.0/Beckenburg-9.0.0-Windows-x64.exe",
            "https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/simple-sound-manager-v9.0.0/SHA256SUMS.txt")+"]";
        var r=BeckenburgUpdates.select(feed,"0.3.8");
        assert r!=null&&r.version().equals("0.3.10"):
            "Numeric Beckenburg version ordering, draft/other tool filtering";
        assert BeckenburgUpdates.select(feed,"0.3.10")==null:"No installed-version downgrade";
        assert BeckenburgUpdates.select(feed,"0.4.0")==null:"Do not offer older tagged releases";
        boolean rejected=false;
        try{BeckenburgUpdates.select("["+release("beckenburg-v0.4.1","0.4.1",false,
            "https://attacker.example/install.exe","https://attacker.example/SHA256SUMS.txt")+"]","0.3.0");}
        catch(IllegalArgumentException expected){rejected=true;}
        assert rejected:"Reject foreign download URLs";
        rejected=false;
        try{BeckenburgUpdates.select("{\"bad\":true}","0.3.0");}
        catch(IllegalArgumentException expected){rejected=true;}
        assert rejected:"Reject invalid release response";
        assert BeckenburgUpdates.installedVersion().matches("\\d+\\.\\d+\\.\\d+");
        System.out.println("PASS independent Beckenburg updates, version sorting, exact asset path and hostile URL rejection");
    }
}
