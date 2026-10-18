package org.beckenburg;
public final class FieldSuppliesTest {
 static void ok(boolean x,String s){if(!x)throw new AssertionError(s);}
 public static void main(String[] args){
   FieldSupplies b=new FieldSupplies();
   ok(!b.consume(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.BASIC),"unowned item");
   ok(b.purchase(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.IMPROVED),"mid health");
   ok(b.purchase(FieldSupplies.Kind.SANITY,FieldSupplies.Tier.ADVANCED),"strong sanity");
   ok(b.credits()==55,"deduct credits");
   ok(!b.purchase(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.IMPROVED),"not enough credits");
   ok(b.consume(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.IMPROVED)&&
      b.best(FieldSupplies.Kind.HEALTH)==null,"finite supplies");
   ok(b.frame().split("\\|").length==8,"bounded supply packet");
   System.out.println("PASS progressive purchased health and sanity items");
 }
}