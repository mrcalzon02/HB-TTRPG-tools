package org.beckenburg;
import java.util.*;
import org.beckenburg.LevelDefinition.*;

/** Measured furnishing groups with reserved circulation and real supporting surfaces. */
final class LevelDressing {
    private final LevelPlans.B b;
    private final List<Prop> reserved=new ArrayList<>();
    private LevelDressing(LevelPlans.B builder){b=builder;}
    static void populate(LevelPlans.B b){new LevelDressing(b).build();}
    private Prop prop(String mesh,int room,double x,double y,double z,double yaw,double hx,double hz,double height,String support){
        return new Prop(mesh,room,x,y,z,1,yaw,hx,hz,height,support);
    }
    private boolean clear(Prop p){
        if(!b.circulation(p,p.x(),p.z())||b.overlap(p,b.props)||b.overlap(p,reserved))return false;
        double hx=Math.abs(Math.cos(p.yaw()))*p.halfX()+Math.abs(Math.sin(p.yaw()))*p.halfZ();
        double hz=Math.abs(Math.sin(p.yaw()))*p.halfX()+Math.abs(Math.cos(p.yaw()))*p.halfZ();
        for(var w:b.portals)if(w.kind().equals("window")&&Math.abs(w.y()-b.rooms.get(p.room()).y())<.1&&p.y()+p.height()>w.y()+.96){
            if(w.alongX()?Math.abs(p.z()-w.z())<hz+.16&&Math.abs(p.x()-w.x())<hx+w.width()/2+.1:
                Math.abs(p.x()-w.x())<hx+.16&&Math.abs(p.z()-w.z())<hz+w.width()/2+.1)return false;
        }
        return true;
    }
    private Prop wallPosition(String mesh,int room,double wantedX,double wantedZ,double hx,double hz,double height,double rise){
        var r=b.rooms.get(room);Prop best=null;double bestScore=Double.POSITIVE_INFINITY;
        for(int side=0;side<4;side++){
            double length=side<2?r.z1()-r.z0():r.x1()-r.x0();
            for(double t=hx+.17;t<length-hx-.12;t+=.20){
                double offset=hz+LevelDefinition.WALL_HALF_THICKNESS+.025;
                double x=side==0?r.x0()+offset:side==1?r.x1()-offset:r.x0()+t;
                double z=side==2?r.z0()+offset:side==3?r.z1()-offset:r.z0()+t;
                double yaw=side==0?-Math.PI/2:side==1?Math.PI/2:side==2?0:Math.PI;
                Prop p=prop(mesh,room,x,r.y()+rise,z,yaw,hx,hz,height,"fixed");
                double score=Math.hypot(x-wantedX,z-wantedZ);
                if(score<bestScore&&clear(p)){best=p;bestScore=score;}
            }
        }
        return best;
    }
    private Prop wall(String mesh,int room,double x,double z,double hx,double hz,double height){return wall(mesh,room,x,z,hx,hz,height,0);}
    private Prop wall(String mesh,int room,double x,double z,double hx,double hz,double height,double rise){
        Prop p=wallPosition(mesh,room,x,z,hx,hz,height,rise);if(p!=null)b.props.add(p);return p;
    }
    private void fixed(String mesh,int room,double x,double z,double hx,double hz,double height){
        Prop p=prop(mesh,room,x,b.rooms.get(room).y(),z,0,hx,hz,height,"fixed");
        if(!clear(p))throw new IllegalStateException("Blocked authored machinery: "+b.id+" "+mesh+" at "+x+","+z);
        b.props.add(p);
    }
    private void closet(int room){
        var r=b.rooms.get(room);
        Prop candidate=wallPosition("level_hiding_cupboard",room,r.x1()-1,r.z1()-1,.85,.70,2.3,0);
        if(candidate==null)throw new IllegalStateException("No physical hiding cupboard space: "+b.id+" room "+room);
        b.socket("hide",room,candidate.x(),candidate.y(),candidate.z(),candidate.yaw(),"walk-in-cupboard");
        // Reserve the full cupboard and its entrance even on a difficulty where absent.
        double dx=-Math.sin(candidate.yaw())*.30,dz=Math.cos(candidate.yaw())*.30;
        reserved.add(prop("level_hiding_cupboard",room,candidate.x()+dx,candidate.y(),candidate.z()+dz,candidate.yaw(),.85,1.0,2.3,"reservation"));
    }
    private void tabletop(Prop parent,String mesh,double y,double side){
        tabletop(parent,mesh,y,side,0);
    }
    private void tabletop(Prop parent,String mesh,double y,double side,double depth){
        double x=parent.x()+Math.cos(parent.yaw())*side-Math.sin(parent.yaw())*depth,z=parent.z()+Math.sin(parent.yaw())*side+Math.cos(parent.yaw())*depth;
        b.props.add(prop(mesh,parent.room(),x,parent.y()+y,z,parent.yaw(),0,0,.28,parent.mesh()));
    }
    private void small(String mesh,int room,double x,double y,double z,double scale,double yaw){
        b.props.add(new Prop(mesh,room,x,y,z,scale,yaw,0,0,.30,"dressed-surface"));
    }
    private void build(){
        b.sockets.removeIf(s->s.type().equals("hide"));
        int[] closets=switch(b.id){case "house"->new int[]{1,3,6,7,11};case "farmhouse"->new int[]{0,1,5,6,7,9,11};default->new int[]{2,4,5,8,9,11};};
        for(int room:closets)closet(room);
        if(b.id.equals("school"))school();else domestic();
        // Use every actual table surface after large furniture has found its final position.
        for(Prop p:List.copyOf(b.props)){
            if(p.mesh().equals("dinner_table_1")){
                tabletop(p,p.room()==2&&b.id.equals("house")||b.id.equals("farmhouse")&&p.room()==2?"level_lived_kitchenware":"level_lived_desk_clutter",.864,0);
                tabletop(p,"book_mp_3",.865,.46);
            }else if(p.mesh().equals("tv_table_1_4")){
                tabletop(p,"vhs_tape_1",.594,-.35);tabletop(p,"tv_remote_mp_1",.594,.50,.05);
            }else if(p.mesh().equals("bedside_table_1"))tabletop(p,"notebook_1",.644,.08);
        }
    }
    private void domestic(){
        for(int room=0;room<12;room++){
            var r=b.rooms.get(room);String name=r.name().toLowerCase();double x=r.x0(),z=r.z0();
            if(name.contains("living")||name.contains("parlour")){
                wall("level_lived_curio",room,x+2,z+.3,.69,.24,1.9);
                wall("level_lived_sideboard",room,r.x1()-2,z+.3,.77,.28,1.18);
                wall("level_lived_shelf",room,x+.3,r.z1()-2,.69,.24,1.9);
                // A small inherited ottoman is furniture, not an obstruction in the route.
                wall("level_lived_ottoman",room,r.x1()-1.5,r.z1()-1,.45,.33,.53);
                Prop table=wall("level_lived_card_table",room,r.x1()-1.2,z+2,.52,.52,.90);
                if(table!=null){
                    double cx=table.x()-Math.sin(table.yaw())*1.12,cz=table.z()+Math.cos(table.yaw())*1.12;
                    Prop chair=prop("chair_mp_5",room,cx,r.y(),cz,table.yaw()+Math.PI,.26,.29,1.01,"fixed");
                    if(clear(chair))b.props.add(chair);
                }
                wall("display_cabinet_mp_2_1",room,x+.3,z+3,.68,.33,2.11);
            }else if(name.contains("bedroom")){
                wall(name.contains("child")?"level_lived_toy_basket":"level_lived_linen_press",room,x+.7,r.z1()-.6,
                    name.contains("child")?.38:.57,name.contains("child")?.38:.33,name.contains("child")?.55:2.04);
                wall("level_lived_trunk",room,r.x1()-1.5,z+.5,.50,.31,.76);
                wall("level_lived_shelf",room,x+.3,z+2,.69,.24,1.9);
            }else if(name.contains("kitchen")){
                wall("level_lived_pantry",room,x+.3,z+1.6,.69,.24,1.9);
                wall("level_lived_sideboard",room,r.x1()-2,r.z1()-.4,.77,.28,1.18);
            }else if(name.contains("dining")){
                wall("level_lived_sideboard",room,x+2,z+.3,.77,.28,1.18);
                wall("level_lived_curio",room,r.x1()-.4,r.z1()-1,.69,.24,1.9);
                wall("display_cabinet_mp_1",room,x+.4,z+1.2,.38,.28,2.11);
            }else if(name.contains("cellar")||name.contains("storage")||name.contains("shed")||name.contains("boiler")){
                wall("level_workbench",room,r.x1()-.4,z+2,.92,.37,1.20);
                wall("level_lived_pantry",room,x+2,z+.3,.69,.24,1.9);
                wall("level_lived_trunk",room,r.x1()-2,r.z1()-.4,.50,.31,.76);
                wall("wooden_crate_2",room,x+.7,z+3,.56,.55,1.09);
                for(int i=0;i<3;i++)wall("level_lived_pantry",room,x+1.4+i*1.8,z+.3,.69,.24,1.9);
                wall("cardboard_box_1",room,x+.5,r.z1()-2,.37,.37,.38);
            }else if(name.contains("barn")||name.contains("loft")){
                wall("level_workbench",room,x+.2,z+4,.92,.37,1.20);
                wall("level_lived_trunk",room,r.x1()-1,z+.3,.50,.31,.76);
                for(int i=0;i<3;i++)wall("wooden_crate_2",room,x+1.6+i*1.2,z+.3,.56,.55,1.09);
                wall("metal_barrel_mp_1",room,x+.2,r.z1()-1,.40,.40,1.20);
            }else if(!name.contains("barn")&&!name.contains("loft")&&!name.contains("bath")){
                wall("level_lived_linen_press",room,x+.3,z+1.5,.57,.33,2.04);
                wall("level_lived_sideboard",room,r.x1()-1,r.z1()-.3,.77,.28,1.18);
            }
            if(!name.contains("barn")&&!name.contains("loft")&&!name.contains("shed")&&!name.contains("cellar"))
                wall("level_radiator",room,x+1,z+.1,.65,.16,.86);
        }
        // Native source small belongings stay on known furniture surfaces.
        for(Prop p:List.copyOf(b.props)){
            if(p.mesh().equals("level_lived_sideboard")){
                tabletop(p,"planter_pot_mp_1_full",.85,.60,-.12);
            }
            if(p.mesh().equals("shelf_mp_6")){
                for(int i=0;i<3;i++)small(b.id.equals("farmhouse")?"canned_food_mp_1":"book_mp_4",p.room(),p.x()-.23+i*.20,p.y()+1.294,p.z(),.65,0);
            }
        }
    }
    private void school(){
        b.sockets.removeIf(s->s.type().equals("light")&&s.room()==11);
        for(double x:new double[]{14,22,30})for(double z:new double[]{16,24,33})b.socket("light",11,x,-.025,z,0,"utility");
        for(double x:new double[]{14,19,24})fixed("level_boiler_coal",11,x,16.5,1.42,2.12,2.55);
        for(double x:new double[]{15.5,21})fixed("level_boiler_oil",11,x,23,1.25,1.43,1.95);
        for(double x:new double[]{14,18.5,23})fixed("level_boiler_modern",11,x,32.5,.56,.55,2.36);
        fixed("level_expansion_vessel",11,12.7,29.5,.70,.43,1.94);
        fixed("level_coal_bunker",11,12,21,1.05,.79,1.30);
        b.props.add(prop("level_school_pipework",11,10,-3,12,0,0,0,3,"fixed-architecture"));
        wall("level_electrical_bank",11,33.8,18.5,1.14,.25,2.1,.50);
        wall("level_workbench",11,33.5,22,.92,.37,1.20);
        wall("level_lived_shelf",11,11,22,.69,.24,1.9);
        wall("level_lived_trunk",11,33,35,.50,.31,.76);
        for(int i=0;i<4;i++){
            wall("level_lived_shelf",11,33.6,24+i*2.7,.69,.24,1.9);
            wall("cardboard_box_1",11,29+i,37.5,.37,.37,.38);
        }
        for(int room:new int[]{0,2,3,4,5,8,9}){
            var r=b.rooms.get(room);
            wall(room==8?"level_lived_shelf":"level_lived_sideboard",room,r.x1()-1,r.z0()+.3,.77,.28,room==8?1.9:1.18);
            if(room==8)for(int i=0;i<3;i++)wall("level_lived_shelf",room,r.x0()+.2,r.z0()+2+i*3,.69,.24,1.9);
            wall("level_radiator",room,r.x0()+.5,r.z1()-2,.65,.16,.86);
        }
        // Cafeteria seating groups use the real sourced table and chair mesh.
        for(double x:new double[]{31,36})for(double z:new double[]{27,31,35}){
            Prop table=prop("dinner_table_1",4,x,0,z,0,.85,.55,.86,"fixed");
            if(clear(table)){
                b.props.add(table);
                for(double side:new double[]{-1,1}){
                    Prop chair=prop("chair_mp_5",4,x,0,z+side*1.10,side<0?Math.PI:0,.26,.28,1.01,"fixed");
                    if(clear(chair))b.props.add(chair);
                }
            }
        }
    }
}
