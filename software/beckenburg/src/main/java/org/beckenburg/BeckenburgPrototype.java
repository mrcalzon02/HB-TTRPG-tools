package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.*;
import java.util.List;

/** Dependency-free Java 17 software 3D visual/input spike, NOT the production game engine. */
public final class BeckenburgPrototype {
    private BeckenburgPrototype() { }
    static final int W = 320, H = 200;
    static final String[] PLAN = {
        "################", "#......#.......#", "#......#.......#", "#......D.......#",
        "#......#.......#", "#..............#", "#####D##########", "#..............#",
        "#..............#", "#...###........#", "#...#.#........#", "#...###........#",
        "#..............#", "#..............#", "#..............#", "################"
    };

    static final class World {
        final char[][] tiles = new char[PLAN.length][];
        final Set<Integer> openDoors = new HashSet<>();
        World() { for (int i = 0; i < tiles.length; i++) tiles[i] = PLAN[i].toCharArray(); }
        boolean inside(int x, int z) { return z >= 0 && z < tiles.length && x >= 0 && x < tiles[z].length; }
        char tile(int x, int z) { return inside(x,z) ? tiles[z][x] : '#'; }
        boolean solid(int x, int z) { char t=tile(x,z); return t=='#' || (t=='D' && !openDoors.contains(z*32+x)); }
        boolean traversable(double x, double z) {
            double r=.19; return !solid((int)Math.floor(x-r),(int)Math.floor(z-r))
               && !solid((int)Math.floor(x+r),(int)Math.floor(z-r))
               && !solid((int)Math.floor(x-r),(int)Math.floor(z+r))
               && !solid((int)Math.floor(x+r),(int)Math.floor(z+r));
        }
        boolean toggleNearestDoor(double x, double z) {
            double closest=1.55; int key=-1;
            for(int zz=0;zz<tiles.length;zz++) for(int xx=0;xx<tiles[zz].length;xx++) if(tiles[zz][xx]=='D') {
                double distance=Math.hypot(xx+.5-x,zz+.5-z);
                if(distance<closest){closest=distance;key=zz*32+xx;}
            }
            if(key<0)return false;
            if(openDoors.contains(key))openDoors.remove(key);else openDoors.add(key);
            return true;
        }
        String zone(double z) { return z<6 ? "NORTH WING" : z<11 ? "GALLERY" : "RITUAL WING"; }
    }

    record V(double x,double y,double z) { }
    record Face(V a,V b,V c,int rgb) { }
    static void addQuad(List<Face> faces,V a,V b,V c,V d,int rgb){faces.add(new Face(a,b,c,rgb));faces.add(new Face(a,c,d,rgb));}
    static void box(List<Face> out,double x,double y,double z,double sx,double sy,double sz,int color){
        V a=new V(x,y,z),b=new V(x+sx,y,z),c=new V(x+sx,y+sy,z),d=new V(x,y+sy,z);
        V e=new V(x,y,z+sz),f=new V(x+sx,y,z+sz),g=new V(x+sx,y+sy,z+sz),h=new V(x,y+sy,z+sz);
        addQuad(out,a,b,c,d,shade(color,.70));addQuad(out,f,e,h,g,shade(color,.83));
        addQuad(out,e,a,d,h,shade(color,.68));addQuad(out,b,f,g,c,shade(color,.88));
        addQuad(out,d,c,g,h,shade(color,1.10));addQuad(out,e,f,b,a,shade(color,.45));
    }
    static int shade(int rgb,double factor){int r=(int)(((rgb>>16)&255)*factor),g=(int)(((rgb>>8)&255)*factor),b=(int)((rgb&255)*factor);return Math.min(255,r)<<16 | Math.min(255,g)<<8 | Math.min(255,b);}

