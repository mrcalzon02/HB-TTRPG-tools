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
        BRIEFING("Contract / daily task boards", .70, 2.56),
        EQUIPMENT("Equipment rack", -1.12, -1.35),
        RELAY("Sanity / activity monitors", 1.05, .55),
        EXTRACTION("Extraction console", .95, 2.50);
        public final String label;
        final double dx, dz;
        Station(String label, double dx, double dz) {
            this.label=label;this.dx=dx;this.dz=dz;
        }
    }
    /** Internal van cargo envelope, in metres. 7.30m long, 4.10m wide,
     * with 3.05m usable headroom. Original Car08 was an undersized square
     * body (4.14m by 4.14m), not suitable for 28 real instruments.
     * Cargo doorway is at FRONT (negative local Z), bulkhead at REAR.
     */
    public static final double HALF_WIDTH=2.05, FRONT=-3.65, REAR=3.65;
    public static final double INTERIOR_HEIGHT=3.05, WALL_THICKNESS=.13, USE_RANGE=1.15;
    /** Host-owned cargo shutter: initially open so newly spawned hunters can leave. */
    private boolean cargoDoorClosed;
    public boolean cargoDoorClosed(){return cargoDoorClosed;}
    public void setCargoDoorClosed(boolean closed){cargoDoorClosed=closed;}
    /** Exact physical button location beside the van's cargo entrance. */
    public Position doorButton(){return world(-1.77,FRONT+.57);}
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
        return overlaps(p.x(),p.z(),radius,-w,-w+t,f,r) ||
            overlaps(p.x(),p.z(),radius,w-t,w,f,r) ||
            overlaps(p.x(),p.z(),radius,-w,w,r-t,r) ||
            (cargoDoorClosed&&overlaps(p.x(),p.z(),radius,-w,w,f,f+t)) ||
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
        if(Math.abs(p.x)>=HALF_WIDTH-WALL_THICKNESS || p.z<FRONT || p.z>=REAR-WALL_THICKNESS) return null;
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
