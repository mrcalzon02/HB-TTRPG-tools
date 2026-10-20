package org.beckenburg;

import java.util.List;
import java.util.Objects;

/** One reusable, authored expedition van for every Beckenburg location.
 * Site data supplies only position and orientation; gameplay sockets, geometry
 * footprint, interaction rules and equipment identity belong to this module.
 * In this alpha it is locally authoritative; LAN command validation is future work.
 */
public final class VanStaging {
    public record Placement(double x, double z, double yaw) {
        public Placement {
            if (!Double.isFinite(x) || !Double.isFinite(z) || !Double.isFinite(yaw))
                throw new IllegalArgumentException("Nonfinite van placement");
        }
    }
    public record Position(double x, double z) { }
    public enum Station {
        BRIEFING("Contract / daily task boards", .20, .40),
        EQUIPMENT("Equipment rack", -.23, -.90),
        RELAY("Sanity / activity monitors", .23, -.90),
        EXTRACTION("Extraction console", 0, 1.10);
        public final String label;
        final double dx, dz;
        Station(String label, double dx, double dz) {
            this.label=label;this.dx=dx;this.dz=dz;
        }
    }
    /** Long high-roof panel van, measured in metres. Ford L4/H3 is the dimensional reference.
     * Body 2.059m wide, cargo 4.256 x 1.784 x 2.125m; deck 0.50m above ground.
     * The same dimensions drive render, support, collision, equipment and player spawns.
     */
    public static final double HALF_WIDTH=1.0295, FRONT=-2.128, REAR=2.128;
    public static final double INTERIOR_HALF_WIDTH=.892, INTERIOR_ROOF_HALF_WIDTH=.81;
    public static final double FLOOR_Y=.50, INTERIOR_HEIGHT=2.125;
    public static final double ROOF_Y=FLOOR_Y+INTERIOR_HEIGHT+.095, ROOF_SHOULDER_Y=FLOOR_Y+1.65;
    public static final double WALL_THICKNESS=.08, USE_RANGE=1.15;
    public static final double RAMP_LENGTH=1.5, RAMP_HALF_WIDTH=.66, CAB_LENGTH=2.268;
    /** Real wall-mounted button, separate from the clear operating position. */
    /** Host-owned cargo shutter: initially open so newly spawned hunters can leave. */
    private boolean cargoDoorClosed;
    public boolean cargoDoorClosed(){return cargoDoorClosed;}
    public void setCargoDoorClosed(boolean closed){cargoDoorClosed=closed;}
    /** Exact physical button location beside the van's cargo entrance. */
    public Position doorButton(){return world(-INTERIOR_HALF_WIDTH+.04,FRONT+.14);}
    public Position doorOperatingPoint(){return world(-.23,FRONT+.16);}
    public Position spawn(int seat){
        if(seat<0||seat>=6)throw new IllegalArgumentException("hunter seat");
        return world(seat%2==0?-.25:.25,-1.10+(seat/2)*.75);
    }
    /** Continuous, ground-supported fold-out ramp and raised cargo deck. */
    public Double supportHeight(double x,double z){
        Position p=local(x,z);
        if(Math.abs(p.x())<=INTERIOR_HALF_WIDTH&&p.z()>=FRONT&&p.z()<=REAR)return FLOOR_Y;
        if(Math.abs(p.x())<=RAMP_HALF_WIDTH&&p.z()>=FRONT-RAMP_LENGTH-.25&&p.z()<FRONT)
            return FLOOR_Y*Math.max(0,p.z()-(FRONT-RAMP_LENGTH))/RAMP_LENGTH;
        return null;
    }
    public boolean nearDoorButton(double x,double z){
        if(!Double.isFinite(x)||!Double.isFinite(z))return false;
        Position p=doorButton();
        return Math.hypot(x-p.x(),z-p.z())<1.10;
    }
    public boolean toggleCargoDoor(){
        cargoDoorClosed=!cargoDoorClosed;
        return cargoDoorClosed;
    }
    private final Placement placement;
    public VanStaging(Placement placement) { this.placement=Objects.requireNonNull(placement); }
    public Placement placement() { return placement; }
    public Position world(double dx,double dz) {
        double c=Math.cos(placement.yaw()),s=Math.sin(placement.yaw());
        return new Position(placement.x()+c*dx-s*dz,placement.z()+s*dx+c*dz);
    }
    public Position local(double x,double z) {
        double c=Math.cos(placement.yaw()),s=Math.sin(placement.yaw());
        double dx=x-placement.x(),dz=z-placement.z();
        return new Position(c*dx+s*dz,-s*dx+c*dz);
    }
    public Position location(Station station) {
        Objects.requireNonNull(station);
        return world(station.dx,station.dz);
    }
    public Position spawn() { return world(0,0); }
    /** Continuous circle-versus-AABB collision, so thin panels cannot be stepped through. */
    public boolean collides(double x,double z,double radius) {
        if(!Double.isFinite(x)||!Double.isFinite(z)||!Double.isFinite(radius)||radius<0)return true;
        Position p=local(x,z);
        double w=HALF_WIDTH,f=FRONT,r=REAR,t=WALL_THICKNESS;
        return overlaps(p.x(),p.z(),radius,-w,-INTERIOR_HALF_WIDTH,f,r) ||
            overlaps(p.x(),p.z(),radius,INTERIOR_HALF_WIDTH,w,f,r) ||
            overlaps(p.x(),p.z(),radius,-w,w,r-t,r) ||
            (cargoDoorClosed&&overlaps(p.x(),p.z(),radius,-w,w,f,f+t)) ||
            // Fully modeled driver's cab is not a walk-through prop either.
            overlaps(p.x(),p.z(),radius,-HALF_WIDTH,HALF_WIDTH,r,r+CAB_LENGTH) ||
            VanInteriorLayout.collides(p.x(),p.z(),radius);
    }
    private static boolean overlaps(double x,double z,double radius,
            double minX,double maxX,double minZ,double maxZ) {
        double nearestX=Math.max(minX,Math.min(x,maxX));
        double nearestZ=Math.max(minZ,Math.min(z,maxZ));
        return Math.hypot(x-nearestX,z-nearestZ)<=radius;
    }
    public boolean solid(double x,double z) {return collides(x,z,0);}
    public Station stationAt(double x,double z) {
        if(!Double.isFinite(x)||!Double.isFinite(z))return null;
        // Prevent remote activation and access from outside the cargo bay.
        Position p=local(x,z);
        if(Math.abs(p.x)>=INTERIOR_HALF_WIDTH || p.z<FRONT || p.z>=REAR-WALL_THICKNESS) return null;
        Station nearest=null;double distance=USE_RANGE;
        for(Station station:Station.values()) {
            Position target=location(station);
            double d=Math.hypot(x-target.x(),z-target.z());
            if(d<distance) { nearest=station;distance=d; }
        }
        return nearest;
    }
    public List<Position> cargoCorners() {return List.of(world(-HALF_WIDTH,FRONT),world(HALF_WIDTH,FRONT),
        world(HALF_WIDTH,REAR),world(-HALF_WIDTH,REAR));}
}
