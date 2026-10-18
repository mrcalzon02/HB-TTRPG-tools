package org.beckenburg;
public final class VanTelemetryTest {
 static void ok(boolean x,String s){if(!x)throw new AssertionError(s);}
 public static void main(String[] args){
   VanTelemetry m=new VanTelemetry(45);int a=m.sample(0,0);
   ok(a==m.sample(1,100),"polling cannot reroll a sample");
   for(int t=12;t<=420;t+=12)m.sample(t,100);
   ok(m.sample(421,100)>=7,"high energy trends high");
   for(int t=432;t<=852;t+=12)m.sample(t,0);
   ok(m.sample(853,0)<=3,"low energy trends low");
   int[] san={100,82,47,0,-1,-1};
   var d=new VanTelemetry.Display(60,4,san);san[0]=0;
   ok(d.sanity()[0]==100&&VanTelemetry.Display.decode(d.frame()).sanity()[2]==47,"six sanitized seats");
   System.out.println("PASS van monitor: noisy activity and true private sanity");
 }
}