package org.beckenburg;

import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicInteger;
import javax.swing.*;

/** Contract list never dispatches fictional sites as playable geometry. */
public final class CampaignBoardPanelTest {
    private static void ok(boolean v,String reason){if(!v)throw new AssertionError(reason);}
    private static <T extends java.awt.Component> T named(java.awt.Container root,String name,Class<T> type){
        for(java.awt.Component c:root.getComponents()){
            if(type.isInstance(c)&&name.equals(c.getName()))return type.cast(c);
            if(c instanceof java.awt.Container child){
                T found=named(child,name,type);if(found!=null)return found;
            }
        }return null;
    }
    public static void main(String[] args)throws Exception{
        SwingUtilities.invokeAndWait(()->{
            var data=CampaignBoardPanel.catalog();
            ok(data.size()==22,"nine base families plus thirteen remote concepts");
            ok(data.stream().map(CampaignBoardPanel.Entry::name).distinct().count()==data.size(),"unique names");
            ok(data.stream().filter(CampaignBoardPanel.Entry::playable).count()>=1,"real map exists");
            ok(data.stream().filter(x->x.map()==null).noneMatch(CampaignBoardPanel.Entry::playable),"remote concepts locked");
            AtomicInteger launches=new AtomicInteger();
            CampaignBoardPanel board=new CampaignBoardPanel(new ProfileStore(Path.of("test-profile-not-used")),
                new CampaignBoardPanel.Actions(){
                    @Override public void deploy(SiteCatalog.Location map){
                        ok(map.playable(),"only authorized geometry");launches.incrementAndGet();}
                    @Override public void castle(){}
                    @Override public void tutorial(){}
                });
            JList<?> list=named(board,"campaign.contracts",JList.class);
            JButton deploy=named(board,"campaign.deploy",JButton.class);
            ok(list!=null&&deploy!=null,"direct UI controls present");
            list.setSelectedIndex(9);ok(!deploy.isEnabled(),"Blackpine planned, no deploy");
            deploy.doClick();ok(launches.get()==0,"disabled dispatch blocked");
            list.setSelectedIndex(0);ok(deploy.isEnabled(),"house can deploy");
            deploy.doClick();ok(launches.get()==1,"real playable map dispatch");
        });
        System.out.println("PASS campaign board locked concepts and working deployment callback");
    }
}