    static List<Face> level(World world,double time) {
        List<Face> out=new ArrayList<>();
        for(int z=0;z<world.tiles.length;z++)for(int x=0;x<world.tiles[z].length;x++) {
            if(world.tile(x,z)=='#')continue;
            int floor=((x+z)&1)==0?0x39383b:0x403c3a;
            addQuad(out,new V(x,0,z),new V(x+1,0,z),new V(x+1,0,z+1),new V(x,0,z+1),floor);
            addQuad(out,new V(x,2.7,z+1),new V(x+1,2.7,z+1),new V(x+1,2.7,z),new V(x,2.7,z),0x272a2d);
            int base=(x+z)%5==0?0x575258:0x514a48;
            if(world.solid(x-1,z))addQuad(out,new V(x,0,z+1),new V(x,0,z),new V(x,2.7,z),new V(x,2.7,z+1),shade(base,.79));
            if(world.solid(x+1,z))addQuad(out,new V(x+1,0,z),new V(x+1,0,z+1),new V(x+1,2.7,z+1),new V(x+1,2.7,z),shade(base,.93));
            if(world.solid(x,z-1))addQuad(out,new V(x,0,z),new V(x+1,0,z),new V(x+1,2.7,z),new V(x,2.7,z),shade(base,.87));
            if(world.solid(x,z+1))addQuad(out,new V(x+1,0,z+1),new V(x,0,z+1),new V(x,2.7,z+1),new V(x+1,2.7,z+1),base);
            if(world.tile(x,z)=='D'&&!world.openDoors.contains(z*32+x)) box(out,x+.12,.0,z+.39,.76,2.4,.22,0x724b31);
        }
        // Deliberately crude low-poly scene props: workbench, pew, reliquary and spectral figure.
        box(out,10.1,0,8.7,1.7,.8,.85,0x564232);
        box(out,10.25,.8,8.85,1.4,.10,.54,0x896344);
        box(out,12.1,0,11.0,.7,1.35,.55,0x565452);
        box(out,7.8,0,13.7,1.8,.64,.44,0x5f4135);
        double hover=.16*Math.sin(time*1.8);
        box(out,12.0,.42+hover,3.0,.48,1.08,.24,0x5e6479);
        box(out,12.08,1.5+hover,3.04,.31,.36,.18,0xa2aabd);
        box(out,11.86,.58+hover,3.05,.14,.69,.14,0x7e8392);
        box(out,12.47,.58+hover,3.05,.14,.69,.14,0x7e8392);
        return out;
    }

