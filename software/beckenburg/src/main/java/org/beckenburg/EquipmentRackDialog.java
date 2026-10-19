package org.beckenburg;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.event.MouseEvent;
import java.util.List;
import java.util.Map;
import javax.swing.DefaultListCellRenderer;
import javax.swing.JComboBox;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.ListSelectionModel;
import javax.swing.SwingConstants;

/**
 * Compact single-surface equipment rack. Shop text is never re-authored:
 * capabilities, tier prices, sample rates, battery life, photo frames and FOV
 * all come from EquipmentStoreDescriptions and therefore game hardware data.
 */
public final class EquipmentRackDialog {
    private EquipmentRackDialog(){}
    public enum Action { UPGRADE, EQUIP, RECHARGE }
    public record Choice(Action action,String id,int slot,EquipmentTiers.Tier next){
        public Choice {
            if(action==null)throw new IllegalArgumentException("missing rack action");
        }
    }
    public static Choice choose(java.awt.Component parent,int credits,String[] equipped,
                                int activeSlot,Map<String,EquipmentTiers.Tier> tiers){
        if(equipped==null||equipped.length!=FieldEquipment.SLOTS||tiers==null
                ||activeSlot<0||activeSlot>=FieldEquipment.SLOTS)
            throw new IllegalArgumentException("invalid equipment rack state");
        List<String> ids=FieldEquipment.workingTools();
        JList<String> list=new JList<>(ids.toArray(String[]::new)){
            @Override public String getToolTipText(MouseEvent mouse){
                int index=locationToIndex(mouse.getPoint());
                if(index<0)return null;
                var area=getCellBounds(index,index);
                if(area==null||!area.contains(mouse.getPoint()))return null;
                String id=ids.get(index);
                EquipmentTiers.Tier tier=tiers.getOrDefault(id,EquipmentTiers.Tier.I);
                return EquipmentStoreDescriptions.describe(id,tier).tooltipHtml();
            }
        };
        list.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        list.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        list.setCellRenderer(new DefaultListCellRenderer(){
            @Override public java.awt.Component getListCellRendererComponent(
                    JList<?> view,Object value,int index,boolean selected,boolean focused){
                var row=(JLabel)super.getListCellRendererComponent(
                    view,value,index,selected,focused);
                String id=String.valueOf(value);
                EquipmentTiers.Tier tier=tiers.getOrDefault(id,EquipmentTiers.Tier.I);
                row.setText(EquipmentRegistry.get(id).name()+
                    "  T"+(tier.ordinal()+1));
                return row;
            }
        });
        String previous=equipped[activeSlot];
        list.setSelectedValue(ids.contains(previous)?previous:ids.get(0),true);
        JScrollPane tools=new JScrollPane(list);
        tools.setPreferredSize(new Dimension(225,220));

        JTextArea detail=new JTextArea();
        detail.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        detail.setEditable(false);detail.setLineWrap(true);detail.setWrapStyleWord(true);
        detail.setRows(11);detail.setColumns(44);
        JScrollPane explanation=new JScrollPane(detail);
        explanation.setPreferredSize(new Dimension(355,220));

        JComboBox<String> slotBox=new JComboBox<>();
        for(int i=0;i<FieldEquipment.SLOTS;i++)
            slotBox.addItem((i+1)+": "+EquipmentRegistry.get(equipped[i]).name());
        slotBox.setSelectedIndex(activeSlot);
        Runnable refresh=()->{
            String id=list.getSelectedValue();if(id==null)return;
            EquipmentTiers.Tier tier=tiers.getOrDefault(id,EquipmentTiers.Tier.I);
            StringBuilder information=new StringBuilder();
            information.append(EquipmentRegistry.get(id).name())
                .append("  /  OWNED T").append(tier.ordinal()+1).append("\n");
            information.append("ACTUAL CURRENT CAPABILITY\n");
            var owned=EquipmentStoreDescriptions.describe(id,tier);
            information.append(owned.effect()).append("\n");
            information.append(owned.capabilityLine()).append("\n");
            information.append(owned.specificationLine()).append("\n\n");
            if(tier==EquipmentTiers.Tier.III)
                information.append("FULLY UPGRADED");
            else{
                EquipmentTiers.Tier next=EquipmentTiers.Tier.values()[tier.ordinal()+1];
                var upgrade=EquipmentStoreDescriptions.describe(id,next);
                information.append("NEXT: T").append(next.ordinal()+1)
                    .append(" — £").append(upgrade.price()).append("\n")
                    .append(upgrade.effect()).append("\n")
                    .append(upgrade.specificationLine());
                if(upgrade.price()>credits)information.append("\nNOT ENOUGH CREDITS");
            }
            information.append("\n\nALL THREE TIERS\n");
            for(var candidate:EquipmentStoreDescriptions.tiers(id)){
                information.append("T").append(candidate.tier().ordinal()+1)
                    .append(": ").append(candidate.specificationLine()).append("\n");
            }
            detail.setText(information.toString().stripTrailing());
            detail.setCaretPosition(0);
        };
        list.addListSelectionListener(e->{if(!e.getValueIsAdjusting())refresh.run();});
        refresh.run();

        JPanel columns=new JPanel(new BorderLayout(8,0));
        columns.add(tools,BorderLayout.WEST);
        columns.add(explanation,BorderLayout.CENTER);
        JPanel view=new JPanel(new BorderLayout(0,6));
        view.add(new JLabel("CREDITS £"+credits+"     UPGRADE / EQUIP / RECHARGE",
            SwingConstants.LEFT),BorderLayout.NORTH);
        view.add(columns,BorderLayout.CENTER);
        view.add(slotBox,BorderLayout.SOUTH);
        String[] choices={"Upgrade","Equip","Recharge","Close"};
        int action=JOptionPane.showOptionDialog(parent,view,"FIELD EQUIPMENT",
            JOptionPane.DEFAULT_OPTION,JOptionPane.PLAIN_MESSAGE,null,choices,"Close");
        String id=list.getSelectedValue();
        if(action==0&&id!=null){
            EquipmentTiers.Tier owned=tiers.getOrDefault(id,EquipmentTiers.Tier.I);
            if(owned==EquipmentTiers.Tier.III)return null;
            EquipmentTiers.Tier next=EquipmentTiers.Tier.values()[owned.ordinal()+1];
            return new Choice(Action.UPGRADE,id,slotBox.getSelectedIndex(),next);
        }
        if(action==1&&id!=null)
            return new Choice(Action.EQUIP,id,slotBox.getSelectedIndex(),null);
        if(action==2)return new Choice(Action.RECHARGE,null,activeSlot,null);
        return null;
    }
}
