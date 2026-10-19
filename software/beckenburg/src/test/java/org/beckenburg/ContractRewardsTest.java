package org.beckenburg;

import java.nio.file.*;
import java.time.LocalDate;
import java.util.UUID;

/** Exact terminal outcomes and idempotent durable network payout receipts. */
public final class ContractRewardsTest {
    static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args)throws Exception{
        LocalDate day=LocalDate.of(2026,10,19);
        UUID id=UUID.randomUUID();
        ContractRewards partial=new ContractRewards(id,day);
        ok(partial.daily().size()==3,"three daily objectives selected");
        partial.mark(ContractRewards.Task.EMF_SAMPLE);
        partial.mark(ContractRewards.Task.WARD_SITE);
        var paid=partial.settle(LanCase.Outcome.RETREATED,true,
            HardEvidenceQuota.Level.MEDIUM,2);
        ok(!paid.victory()&&paid.credits()>110,
            "identified retreat pays but cannot be called ritual victory");
        ok(paid.equals(ContractRewards.Settlement.decode(paid.packet())),"receipt roundtrip");
        boolean duplicate=false;
        try{partial.settle(LanCase.Outcome.RETREATED,true,
            HardEvidenceQuota.Level.MEDIUM,2);}
        catch(IllegalStateException expected){duplicate=true;}
        ok(duplicate,"same contract cannot pay twice");
        var noIdentification=new ContractRewards(UUID.randomUUID(),day)
            .settle(LanCase.Outcome.RETREATED,false,HardEvidenceQuota.Level.DEATH_WISH,3);
        ok(noIdentification.credits()==0,"unidentified retreat cannot claim success");
        var lost=new ContractRewards(UUID.randomUUID(),day)
            .settle(LanCase.Outcome.LOST,true,HardEvidenceQuota.Level.DEATH_WISH,3);
        ok(lost.credits()==0&&!lost.victory(),"hunter team death loses reward even after identifying");
        var won=new ContractRewards(UUID.randomUUID(),day)
            .settle(LanCase.Outcome.BANISHED,true,HardEvidenceQuota.Level.DEATH_WISH,3);
        ok(won.victory()&&won.credits()>paid.credits(),
            "correct ritual victory has strongest base and higher risk multiplier");
        boolean badVictory=false;
        try{new ContractRewards(UUID.randomUUID(),day).settle(
            LanCase.Outcome.ABSOLVED,false,HardEvidenceQuota.Level.EASY,0);}
        catch(IllegalStateException expected){badVictory=true;}
        ok(badVictory,"cannot reward ritual victory with unverified ghost");
        Path dir=Files.createTempDirectory("beckenburg-network-payout-");
        try{
            Path path=dir.resolve("profile.properties");
            ProfileStore wallet=new ProfileStore(path);
            ok(wallet.addNetworkPayout(paid.id(),paid.credits(),paid.xp()),
                "first server settlement applied");
            ok(!wallet.addNetworkPayout(paid.id(),paid.credits(),paid.xp()),
                "same receipt cannot be recredited");
            ProfileStore reloaded=new ProfileStore(path);reloaded.load();
            ok(reloaded.currency()==paid.credits()&&reloaded.experience()==paid.xp(),
                "rewards persist to normal local profile");
            ok(!reloaded.addNetworkPayout(paid.id(),paid.credits(),paid.xp()),
                "dedupe survives process reload");
        }finally{
            Files.deleteIfExists(dir.resolve("profile.properties"));
            Files.deleteIfExists(dir);
        }
        System.out.println("PASS ritual-only victory, partial retreat, death loss, daily bonuses and durable payout receipts");
    }
}
