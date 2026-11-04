package io.github.mrcalzon02.superpositionreader;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.util.List;
import static org.junit.Assert.*;

public class WavAssemblerTest {
    @Rule public TemporaryFolder tmp=new TemporaryFolder();
    private void le16(ByteArrayOutputStream o,int v) {o.write(v&255);o.write(v>>>8&255);}
    private void le32(ByteArrayOutputStream o,int v) {
        for(int n=0;n<4;n++)o.write(v>>>(8*n)&255);
    }
    private File create(String name,int samples) throws Exception {
        ByteArrayOutputStream wav=new ByteArrayOutputStream();
        wav.write("RIFF".getBytes("US-ASCII"));le32(wav,36+samples*2);
        wav.write("WAVEfmt ".getBytes("US-ASCII"));le32(wav,16);
        le16(wav,1);le16(wav,1);le32(wav,16000);le32(wav,32000);
        le16(wav,2);le16(wav,16);
        wav.write("data".getBytes("US-ASCII"));le32(wav,samples*2);
        for(int i=0;i<samples;i++)le16(wav,i);
        File file=tmp.newFile(name);
        try(FileOutputStream out=new FileOutputStream(file)){out.write(wav.toByteArray());}
        return file;
    }
    @Test public void fullChapterRiffContainsEverySourceFrame() throws Exception {
        File first=create("first.wav",400),second=create("second.wav",600);
        assertTrue(WavAssembler.isValid(first));
        ByteArrayOutputStream merged=new ByteArrayOutputStream();
        WavAssembler.combine(List.of(first,second),merged);
        byte[] bytes=merged.toByteArray();
        assertEquals(44+2000,bytes.length);
        assertEquals('R',bytes[0]);
        assertEquals('W',bytes[8]);
        assertEquals(2000,(bytes[40]&255)|((bytes[41]&255)<<8));
        File joined=tmp.newFile("joined.wav");
        try(FileOutputStream out=new FileOutputStream(joined)){out.write(bytes);}
        assertEquals(2000,WavAssembler.inspect(joined).dataLength);
    }
    @Test public void corruptedOutputCannotBeExported() throws Exception {
        File bad=tmp.newFile("broken.wav");
        try(FileOutputStream out=new FileOutputStream(bad)){out.write(new byte[100]);}
        assertFalse(WavAssembler.isValid(bad));
        try {
            WavAssembler.combine(List.of(bad),new ByteArrayOutputStream());
            fail("Invalid audio must not be exported");
        } catch(java.io.IOException expected) {
            assertTrue(expected.getMessage().contains("RIFF"));
        }
    }
}
