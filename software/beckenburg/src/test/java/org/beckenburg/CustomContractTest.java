package org.beckenburg;
public final class CustomContractTest {
 static void ok(boolean x,String s){if(!x)throw new AssertionError(s);}
 public static void main(String[] args){
   for(int n=1;n<=6;n++)ok(CustomContract.standard(n).partyDifficulty()==n,"party "+n);
   try{CustomContract.standard(7);throw new AssertionError("7 seats accepted");}catch(IllegalArgumentException expected){}
   ok(CustomContract.standard(3).runningSpeed(2.4)>CustomContract.standard(3).walkingSpeed(2.4),"sprint multiplier");
   System.out.println("PASS 1-6 hunters and minimum +6 full-party rating");
 }
}