    static final class Renderer {
        final BufferedImage frame=new BufferedImage(W,H,BufferedImage.TYPE_INT_RGB);
        final int[] pixels=((DataBufferInt)frame.getRaster().getDataBuffer()).getData();
        final double[] zbuffer=new double[W*H];
        double px=2.5,pz=13.5,yaw=0,pitch=0;
        boolean lamp=true;
        private static final int[] BAYER={0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5};
        static final double NEAR=.075,FOCAL=230;
        V camera(V a) {
            double dx=a.x-px,dz=a.z-pz,dy=a.y-1.62;
            double cs=Math.cos(yaw),sn=Math.sin(yaw),xc=dx*cs-dz*sn,zc=dx*sn+dz*cs;
            double cp=Math.cos(pitch),sp=Math.sin(pitch);
            return new V(xc,dy*cp-zc*sp,dy*sp+zc*cp);
        }
        static List<V> clip(V a,V b,V c) {
            List<V> in=List.of(a,b,c),out=new ArrayList<>();
            for(int i=0;i<in.size();i++){
                V s=in.get(i),e=in.get((i+1)%in.size());boolean si=s.z>=NEAR,ei=e.z>=NEAR;
                if(si)out.add(s);
                if(si!=ei){double t=(NEAR-s.z)/(e.z-s.z);out.add(new V(s.x+(e.x-s.x)*t,s.y+(e.y-s.y)*t,NEAR));}
            }
            return out;
        }
        void draw(World world,double time) {
            Arrays.fill(pixels,0x161b24);Arrays.fill(zbuffer,Double.POSITIVE_INFINITY);
            for(Face face:level(world,time)){
                List<V> pts=clip(camera(face.a),camera(face.b),camera(face.c));
                if(pts.size()<3)continue;
                for(int i=1;i<pts.size()-1;i++) triangle(pts.get(0),pts.get(i),pts.get(i+1),face.rgb);
            }
        }
        void triangle(V a,V b,V c,int base) {
            double x0=W*.5+a.x/a.z*FOCAL,y0=H*.5-a.y/a.z*FOCAL;
            double x1=W*.5+b.x/b.z*FOCAL,y1=H*.5-b.y/b.z*FOCAL;
            double x2=W*.5+c.x/c.z*FOCAL,y2=H*.5-c.y/c.z*FOCAL;
            double denom=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);
            if(Math.abs(denom)<1e-8)return;
            int minX=Math.max(0,(int)Math.floor(Math.min(x0,Math.min(x1,x2))));
            int maxX=Math.min(W-1,(int)Math.ceil(Math.max(x0,Math.max(x1,x2))));
            int minY=Math.max(0,(int)Math.floor(Math.min(y0,Math.min(y1,y2))));
            int maxY=Math.min(H-1,(int)Math.ceil(Math.max(y0,Math.max(y1,y2))));
            for(int y=minY;y<=maxY;y++)for(int x=minX;x<=maxX;x++){
                double xx=x+.5,yy=y+.5;
                double u=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/denom;
                double v=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/denom,w=1-u-v;
                if(u<0||v<0||w<0)continue;
                double invZ=u/a.z+v/b.z+w/c.z;
                double z=1/invZ;int k=y*W+x;
                if(z>=zbuffer[k])continue;
                zbuffer[k]=z;
                double light=(lamp?.93:.43) * Math.max(.2,1-z/24.0);
                int d=BAYER[(x&3)+((y&3)<<2)];light=Math.min(1.4,Math.max(0,light+(d-7.5)/110));
                int r=(int)(((base>>16)&255)*light),g=(int)(((base>>8)&255)*light),bb=(int)((base&255)*light);
                double mist=Math.min(.78,Math.max(0,(z-4)/17.0));
                r=(int)(r*(1-mist)+21*mist);g=(int)(g*(1-mist)+25*mist);bb=(int)(bb*(1-mist)+34*mist);
                pixels[k]=(r<<16)|(g<<8)|bb;
            }
        }
    }

    static final class View extends JPanel implements KeyListener,MouseMotionListener,MouseListener {
        final World world=new World(); final Renderer renderer=new Renderer();
        final Set<Integer> keys=new HashSet<>(); final Runnable exit; final javax.swing.Timer timer;
        long last=System.nanoTime();double clock=0;int previousX,previousY;boolean dragging;
        View(Runnable exit){this.exit=exit;setFocusable(true);addKeyListener(this);addMouseMotionListener(this);addMouseListener(this);
            timer=new javax.swing.Timer(33,event->tick());timer.start();}
        void tick(){
            if(!isShowing())return;
            long now=System.nanoTime();double dt=Math.min(.05,(now-last)/1e9);last=now;clock+=dt;
            if(keys.contains(KeyEvent.VK_LEFT))renderer.yaw-=dt*1.4;
            if(keys.contains(KeyEvent.VK_RIGHT))renderer.yaw+=dt*1.4;
            if(keys.contains(KeyEvent.VK_UP))renderer.pitch=Math.min(1.1,renderer.pitch+dt*.8);
            if(keys.contains(KeyEvent.VK_DOWN))renderer.pitch=Math.max(-1.1,renderer.pitch-dt*.8);
            double forward=(keys.contains(KeyEvent.VK_W)?1:0)-(keys.contains(KeyEvent.VK_S)?1:0);
            double sideways=(keys.contains(KeyEvent.VK_D)?1:0)-(keys.contains(KeyEvent.VK_A)?1:0);
            double length=Math.hypot(forward,sideways);
            if(length>0){forward/=length;sideways/=length;double speed=keys.contains(KeyEvent.VK_SHIFT)?3.3:2.2;
                double dx=(Math.sin(renderer.yaw)*forward+Math.cos(renderer.yaw)*sideways)*speed*dt;
                double dz=(Math.cos(renderer.yaw)*forward-Math.sin(renderer.yaw)*sideways)*speed*dt;
                if(world.traversable(renderer.px+dx,renderer.pz))renderer.px+=dx;
                if(world.traversable(renderer.px,renderer.pz+dz))renderer.pz+=dz;
            }
            renderer.draw(world,clock);repaint();
        }
        @Override public void paintComponent(Graphics g){super.paintComponent(g);
            g.drawImage(renderer.frame,0,0,getWidth(),getHeight(),null);
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,Math.max(12,getHeight()/36)));
            g.setColor(new Color(240,220,174));g.drawString("BECKENBURG  /  S1 RENDER SPIKE",14,25);
            g.drawString(world.zone(renderer.pz),14,48);
            g.drawString("+",getWidth()/2-4,getHeight()/2+4);
            g.drawString("WASD MOVE   DRAG / ARROWS LOOK   E DOOR   F LAMP   ESC MENU",14,getHeight()-18);
        }
        @Override public void keyPressed(KeyEvent e){
            if(e.getKeyCode()==KeyEvent.VK_ESCAPE){timer.stop();exit.run();return;}
            if(e.getKeyCode()==KeyEvent.VK_E&&!keys.contains(KeyEvent.VK_E))world.toggleNearestDoor(renderer.px,renderer.pz);
            if(e.getKeyCode()==KeyEvent.VK_F&&!keys.contains(KeyEvent.VK_F))renderer.lamp=!renderer.lamp;
            keys.add(e.getKeyCode());
        }
        @Override public void keyReleased(KeyEvent e){keys.remove(e.getKeyCode());}
        @Override public void keyTyped(KeyEvent e){}
        @Override public void mousePressed(MouseEvent e){previousX=e.getX();previousY=e.getY();dragging=true;requestFocusInWindow();}
        @Override public void mouseReleased(MouseEvent e){dragging=false;}
        @Override public void mouseDragged(MouseEvent e){if(!dragging)return;
            renderer.yaw+=(e.getX()-previousX)*.005;renderer.pitch=Math.max(-1.1,Math.min(1.1,renderer.pitch-(e.getY()-previousY)*.005));
            previousX=e.getX();previousY=e.getY();}
        @Override public void mouseMoved(MouseEvent e){}
        @Override public void mouseClicked(MouseEvent e){}
        @Override public void mouseEntered(MouseEvent e){}
        @Override public void mouseExited(MouseEvent e){dragging=false;}
    }

    static void desktop(){
        JFrame frame=new JFrame("The Beckenburg Project — visual prototype");
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);frame.setSize(960,600);frame.setLocationRelativeTo(null);
        JPanel menu=new JPanel(new GridBagLayout());menu.setBackground(new Color(25,28,34));
        JPanel controls=new JPanel(new GridLayout(0,1,8,12));controls.setOpaque(false);
        JLabel title=new JLabel("THE BECKENBURG PROJECT",SwingConstants.CENTER);
        title.setForeground(new Color(223,205,163));title.setFont(new Font(Font.SERIF,Font.BOLD,29));
        JLabel status=new JLabel("PRE-ALPHA • LOCAL 3D RENDERING STUDY • NOT A GAME",SwingConstants.CENTER);
        status.setForeground(new Color(167,172,180));
        JButton start=new JButton("ENTER TEST HOUSE");JButton quit=new JButton("EXIT");
        controls.add(title);controls.add(status);controls.add(start);controls.add(quit);menu.add(controls);
        start.addActionListener(e->{View view=new View(()->{frame.setContentPane(menu);frame.revalidate();menu.requestFocusInWindow();});frame.setContentPane(view);frame.revalidate();view.requestFocusInWindow();});
        quit.addActionListener(e->frame.dispose());frame.setContentPane(menu);frame.setVisible(true);
    }
    public static void main(String[] args){SwingUtilities.invokeLater(BeckenburgPrototype::desktop);}
}
