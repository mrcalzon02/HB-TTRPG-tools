#!/usr/bin/env python3
from pathlib import Path

path=Path('scripts/apply_live_signals_mirror.py')
text=path.read_text(encoding='utf-8')
old='''live = replace_once(live,\n"MAX_ACTIVE_BURST_SECONDS,ACTIVE_SCAN_POLICY,SAFETY_POLICY,RECEIVER_HEALTH_THRESHOLDS})\\n",\n"MAX_ACTIVE_BURST_SECONDS,MAX_AUDIT_EVENTS,MAX_CAPTURE_LEDGER,ACTIVE_SCAN_POLICY,SAFETY_POLICY,LIVE_CONTROL_POLICY,SIGNALS_MIRROR_EXPERIMENT_IDS,RECEIVER_HEALTH_THRESHOLDS})\\n",\n'constant exports')'''
new='''live = replace_once(live,\n"MAX_ACTIVE_BURST_SECONDS,HARDWARE_PROFILES,SAFETY_POLICY,ACTIVE_SCAN_POLICY,ACTIVE_SCAN_METHODS,CHANNEL_CATALOG,REFINEMENT_STAGES,FUTURE_GATED_RESEARCH,RECEIVER_HEALTH_THRESHOLDS})\\n",\n"MAX_ACTIVE_BURST_SECONDS,MAX_AUDIT_EVENTS,MAX_CAPTURE_LEDGER,HARDWARE_PROFILES,SAFETY_POLICY,ACTIVE_SCAN_POLICY,ACTIVE_SCAN_METHODS,CHANNEL_CATALOG,REFINEMENT_STAGES,FUTURE_GATED_RESEARCH,LIVE_CONTROL_POLICY,SIGNALS_MIRROR_EXPERIMENT_IDS,RECEIVER_HEALTH_THRESHOLDS})\\n",\n'constant exports')'''
count=text.count(old)
if count!=1:
    raise SystemExit(f'expected one legacy export-anchor block, found {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Repaired Live Signals migration constant-export anchor while preserving the current API exports.')